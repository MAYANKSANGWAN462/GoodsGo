'use strict';

const cron      = require('node-cron');
const { query } = require('../config/database');

// ─── Configuration ────────────────────────────────────────────────────────────

const BOOKING_AUTO_REJECT_HOURS = parseInt(
  process.env.BOOKING_AUTO_REJECT_HOURS, 10
) || 48;

// ─── Lazy notification loader ─────────────────────────────────────────────────
// Notifications module (Block I) may not exist yet.
// Using a lazy require prevents a crash at startup if the file isn't generated.
// Once Block I is generated, notifications fire automatically.

let _notificationsService = null;

function getNotificationsService() {
  if (_notificationsService) return _notificationsService;
  try {
    _notificationsService = require('../modules/notifications/notifications.service');
    return _notificationsService;
  } catch {
    return null; // Module not yet generated — notifications skipped
  }
}

// ─── expirePostsJob ───────────────────────────────────────────────────────────

/**
 * Marks active posts as 'expired' when their expires_at timestamp has passed.
 * Also sends a warning notification for posts expiring in the next 24 hours.
 *
 * @returns {Promise<{ expired: number, warned: number }>}
 */
async function expirePostsJob() {
  let expired = 0;
  let warned  = 0;

  try {
    // 1. Expire posts whose expires_at is in the past
    const expireResult = await query(
      `UPDATE posts
       SET status = 'expired'
       WHERE status = 'active'
         AND expires_at IS NOT NULL
         AND expires_at < NOW()
         AND deleted_at IS NULL
       RETURNING id, user_id`,
      []
    );

    expired = expireResult.rowCount;

    // 2. Send POST_EXPIRED notifications (fire-and-forget)
    if (expired > 0) {
      const notifs = getNotificationsService();
      if (notifs) {
        for (const post of expireResult.rows) {
          notifs.createNotification({
            userId:  post.user_id,
            type:    'post_expired',
            title:   'Your post has expired',
            body:    'One of your posts has expired. You can reactivate it from your profile.',
            data:    { postId: post.id }
          }).catch((err) => console.error('[Jobs] expirePosts notification error:', err.message));
        }
      }
    }

    // 3. Send 24-hour expiry warning for posts expiring in the next 24 hours
    const warnResult = await query(
      `SELECT id, user_id FROM posts
       WHERE status = 'active'
         AND expires_at IS NOT NULL
         AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
         AND deleted_at IS NULL`,
      []
    );

    warned = warnResult.rowCount;

    if (warned > 0) {
      const notifs = getNotificationsService();
      if (notifs) {
        for (const post of warnResult.rows) {
          notifs.createNotification({
            userId:  post.user_id,
            type:    'post_expiry_warning',
            title:   'Your post expires in 24 hours',
            body:    'Renew your post to keep it visible in the marketplace.',
            data:    { postId: post.id }
          }).catch((err) => console.error('[Jobs] expiry warning notification error:', err.message));
        }
      }
    }

    if (expired > 0 || warned > 0) {
      console.log(`[Jobs] expirePosts: ${expired} expired, ${warned} warned`);
    }

  } catch (err) {
    console.error('[Jobs] expirePosts error:', err.message);
  }

  return { expired, warned };
}

// ─── autoRejectBookingsJob ────────────────────────────────────────────────────

/**
 * Auto-rejects pending booking requests that have exceeded BOOKING_AUTO_REJECT_HOURS.
 * Also inserts a booking_status_history record for each auto-rejection.
 *
 * @returns {Promise<{ autoRejected: number }>}
 */
async function autoRejectBookingsJob() {
  let autoRejected = 0;

  try {
    // Find stale pending bookings
    const staleBookings = await query(
      `SELECT id, post_id, requester_id, post_owner_id
       FROM bookings
       WHERE status = 'pending'
         AND created_at < NOW() - INTERVAL '${BOOKING_AUTO_REJECT_HOURS} hours'`,
      []
    );

    if (staleBookings.rowCount === 0) return { autoRejected: 0 };

    const bookingIds = staleBookings.rows.map((b) => b.id);

    // Update status to auto_rejected
    await query(
      `UPDATE bookings
       SET status = 'auto_rejected',
           auto_rejected_at = NOW()
       WHERE id = ANY($1::uuid[])`,
      [bookingIds]
    );

    // Insert history records for each auto-rejected booking
    for (const booking of staleBookings.rows) {
      await query(
        `INSERT INTO booking_status_history
           (booking_id, from_status, to_status, changed_by, reason)
         VALUES ($1, 'pending', 'auto_rejected', NULL, $2)`,
        [
          booking.id,
          `Automatically rejected after ${BOOKING_AUTO_REJECT_HOURS} hours without response`
        ]
      );
    }

    autoRejected = staleBookings.rowCount;

    // Notify requesters (fire-and-forget)
    const notifs = getNotificationsService();
    if (notifs) {
      for (const booking of staleBookings.rows) {
        notifs.createNotification({
          userId:  booking.requester_id,
          type:    'booking_auto_rejected',
          title:   'Booking request expired',
          body:    `Your booking request was not responded to within ${BOOKING_AUTO_REJECT_HOURS} hours and has been automatically cancelled.`,
          data:    { bookingId: booking.id, postId: booking.post_id }
        }).catch((err) => console.error('[Jobs] autoReject notification error:', err.message));
      }
    }

    console.log(`[Jobs] autoRejectBookings: ${autoRejected} booking(s) auto-rejected`);

  } catch (err) {
    console.error('[Jobs] autoRejectBookings error:', err.message);
  }

  return { autoRejected };
}

// ─── Combined Job ─────────────────────────────────────────────────────────────

async function runAllJobs() {
  await expirePostsJob();
  await autoRejectBookingsJob();
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

/**
 * startJobs — Registers the cron schedule and runs once immediately on startup.
 * Called from server.js after the HTTP server starts.
 *
 * Schedule: every hour at minute 5 (e.g. 00:05, 01:05, 02:05)
 * Offset from :00 avoids contention with other services that run on the hour.
 */
function startJobs() {
  // Run once on startup to catch any missed expirations from downtime
  runAllJobs().catch((err) => console.error('[Jobs] Initial run error:', err.message));

  // Schedule hourly runs
  cron.schedule('5 * * * *', () => {
    console.log('[Jobs] Running scheduled maintenance jobs...');
    runAllJobs().catch((err) => console.error('[Jobs] Scheduled run error:', err.message));
  });

  console.log('[Jobs] Scheduled: post expiry + booking auto-reject (hourly at :05)');
}

module.exports = { startJobs, expirePostsJob, autoRejectBookingsJob };