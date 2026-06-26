'use strict';

const { verifyAccessToken }      = require('../utils/generateTokens');
const { query }                  = require('../config/database');
const { SOCKET_EVENTS, SOCKET_ROOMS } = require('../utils/constants');
const registerChatHandlers       = require('./chat.socket');
const registerNotificationHandlers = require('./notification.socket');

// ─── initSocketHandlers ───────────────────────────────────────────────────────

/**
 * initSocketHandlers — Registers all Socket.io connection and event handlers.
 *
 * Called once in server.js after initSocket(httpServer) returns the io instance.
 * Every new connection starts UNAUTHENTICATED. The client must emit the
 * 'authenticate' event with a valid access token before any other event is
 * processed. Unauthenticated sockets that send any other event are ignored
 * via the `if (!socket.userId) return` guard at the top of every handler.
 *
 * Authentication flow:
 *   1. Client connects → socket starts unauthenticated.
 *   2. Client emits 'authenticate' with { token: <accessToken> }.
 *   3. Server verifies JWT (signature + expiry) using verifyAccessToken().
 *   4. Server performs a live DB check to reject suspended or deactivated accounts.
 *   5. On success: socket.userId is set, socket joins 'user:<userId>' room,
 *      domain-specific handlers are registered, 'authenticated' is emitted.
 *   6. On failure: 'auth_error' is emitted and socket is disconnected.
 *
 * @param {import('socket.io').Server} io - Socket.io server instance from server.js
 * @returns {void}
 */
function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket.io] New connection: ${socket.id} (unauthenticated)`);

    // ── Authenticate ──────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.AUTHENTICATE, async (payload) => {
      try {
        if (!payload || !payload.token) {
          socket.emit(SOCKET_EVENTS.AUTH_ERROR, { message: 'Token required' });
          socket.disconnect(true);
          return;
        }

        // Verify JWT signature and expiry — throws on invalid/expired token
        let decoded;
        try {
          decoded = verifyAccessToken(payload.token);
        } catch {
          socket.emit(SOCKET_EVENTS.AUTH_ERROR, { message: 'Invalid or expired token' });
          socket.disconnect(true);
          return;
        }

        // Live DB check — matches the same check in auth.middleware.js so that
        // accounts suspended or deactivated after token issuance are rejected here too.
        const result = await query(
          `SELECT id FROM users
           WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
          [decoded.id]
        );

        if (!result.rows.length) {
          socket.emit(SOCKET_EVENTS.AUTH_ERROR, { message: 'Account not found or inactive' });
          socket.disconnect(true);
          return;
        }

        // Mark socket as authenticated for all subsequent handler guards
        socket.userId = decoded.id;

        // Join the user's personal notification room so emitToUser() in
        // notifications.service.js delivers events to all of this user's tabs/devices.
        const userRoom = `${SOCKET_ROOMS.USER_PREFIX}${socket.userId}`;
        socket.join(userRoom);

        socket.emit(SOCKET_EVENTS.AUTHENTICATED, { userId: socket.userId });
        console.log(`[Socket.io] Authenticated: socket=${socket.id} user=${socket.userId}`);

        // Register domain-specific handlers now that the socket is trusted.
        // They are registered here (inside the authenticate handler) so they
        // are never callable on an unauthenticated socket — if authenticate
        // never fires, these listeners never exist on the socket.
        registerChatHandlers(socket, io);
        registerNotificationHandlers(socket);
      } catch (err) {
        console.error(`[Socket.io] Authentication handler error: ${err.message}`);
        socket.emit(SOCKET_EVENTS.AUTH_ERROR, { message: 'Authentication failed' });
        socket.disconnect(true);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    // Socket.io automatically removes the socket from all rooms on disconnect.
    // No manual room cleanup is required.
    socket.on('disconnect', (reason) => {
      if (socket.userId) {
        console.log(`[Socket.io] Disconnected: socket=${socket.id} user=${socket.userId} reason=${reason}`);
      } else {
        console.log(`[Socket.io] Disconnected (unauthenticated): socket=${socket.id} reason=${reason}`);
      }
    });
  });
}

module.exports = initSocketHandlers;
