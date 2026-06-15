'use strict';

const { Server } = require('socket.io');
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../utils/constants');

// ─── Singleton ────────────────────────────────────────────────────────────────
// The io instance is stored here and accessed via getIO() throughout the app.
// initSocket() is called exactly once in server.js.
let _io = null;

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * initSocket — Attaches a Socket.io server to the existing HTTP server.
 *
 * Called once in server.js immediately after http.createServer(app).
 * The Socket.io server shares the same port as the Express REST API.
 *
 * CORS is configured to match the Express CORS policy — same allowed origins.
 * Credentials: true is required because the Socket.io client sends cookies
 * (the refresh token httpOnly cookie) on the initial handshake.
 *
 * Transport order: WebSocket is tried first (lower latency, persistent connection).
 * If WebSocket fails (corporate proxy, firewall), it falls back to HTTP long-polling.
 *
 * @param {import('http').Server} httpServer - Node.js HTTP server from server.js
 * @returns {import('socket.io').Server} Configured Socket.io server instance
 */
function initSocket(httpServer) {
  if (_io) {
    console.warn('[Socket.io] Already initialised — returning existing instance');
    return _io;
  }

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000'
  ].filter(Boolean);

  _io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. Postman WebSocket clients)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        if (process.env.NODE_ENV === 'development') {
          // Allow all origins in development for easier debugging
          return callback(null, true);
        }

        return callback(new Error(`Socket.io CORS: origin "${origin}" not allowed`));
      },
      methods: ['GET', 'POST'],
      credentials: true // Required for cookie-based auth on handshake
    },

    // Transport configuration
    transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
    allowUpgrades: true,                  // Allow upgrade from polling to WebSocket

    // Connection health monitoring
    pingTimeout: 60_000,   // Declare client dead if no pong received within 60s
    pingInterval: 25_000,  // Send ping every 25s

    // Security: limit message size to prevent large payload abuse
    maxHttpBufferSize: 1e6, // 1MB max per message

    // Allow cross-site cookie access for the authentication handshake
    allowEIO3: true // Backwards compatibility with Socket.io v3 clients
  });

  console.log('[Socket.io] Server initialised and attached to HTTP server');
  console.log(`[Socket.io] Allowed origins: ${allowedOrigins.join(', ')}`);

  return _io;
}

// ─── Singleton Accessor ───────────────────────────────────────────────────────

/**
 * getIO — Returns the initialised Socket.io server instance.
 *
 * Call this anywhere in the application after server.js has called initSocket().
 * Primary use: notifications.service.js emits events when booking/review actions occur.
 *
 * @returns {import('socket.io').Server}
 * @throws {Error} If called before initSocket() has been called
 */
function getIO() {
  if (!_io) {
    throw new Error(
      '[Socket.io] getIO() called before initSocket(). ' +
      'Ensure initSocket(httpServer) is called in server.js before any service imports getIO().'
    );
  }
  return _io;
}

// ─── Room Emission Helpers ────────────────────────────────────────────────────
// These helpers centralise the room-naming convention.
// Room names are defined in constants.js (SOCKET_ROOMS).
// Using helpers means: if we ever change the naming convention,
// we change it in one place (constants.js + these helpers), not in every service.

/**
 * emitToUser — Emits a real-time event to all sockets belonging to a specific user.
 *
 * User room: "user:<userId>"
 * A user joins this room on successful socket authentication (socket.handler.js, Block J).
 * Multiple tabs/devices owned by the same user all receive the event.
 *
 * If Socket.io is not yet initialised (early startup), emits silently do nothing.
 *
 * @param {string} userId - Target user's UUID
 * @param {string} event - Socket event name (use SOCKET_EVENTS constants)
 * @param {Object} data - Event payload
 *
 * Usage in notifications.service.js:
 *   emitToUser(booking.requesterId, SOCKET_EVENTS.NOTIFICATION, { ... });
 */
function emitToUser(userId, event, data) {
  if (!_io) return; // Socket.io not yet initialised — no-op
  if (!userId || !event) return;

  const room = `${SOCKET_ROOMS.USER_PREFIX}${userId}`;
  _io.to(room).emit(event, data);
}

/**
 * emitToConversation — Emits a real-time event to all sockets in a conversation room.
 *
 * Conversation room: "conv:<conversationId>"
 * Both participants join this room when they open the chat page (socket.handler.js, Block J).
 *
 * @param {string} conversationId - Target conversation's UUID
 * @param {string} event - Socket event name (use SOCKET_EVENTS constants)
 * @param {Object} data - Event payload
 *
 * Usage in chat.socket.js (Block J):
 *   emitToConversation(conversationId, SOCKET_EVENTS.NEW_MESSAGE, message);
 */
function emitToConversation(conversationId, event, data) {
  if (!_io) return;
  if (!conversationId || !event) return;

  const room = `${SOCKET_ROOMS.CONVERSATION_PREFIX}${conversationId}`;
  _io.to(room).emit(event, data);
}

/**
 * getConnectedUsersCount — Returns the number of currently connected sockets.
 * Used in the admin dashboard for real-time platform stats.
 *
 * @returns {Promise<number>}
 */
async function getConnectedUsersCount() {
  if (!_io) return 0;

  try {
    const sockets = await _io.fetchSockets();
    return sockets.length;
  } catch {
    return 0;
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToConversation,
  getConnectedUsersCount
};