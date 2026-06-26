'use strict';

const { SOCKET_EVENTS }        = require('../utils/constants');
const notificationsService     = require('../modules/notifications/notifications.service');

// ─── registerNotificationHandlers ────────────────────────────────────────────

/**
 * registerNotificationHandlers — Registers notification-related Socket.io event
 * handlers on a socket that has already been authenticated by socket.handler.js.
 *
 * Currently handles a single client→server event: `mark_read`, which lets the
 * client mark a notification as read via socket instead of the REST endpoint.
 * The server→client direction (pushing new notifications to connected users) is
 * handled by notifications.service.createNotification() calling emitToUser(),
 * so no server→client event registration is needed here.
 *
 * Error handling rule: all errors are swallowed (logged at warn level only).
 * A failed mark-read is invisible to the user — the REST endpoint remains
 * available as a fallback if the socket path fails.
 *
 * @param {import('socket.io').Socket} socket - Authenticated socket with socket.userId set
 * @returns {void}
 */
function registerNotificationHandlers(socket) {

  // ── mark_read ─────────────────────────────────────────────────────────────
  // Client emits this when a notification is viewed (e.g. notification list opens,
  // or a specific notification is clicked). Delegates to the same service function
  // used by the REST endpoint so ownership checks and idempotency are guaranteed
  // regardless of how mark-read was triggered.
  socket.on(SOCKET_EVENTS.MARK_READ, async (payload) => {
    if (!socket.userId) return;

    try {
      const notificationId = payload && payload.notificationId;
      if (!notificationId) return;

      // markOneRead checks ownership (returns 404 ApiError for wrong user) and is
      // idempotent (returns existing row if already read). Both outcomes are fine here
      // — we catch and swallow any error so the socket session is never affected.
      await notificationsService.markOneRead(socket.userId, notificationId);
    } catch (err) {
      // Non-critical side effect — warn, do not error, do not emit back to client
      console.warn(
        `[Socket.io] mark_read failed: notification=${payload && payload.notificationId} ` +
        `user=${socket.userId} error=${err.message}`
      );
    }
  });
}

module.exports = registerNotificationHandlers;
