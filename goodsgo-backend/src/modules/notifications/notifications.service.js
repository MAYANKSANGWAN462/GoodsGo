'use strict';

const { query }                    = require('../../config/database');
const { emitToUser }               = require('../../config/socket');
const { NOTIFICATION_TYPES, SOCKET_EVENTS, PAGINATION } = require('../../utils/constants');
const ApiError                     = require('../../utils/ApiError');
const paginate                     = require('../../utils/paginate');
const { buildMeta }                = require('../../utils/paginate');
const {
  sendBookingRequestEmail,
  sendBookingAcceptedEmail,
  sendBookingCancelledEmail
}                                  = require('../../utils/sendEmail');

// ─── Types that trigger an email in addition to the in-app notification ───────
const EMAIL_TRIGGER_TYPES = new Set([
  NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED,
  NOTIFICATION_TYPES.BOOKING_ACCEPTED,
  NOTIFICATION_TYPES.BOOKING_CANCELLED
]);

// ─── formatNotification ───────────────────────────────────────────────────────

/**
 * formatNotification — Translates a raw DB row into the camelCase API shape.
 *
 * @param {Object} row - Raw row from the notifications table
 * @returns {Object} Formatted notification for API responses and socket payloads
 */
function formatNotification(row) {
  return {
    id:        row.id,
    type:      row.type,
    title:     row.title,
    body:      row.body,
    data:      row.data || null,
    isRead:    row.is_read,
    readAt:    row.read_at || null,
    createdAt: row.created_at
  };
}

// ─── dispatchEmail ────────────────────────────────────────────────────────────

/**
 * dispatchEmail — Sends a transactional email for booking-related notifications.
 *
 * Best-effort: errors are logged but never re-thrown so that a broken SMTP
 * connection cannot abort the caller's primary DB transaction.
 * Queries the user's email and name directly so the caller need not pass them.
 *
 * @param {Object} notification - The inserted notification row
 * @param {string} userId       - Recipient user ID
 * @param {Object|null} data    - The JSONB data payload from createNotification
 * @returns {Promise<void>}
 */
async function dispatchEmail(notification, userId, data) {
  if (!EMAIL_TRIGGER_TYPES.has(notification.type)) return;

  try {
    const userResult = await query(
      'SELECT email, full_name FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (!userResult.rows.length) return;

    const { email, full_name } = userResult.rows[0];
    const recipient = { email, fullName: full_name };
    const details   = {
      title:     notification.title,
      body:      notification.body,
      bookingId: data && data.bookingId ? data.bookingId : ''
    };

    if (notification.type === NOTIFICATION_TYPES.BOOKING_REQUEST_RECEIVED) {
      await sendBookingRequestEmail(recipient, details);
    } else if (notification.type === NOTIFICATION_TYPES.BOOKING_ACCEPTED) {
      await sendBookingAcceptedEmail(recipient, details);
    } else if (notification.type === NOTIFICATION_TYPES.BOOKING_CANCELLED) {
      await sendBookingCancelledEmail(recipient, details);
    }
  } catch (emailErr) {
    console.error('[Notifications] Email dispatch failed:', emailErr.message);
    // Intentionally swallowed — see asymmetric error handling in CLAUDE.md §17
  }
}

// ─── createNotification ───────────────────────────────────────────────────────

/**
 * createNotification — Inserts a notification record, emits it over Socket.io,
 * and dispatches an email for booking-related types.
 *
 * IMPORTANT: This function NEVER throws. All errors are caught and logged so
 * that a notification failure cannot abort the primary business operation
 * (e.g. acceptBooking()) that invoked it. Call sites must not rely on the
 * return value — assume it may be undefined on any error path.
 *
 * @param {Object} payload
 * @param {string} payload.userId - Recipient user ID (UUID)
 * @param {string} payload.type   - One of NOTIFICATION_TYPES values
 * @param {string} payload.title  - Short display text (shown in notification list)
 * @param {string} payload.body   - Longer descriptive text
 * @param {Object} [payload.data] - Deep-link payload (e.g. { bookingId, postId })
 * @returns {Promise<Object|undefined>} Formatted notification, or undefined on error
 */
async function createNotification({ userId, type, title, body, data = null }) {
  try {
    const insertResult = await query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, body, data ? JSON.stringify(data) : null]
    );

    const row = insertResult.rows[0];

    // Emit real-time event (emitToUser no-ops if socket is not initialised)
    try {
      emitToUser(userId, SOCKET_EVENTS.NOTIFICATION, formatNotification(row));
    } catch (socketErr) {
      console.warn('[Notifications] Socket emit failed:', socketErr.message);
    }

    // Fire-and-forget email — detached so it cannot block or throw to caller
    dispatchEmail(row, userId, data).catch((err) => {
      console.error('[Notifications] Unexpected email dispatch error:', err.message);
    });

    return formatNotification(row);
  } catch (err) {
    console.error('[Notifications] createNotification failed:', err.message);
    // Return undefined — callers are not permitted to depend on the return value
  }
}

// ─── listNotifications ────────────────────────────────────────────────────────

/**
 * listNotifications — Returns a paginated list of a user's notifications,
 * ordered newest-first, with the total unread count included in meta.
 *
 * Runs feed query and unread count in parallel to minimise round-trips.
 *
 * @param {string} userId - Authenticated user's ID
 * @param {number} page   - Page number (1-indexed)
 * @param {number} limit  - Results per page (capped at PAGINATION.MAX_LIMIT)
 * @returns {Promise<{ notifications: Object[], meta: Object }>}
 */
async function listNotifications(userId, page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT) {
  const { safePage, safeLimit, offset } = paginate(page, limit);

  const [feedResult, unreadResult] = await Promise.all([
    query(
      `SELECT n.*, COUNT(*) OVER()::int AS total_count
       FROM notifications n
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, safeLimit, offset]
    ),
    query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    )
  ]);

  const total       = feedResult.rows.length ? feedResult.rows[0].total_count : 0;
  const unreadCount = unreadResult.rows[0].count;
  const meta        = buildMeta(total, safePage, safeLimit);

  return {
    notifications: feedResult.rows.map(formatNotification),
    meta:          { ...meta, unreadCount }
  };
}

// ─── markOneRead ─────────────────────────────────────────────────────────────

/**
 * markOneRead — Marks a single notification as read.
 *
 * Re-fetches the notification to verify ownership before mutating (per the
 * architecture rule: ownership checks re-fetch the row, not trust client input).
 * Returns 404 rather than 403 when the notification belongs to a different user
 * to avoid confirming the notification's existence to an unauthorised caller.
 * Idempotent: returns the existing row unchanged if it was already read.
 *
 * @param {string} userId         - Authenticated user's ID
 * @param {string} notificationId - UUID of the notification to mark read
 * @returns {Promise<Object>} The updated (or already-read) notification
 * @throws {ApiError} 404 if not found or owned by a different user
 */
async function markOneRead(userId, notificationId) {
  const fetchResult = await query(
    'SELECT * FROM notifications WHERE id = $1',
    [notificationId]
  );

  if (!fetchResult.rows.length) {
    throw ApiError.notFound('Notification');
  }

  const notification = fetchResult.rows[0];

  if (notification.user_id !== userId) {
    throw ApiError.notFound('Notification');
  }

  // Already read — idempotent return
  if (notification.is_read) {
    return formatNotification(notification);
  }

  const updateResult = await query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 RETURNING *`,
    [notificationId]
  );

  return formatNotification(updateResult.rows[0]);
}

// ─── markAllRead ─────────────────────────────────────────────────────────────

/**
 * markAllRead — Marks all of a user's unread notifications as read in one query.
 *
 * @param {string} userId - Authenticated user's ID
 * @returns {Promise<{ updatedCount: number }>} Count of rows updated (0 if all were already read)
 */
async function markAllRead(userId) {
  const result = await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );

  return { updatedCount: result.rowCount };
}

module.exports = {
  createNotification,
  listNotifications,
  markOneRead,
  markAllRead
};
