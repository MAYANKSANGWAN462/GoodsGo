'use strict';

const { query }                          = require('../../config/database');
const { emitToConversation }             = require('../../config/socket');
const {
  CONVERSATION_STATUS,
  MESSAGE_TYPES,
  SOCKET_EVENTS
}                                        = require('../../utils/constants');
const ApiError                           = require('../../utils/ApiError');
const paginate                           = require('../../utils/paginate');
const { buildMeta }                      = require('../../utils/paginate');
const { uploadChatImage, deleteImage }   = require('../../utils/uploadImage');

// ─── Formatters ───────────────────────────────────────────────────────────────
// Translate snake_case DB columns to camelCase API shape.
// Applied consistently to every row before it leaves the service layer.

/**
 * formatConversation — Shapes a raw conversations JOIN row for API responses.
 *
 * @param {Object} row - Raw DB row from a conversations query
 * @returns {Object} camelCase conversation object
 */
function formatConversation(row) {
  return {
    id:                 row.id,
    bookingId:          row.booking_id,
    bookingStatus:      row.booking_status,
    otherParticipant: {
      id:              row.other_participant_id,
      fullName:        row.other_participant_name,
      profileImageUrl: row.other_participant_image || null
    },
    status:             row.status,
    lastMessageAt:      row.last_message_at || null,
    lastMessagePreview: row.last_message_preview || null,
    createdAt:          row.created_at
  };
}

/**
 * formatMessage — Shapes a raw messages JOIN row for API responses and socket payloads.
 *
 * @param {Object} row - Raw DB row from a messages query
 * @returns {Object} camelCase message object
 */
function formatMessage(row) {
  return {
    id:             row.id,
    conversationId: row.conversation_id,
    senderId:       row.sender_id,
    // Nested sender object matches the shape MessageBubble expects.
    sender: {
      id:              row.sender_id,
      fullName:        row.sender_name  || null,
      profileImageUrl: row.sender_image || null
    },
    content:        row.content,
    messageType:    row.message_type,
    imageUrl:       row.image_url    || null,
    isRead:         row.is_read,
    readAt:         row.read_at      || null,
    createdAt:      row.created_at
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * verifyParticipation — Confirms userId is a participant of conversationId.
 *
 * Returns the raw conversation row (id + status) for the caller to use.
 * Throws 404 for both "not found" and "not a participant" — no existence disclosure.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<{ id: string, status: string }>}
 * @throws {ApiError} 404 if conversation not found or user is not a participant
 */
async function verifyParticipation(conversationId, userId) {
  const result = await query(
    `SELECT id, status
     FROM conversations
     WHERE id = $1
       AND (participant_1_id = $2 OR participant_2_id = $2)`,
    [conversationId, userId]
  );

  if (!result.rows.length) {
    throw ApiError.notFound('Conversation not found.');
  }

  return result.rows[0];
}

// ─── getMyConversations ───────────────────────────────────────────────────────

/**
 * getMyConversations — Returns paginated conversations for the authenticated user.
 *
 * Joins bookings (for booking_status in the chat header) and users (for the
 * other participant's profile). Uses a CASE WHEN on participant columns to
 * derive the "other" participant without two separate user joins.
 *
 * @param {string} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{ conversations: Object[], meta: Object }>}
 */
async function getMyConversations(userId, page, limit) {
  const { safePage, safeLimit, offset } = paginate(page, limit, 20);

  const [listResult, countResult] = await Promise.all([
    query(
      `SELECT
         c.id,
         c.booking_id,
         c.status,
         c.last_message_at,
         c.last_message_preview,
         c.created_at,
         b.status                                                       AS booking_status,
         CASE WHEN c.participant_1_id = $1
              THEN c.participant_2_id
              ELSE c.participant_1_id
         END                                                            AS other_participant_id,
         u.full_name                                                    AS other_participant_name,
         u.profile_image_url                                            AS other_participant_image
       FROM conversations c
       JOIN bookings b ON b.id = c.booking_id
       JOIN users u    ON u.id = CASE WHEN c.participant_1_id = $1
                                      THEN c.participant_2_id
                                      ELSE c.participant_1_id
                                 END
       WHERE (c.participant_1_id = $1 OR c.participant_2_id = $1)
       ORDER BY c.last_message_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [userId, safeLimit, offset]
    ),
    query(
      `SELECT COUNT(*)
       FROM conversations
       WHERE participant_1_id = $1 OR participant_2_id = $1`,
      [userId]
    )
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  const meta  = buildMeta(total, safePage, safeLimit);

  return {
    conversations: listResult.rows.map(formatConversation),
    meta
  };
}

// ─── getConversationById ──────────────────────────────────────────────────────

/**
 * getConversationById — Returns a single conversation with full participant context.
 *
 * Returns 404 for both "does not exist" and "user is not a participant"
 * so that a non-participant cannot confirm whether a conversation exists.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<Object>} Formatted conversation
 * @throws {ApiError} 404 if not found or user is not a participant
 */
async function getConversationById(conversationId, userId) {
  const result = await query(
    `SELECT
       c.id,
       c.booking_id,
       c.status,
       c.last_message_at,
       c.last_message_preview,
       c.created_at,
       b.status                                                        AS booking_status,
       CASE WHEN c.participant_1_id = $2
            THEN c.participant_2_id
            ELSE c.participant_1_id
       END                                                             AS other_participant_id,
       other_u.full_name                                               AS other_participant_name,
       other_u.profile_image_url                                       AS other_participant_image
     FROM conversations c
     JOIN bookings b    ON b.id = c.booking_id
     JOIN users other_u ON other_u.id = CASE WHEN c.participant_1_id = $2
                                              THEN c.participant_2_id
                                              ELSE c.participant_1_id
                                         END
     WHERE c.id = $1
       AND (c.participant_1_id = $2 OR c.participant_2_id = $2)`,
    [conversationId, userId]
  );

  if (!result.rows.length) {
    throw ApiError.notFound('Conversation not found.');
  }

  return formatConversation(result.rows[0]);
}

// ─── getMessages ──────────────────────────────────────────────────────────────

/**
 * getMessages — Returns paginated message history for a conversation.
 *
 * Verifies participation before querying (throws 404 on failure — same as
 * getConversationById, no existence disclosure).
 * Ordered newest-first so pagination scrolls backward through history.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{ messages: Object[], meta: Object }>}
 * @throws {ApiError} 404 if conversation not found or user is not a participant
 */
async function getMessages(conversationId, userId, page, limit) {
  await verifyParticipation(conversationId, userId);

  const { safePage, safeLimit, offset } = paginate(page, limit, 50);

  const [listResult, countResult] = await Promise.all([
    query(
      `SELECT
         m.id,
         m.conversation_id,
         m.sender_id,
         m.content,
         m.message_type,
         m.image_url,
         m.is_read,
         m.read_at,
         m.created_at,
         u.full_name          AS sender_name,
         u.profile_image_url  AS sender_image
       FROM messages m
       LEFT JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, safeLimit, offset]
    ),
    query(
      'SELECT COUNT(*) FROM messages WHERE conversation_id = $1',
      [conversationId]
    )
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  const meta  = buildMeta(total, safePage, safeLimit);

  return {
    messages: listResult.rows.map(formatMessage),
    meta
  };
}

// ─── sendMessage ──────────────────────────────────────────────────────────────

/**
 * sendMessage — Inserts a text message and broadcasts it via Socket.io.
 *
 * Enforces two pre-conditions before writing:
 *   1. userId must be a participant in the conversation.
 *   2. The conversation must be 'active' (locked/archived conversations
 *      are read-only — their booking was cancelled or completed).
 *
 * The socket emit happens AFTER the DB writes so that if a client queries
 * the conversation on receiving NEW_MESSAGE, they see the updated preview.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @param {string} content - Plain text, max 2000 chars (enforced by Joi upstream)
 * @returns {Promise<Object>} Formatted message
 * @throws {ApiError} 404 if not a participant, 409 if conversation is not active
 */
async function sendMessage(conversationId, userId, content) {
  const conversation = await verifyParticipation(conversationId, userId);

  if (conversation.status !== CONVERSATION_STATUS.ACTIVE) {
    const reason = conversation.status === CONVERSATION_STATUS.LOCKED
      ? 'The booking was cancelled or rejected.'
      : 'The booking has been completed and the conversation is archived.';
    throw ApiError.conflict(`This conversation is no longer active. ${reason}`);
  }

  const insertResult = await query(
    `INSERT INTO messages (conversation_id, sender_id, content, message_type)
     VALUES ($1, $2, $3, $4)
     RETURNING id, conversation_id, sender_id, content, message_type,
               image_url, is_read, read_at, created_at`,
    [conversationId, userId, content, MESSAGE_TYPES.TEXT]
  );

  const msgRow = insertResult.rows[0];

  const preview = content.length > 255 ? `${content.slice(0, 252)}...` : content;

  // Update conversation preview — runs concurrently with the sender profile fetch
  const [, senderResult] = await Promise.all([
    query(
      `UPDATE conversations
       SET last_message_at = $1, last_message_preview = $2
       WHERE id = $3`,
      [msgRow.created_at, preview, conversationId]
    ),
    query(
      'SELECT full_name, profile_image_url FROM users WHERE id = $1',
      [userId]
    )
  ]);

  const sender    = senderResult.rows[0] || {};
  const formatted = formatMessage({
    ...msgRow,
    sender_name:  sender.full_name         || null,
    sender_image: sender.profile_image_url || null
  });

  emitToConversation(conversationId, SOCKET_EVENTS.NEW_MESSAGE, formatted);

  return formatted;
}

// ─── sendImageMessage ─────────────────────────────────────────────────────────

/**
 * sendImageMessage — Uploads an image to Cloudinary and inserts an image message.
 *
 * Enforces the same participation + active-status pre-conditions as sendMessage.
 * If the Cloudinary upload succeeds but the message INSERT fails, the orphaned
 * Cloudinary asset is cleaned up (best-effort, logged but not re-thrown) so the
 * Cloudinary storage quota is not silently wasted.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @param {Buffer} fileBuffer  - Image buffer from Multer memoryStorage
 * @param {string} mimeType    - Declared MIME type (magic-byte re-verified inside uploadChatImage)
 * @returns {Promise<Object>} Formatted message
 * @throws {ApiError} 404 if not a participant; 409 if conversation is not active;
 *                    400 if the file fails magic-byte verification
 */
async function sendImageMessage(conversationId, userId, fileBuffer, mimeType) {
  const conversation = await verifyParticipation(conversationId, userId);

  if (conversation.status !== CONVERSATION_STATUS.ACTIVE) {
    throw ApiError.conflict(
      'This conversation is no longer active and cannot accept new messages.'
    );
  }

  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadChatImage(fileBuffer, mimeType);
  } catch (err) {
    throw ApiError.badRequest(
      err.message || 'Image upload failed. Please try again with a valid image file.'
    );
  }

  let msgRow;
  try {
    const insertResult = await query(
      `INSERT INTO messages
         (conversation_id, sender_id, content, message_type, image_url, image_public_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, conversation_id, sender_id, content, message_type,
                 image_url, is_read, read_at, created_at`,
      [
        conversationId,
        userId,
        '',
        MESSAGE_TYPES.IMAGE,
        cloudinaryResult.url,
        cloudinaryResult.publicId
      ]
    );
    msgRow = insertResult.rows[0];
  } catch (err) {
    // INSERT failed after a successful upload — clean up the orphaned Cloudinary asset
    console.warn('[Chat] Message INSERT failed after Cloudinary upload; cleaning up asset:', cloudinaryResult.publicId);
    await deleteImage(cloudinaryResult.publicId);
    throw err;
  }

  const [, senderResult] = await Promise.all([
    query(
      `UPDATE conversations
       SET last_message_at = $1, last_message_preview = $2
       WHERE id = $3`,
      [msgRow.created_at, '[Image]', conversationId]
    ),
    query(
      'SELECT full_name, profile_image_url FROM users WHERE id = $1',
      [userId]
    )
  ]);

  const sender    = senderResult.rows[0] || {};
  const formatted = formatMessage({
    ...msgRow,
    sender_name:  sender.full_name         || null,
    sender_image: sender.profile_image_url || null
  });

  emitToConversation(conversationId, SOCKET_EVENTS.NEW_MESSAGE, formatted);

  return formatted;
}

module.exports = {
  getMyConversations,
  getConversationById,
  getMessages,
  sendMessage,
  sendImageMessage
};
