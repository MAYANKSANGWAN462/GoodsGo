'use strict';

const { query } = require('../config/database');
const {
  SOCKET_EVENTS,
  SOCKET_ROOMS,
  CONVERSATION_STATUS,
  MESSAGE_TYPES
} = require('../utils/constants');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * formatMessage — Translates a raw messages DB row into the camelCase API shape.
 *
 * Matches the shape that the Block L REST endpoint will also return, so the
 * client can use one normaliser for both REST-fetched history and socket-pushed
 * live messages.
 *
 * @param {Object} row - Raw row from the messages table
 * @returns {Object} Formatted message
 */
function formatMessage(row) {
  return {
    id:             row.id,
    conversationId: row.conversation_id,
    senderId:       row.sender_id,
    content:        row.content,
    messageType:    row.message_type,
    imageUrl:       row.image_url || null,
    isRead:         row.is_read,
    readAt:         row.read_at || null,
    createdAt:      row.created_at
  };
}

/**
 * verifyParticipant — Checks that socket.userId is a participant in the
 * given conversation. Returns the conversation row on success, null on failure.
 *
 * Ownership is always re-fetched from the DB rather than trusted from client
 * payload, per the architecture rule in CLAUDE.md §3 point 4.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<Object|null>} Conversation row or null
 */
async function verifyParticipant(conversationId, userId) {
  const result = await query(
    `SELECT id, status FROM conversations
     WHERE id = $1
       AND (participant_1_id = $2 OR participant_2_id = $2)`,
    [conversationId, userId]
  );
  return result.rows.length ? result.rows[0] : null;
}

// ─── registerChatHandlers ─────────────────────────────────────────────────────

/**
 * registerChatHandlers — Registers all chat-related Socket.io event handlers
 * on a socket that has already been authenticated by socket.handler.js.
 *
 * Every handler begins with `if (!socket.userId) return` as a belt-and-suspenders
 * guard. In practice socket.userId is always set by the time these handlers are
 * registered (they are registered inside the authenticate callback), but the guard
 * is required per the security rule documented in MODULE_CONTEXT.md.
 *
 * Error handling rule: NEVER throw from inside a socket event handler.
 * All bodies are wrapped in try/catch. Errors emit back to the requesting
 * socket only when the client can take a meaningful action on them.
 * Non-critical side effects (typing indicators) swallow errors silently.
 *
 * @param {import('socket.io').Socket} socket - Authenticated socket with socket.userId set
 * @param {import('socket.io').Server} io     - Socket.io server instance for room broadcasts
 * @returns {void}
 */
function registerChatHandlers(socket, io) {

  // ── join_conversation ──────────────────────────────────────────────────────
  // Client calls this when it opens a conversation view.
  // The socket must be in the 'conv:<id>' room to receive new_message events.
  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (payload) => {
    if (!socket.userId) return;

    try {
      const conversationId = payload && payload.conversationId;
      if (!conversationId) {
        socket.emit('error', { message: 'conversationId required' });
        return;
      }

      const conversation = await verifyParticipant(conversationId, socket.userId);
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' });
        return;
      }

      const room = `${SOCKET_ROOMS.CONVERSATION_PREFIX}${conversationId}`;
      socket.join(room);
      socket.emit('joined', { conversationId });
    } catch (err) {
      console.error(`[Socket.io] join_conversation error: ${err.message}`);
    }
  });

  // ── leave_conversation ────────────────────────────────────────────────────
  // Client calls this when it navigates away from the conversation view.
  // Non-critical — swallow errors entirely.
  socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (payload) => {
    if (!socket.userId) return;

    try {
      const conversationId = payload && payload.conversationId;
      if (!conversationId) return;

      const room = `${SOCKET_ROOMS.CONVERSATION_PREFIX}${conversationId}`;
      socket.leave(room);
    } catch (err) {
      console.error(`[Socket.io] leave_conversation error: ${err.message}`);
    }
  });

  // ── send_message ──────────────────────────────────────────────────────────
  // Inserts a new text message, updates the conversation preview,
  // then broadcasts the formatted message to the conversation room.
  // Image messages via socket are not supported (images go through the REST upload
  // endpoint in Block L which uses Cloudinary) — messageType is forced to 'text'.
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (payload) => {
    if (!socket.userId) return;

    try {
      const conversationId = payload && payload.conversationId;
      const content        = payload && payload.content;

      if (!conversationId || !content) {
        socket.emit('error', { message: 'conversationId and content are required' });
        return;
      }

      const trimmedContent = String(content).trim();
      if (!trimmedContent) {
        socket.emit('error', { message: 'Message content cannot be empty' });
        return;
      }

      // Verify participation and check conversation status in one query
      const conversation = await verifyParticipant(conversationId, socket.userId);
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' });
        return;
      }

      if (conversation.status !== CONVERSATION_STATUS.ACTIVE) {
        socket.emit('error', {
          message: 'This conversation is locked and cannot receive new messages'
        });
        return;
      }

      // Insert message — image type is not allowed via socket (REST only in Block L)
      const msgResult = await query(
        `INSERT INTO messages (conversation_id, sender_id, content, message_type)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [conversationId, socket.userId, trimmedContent, MESSAGE_TYPES.TEXT]
      );

      const message = msgResult.rows[0];

      // Denormalise last_message fields on the conversation for fast "inbox" queries
      await query(
        `UPDATE conversations
         SET last_message_at = $1, last_message_preview = $2
         WHERE id = $3`,
        [message.created_at, trimmedContent.substring(0, 255), conversationId]
      );

      // Broadcast to all sockets in the room (both participants, including sender)
      const room = `${SOCKET_ROOMS.CONVERSATION_PREFIX}${conversationId}`;
      io.to(room).emit(SOCKET_EVENTS.NEW_MESSAGE, formatMessage(message));
    } catch (err) {
      console.error(`[Socket.io] send_message error: ${err.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ── typing_start ──────────────────────────────────────────────────────────
  // Relays a "user is typing" indicator to the OTHER participant(s) only.
  // socket.to(room) excludes the sender — they don't need to see their own indicator.
  // Non-critical: errors are swallowed (a failed typing relay is invisible to users).
  socket.on(SOCKET_EVENTS.TYPING_START, (payload) => {
    if (!socket.userId) return;

    try {
      const conversationId = payload && payload.conversationId;
      if (!conversationId) return;

      const room = `${SOCKET_ROOMS.CONVERSATION_PREFIX}${conversationId}`;
      socket.to(room).emit(SOCKET_EVENTS.USER_TYPING, {
        conversationId,
        userId: socket.userId
      });
    } catch (err) {
      console.error(`[Socket.io] typing_start error: ${err.message}`);
    }
  });

  // ── typing_stop ───────────────────────────────────────────────────────────
  // Relays "user stopped typing" to the OTHER participant(s) only.
  socket.on(SOCKET_EVENTS.TYPING_STOP, (payload) => {
    if (!socket.userId) return;

    try {
      const conversationId = payload && payload.conversationId;
      if (!conversationId) return;

      const room = `${SOCKET_ROOMS.CONVERSATION_PREFIX}${conversationId}`;
      socket.to(room).emit(SOCKET_EVENTS.USER_STOPPED_TYPING, {
        conversationId,
        userId: socket.userId
      });
    } catch (err) {
      console.error(`[Socket.io] typing_stop error: ${err.message}`);
    }
  });

  // ── messages_read ─────────────────────────────────────────────────────────
  // Marks all unread messages in the conversation that were sent by the OTHER
  // participant as read. Broadcasts the read-receipt to the room so the sender's
  // UI can update their "delivered/read" indicators.
  socket.on(SOCKET_EVENTS.MESSAGES_READ, async (payload) => {
    if (!socket.userId) return;

    try {
      const conversationId = payload && payload.conversationId;
      if (!conversationId) return;

      // Verify participation before any DB write
      const conversation = await verifyParticipant(conversationId, socket.userId);
      if (!conversation) return;

      // Mark all unread messages from the OTHER sender as read
      await query(
        `UPDATE messages
         SET is_read = TRUE, read_at = NOW()
         WHERE conversation_id = $1
           AND sender_id != $2
           AND is_read = FALSE`,
        [conversationId, socket.userId]
      );

      // Notify the room — the original sender sees their messages are now read
      const room = `${SOCKET_ROOMS.CONVERSATION_PREFIX}${conversationId}`;
      io.to(room).emit(SOCKET_EVENTS.MESSAGES_READ, {
        conversationId,
        readBy: socket.userId
      });
    } catch (err) {
      console.error(`[Socket.io] messages_read error: ${err.message}`);
    }
  });
}

module.exports = registerChatHandlers;
