'use strict';

const { query, getClient }     = require('../../config/database');
const ApiError                 = require('../../utils/ApiError');
const paginate                 = require('../../utils/paginate');
const { buildMeta }            = require('../../utils/paginate');
const {
  BOOKING_STATUS,
  REVIEW_ROLES,
  NOTIFICATION_TYPES,
  PLATFORM_SETTINGS,
  POST_TYPES
}                              = require('../../utils/constants');

// ─── Lazy notification loader ─────────────────────────────────────────────────
// Mirrors the pattern in bookings.service.js: resilient to notifications module
// not yet being present (though Block I is now complete, the pattern is preserved
// for consistency and module-load resilience per CLAUDE.md §3.7).

let _notifService = null;

function getNotifService() {
  if (_notifService) return _notifService;
  try {
    _notifService = require('../notifications/notifications.service');
    return _notifService;
  } catch {
    return null;
  }
}

/**
 * notify — Dispatches a notification. Errors are logged, never re-thrown.
 *
 * @param {Object} payload - createNotification payload
 * @returns {Promise<void>}
 */
async function notify(payload) {
  const svc = getNotifService();
  if (!svc) return;
  try {
    await svc.createNotification(payload);
  } catch (err) {
    console.error('[Reviews] Notification error:', err.message);
  }
}

// ─── Platform settings helper ─────────────────────────────────────────────────
// Phase 8: consolidated into the cached config.service (was duplicated here —
// the tech debt acknowledged in PROJECT_CONTEXT.md Section 32).

const { getPlatformSetting } = require('../config/config.service');

// ─── formatReview ─────────────────────────────────────────────────────────────

/**
 * formatReview — Translates a raw DB row into the camelCase API shape.
 * Fields from user JOINs (reviewer_name, reviewer_image, reviewee_name) are
 * present only on queries that include the corresponding JOIN.
 *
 * @param {Object} row - Raw row from the reviews table (+ optional user JOINs)
 * @returns {Object} Formatted review for API responses
 */
function formatReview(row) {
  return {
    id:         row.id,
    bookingId:  row.booking_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    rating:     row.rating,
    comment:    row.comment     || null,
    reviewRole: row.review_role,
    isVisible:  row.is_visible,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
    // Nested reviewer — populated when the query JOINs rv_er (getBookingReviews, getUserReviews).
    reviewer: (row.reviewer_name || row.reviewer_image) ? {
      id:              row.reviewer_id,
      fullName:        row.reviewer_name  || null,
      profileImageUrl: row.reviewer_image || null,
    } : undefined,
    // Nested reviewee — populated when the query JOINs rv_ee (getBookingReviews, getMyReviews).
    reviewee: row.reviewee_name ? {
      id:       row.reviewee_id,
      fullName: row.reviewee_name || null,
    } : undefined,
  };
}

// ─── createReview ─────────────────────────────────────────────────────────────

/**
 * createReview — Inserts a review for a completed booking and recalculates
 * the reviewee's rating aggregate on the users table.
 *
 * review_role describes the REVIEWEE's role in the booking:
 *   as_customer    → reviewee played the customer (requester); reviewer must be post_owner
 *   as_transporter → reviewee played the transporter (post_owner); reviewer must be requester
 *
 * No transaction: the compound unique index (booking_id, reviewer_id, review_role)
 * atomically prevents duplicates. If the rating UPDATE fails after a successful
 * INSERT, the review record is still valid — the aggregate self-heals on the next
 * review write. Failure is logged, not re-thrown.
 *
 * @param {string} bookingId  - Booking UUID
 * @param {string} reviewerId - Authenticated user submitting the review
 * @param {number} rating     - Integer 1–5
 * @param {string|null} comment
 * @param {string} reviewRole - REVIEW_ROLES constant value
 * @returns {Promise<{ review: Object }>}
 * @throws {ApiError} 404 if booking not found
 * @throws {ApiError} 422 if booking is not completed
 * @throws {ApiError} 403 if reviewer is not a party or chose the wrong role
 * @throws {ApiError} 409 if reviewer already submitted a review in this role
 */
async function createReview(bookingId, reviewerId, rating, comment, reviewRole) {
  // 1. Fetch booking + post_type (needed for role resolution)
  const bookingResult = await query(
    `SELECT b.id, b.requester_id, b.post_owner_id, b.status, p.post_type
     FROM bookings b
     JOIN posts p ON p.id = b.post_id
     WHERE b.id = $1`,
    [bookingId]
  );
  if (bookingResult.rows.length === 0) {
    throw ApiError.notFound('Booking');
  }
  const booking = bookingResult.rows[0];

  // 2. Booking must be completed to allow reviews
  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    throw ApiError.businessRule(
      'Reviews can only be submitted for completed bookings.',
      'REVIEW_NOT_ALLOWED'
    );
  }

  // 3. Reviewer must be a party to this booking
  if (reviewerId !== booking.requester_id && reviewerId !== booking.post_owner_id) {
    throw ApiError.forbidden('You are not a party to this booking.');
  }

  // 4. Determine revieweeId and enforce role/party consistency.
  //    review_role identifies WHAT ROLE THE REVIEWEE PLAYED, not the reviewer.
  //    The mapping of "who is shipper/transporter" depends on post_type:
  //      Need-Transport: post_owner = Shipper (customer), requester = Transporter
  //      Vehicle-Available / Return-Journey: post_owner = Transporter, requester = Shipper (customer)
  const isNeedTransport = booking.post_type === POST_TYPES.NEED_TRANSPORT;
  const shipperId    = isNeedTransport ? booking.post_owner_id : booking.requester_id;
  const transporterId = isNeedTransport ? booking.requester_id : booking.post_owner_id;

  let revieweeId;
  if (reviewRole === REVIEW_ROLES.AS_CUSTOMER) {
    // Reviewee played the customer (Shipper) role — only the transporter may submit this.
    if (reviewerId !== transporterId) {
      throw ApiError.forbidden(
        'Only the transporter may submit a review in the as_customer role.',
        'WRONG_REVIEW_ROLE'
      );
    }
    revieweeId = shipperId;
  } else {
    // REVIEW_ROLES.AS_TRANSPORTER — reviewee played the transporter role.
    // Only the shipper may submit this.
    if (reviewerId !== shipperId) {
      throw ApiError.forbidden(
        'Only the shipper may submit a review in the as_transporter role.',
        'WRONG_REVIEW_ROLE'
      );
    }
    revieweeId = transporterId;
  }

  // 5. INSERT — compound unique index (booking_id, reviewer_id, review_role) prevents duplicates
  let insertedRow;
  try {
    const insertResult = await query(
      `INSERT INTO reviews
         (booking_id, reviewer_id, reviewee_id, rating, comment, review_role, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [bookingId, reviewerId, revieweeId, rating, comment || null, reviewRole]
    );
    insertedRow = insertResult.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw ApiError.conflict('You have already submitted a review for this booking in this role.');
    }
    throw err;
  }

  // 6. Recalculate reviewee rating — best-effort (see CLAUDE.md MODULE_CONTEXT note)
  try {
    await query(
      `UPDATE users
       SET rating        = (
             SELECT ROUND(AVG(rating)::numeric, 2)
             FROM reviews
             WHERE reviewee_id = $1 AND is_visible = true
           ),
           total_reviews = (
             SELECT COUNT(*)::int
             FROM reviews
             WHERE reviewee_id = $1 AND is_visible = true
           )
       WHERE id = $1`,
      [revieweeId]
    );
  } catch (ratingErr) {
    console.error('[Reviews] Rating recalculation failed after insert:', ratingErr.message);
  }

  // 7. Notify reviewee
  await notify({
    userId: revieweeId,
    type:   NOTIFICATION_TYPES.REVIEW_RECEIVED,
    title:  'You received a new review',
    body:   `Someone left you a ${rating}-star review for a completed booking.`,
    data:   { bookingId, reviewId: insertedRow.id }
  });

  return { review: formatReview(insertedRow) };
}

// ─── getBookingReviews ────────────────────────────────────────────────────────

/**
 * getBookingReviews — Returns both reviews (0–2) for a specific booking.
 * Only parties to the booking may access this. Returns 404 for non-parties
 * to avoid confirming the booking's existence to unauthorised callers.
 *
 * @param {string} bookingId - Booking UUID
 * @param {string} userId    - Authenticated user ID
 * @returns {Promise<{ reviews: Object[], totalCount: number }>}
 * @throws {ApiError} 404 if booking not found or user is not a party
 */
async function getBookingReviews(bookingId, userId) {
  const bookingResult = await query(
    'SELECT id, requester_id, post_owner_id FROM bookings WHERE id = $1',
    [bookingId]
  );

  if (
    bookingResult.rows.length === 0 ||
    (bookingResult.rows[0].requester_id !== userId &&
     bookingResult.rows[0].post_owner_id !== userId)
  ) {
    throw ApiError.notFound('Booking');
  }

  const result = await query(
    `SELECT r.*,
       rv_er.full_name          AS reviewer_name,
       rv_er.profile_image_url  AS reviewer_image,
       rv_ee.full_name          AS reviewee_name
     FROM reviews r
     JOIN users rv_er ON rv_er.id = r.reviewer_id
     JOIN users rv_ee ON rv_ee.id = r.reviewee_id
     WHERE r.booking_id = $1
     ORDER BY r.created_at ASC`,
    [bookingId]
  );

  return {
    reviews:    result.rows.map(formatReview),
    totalCount: result.rows.length
  };
}

// ─── getMyReviews ─────────────────────────────────────────────────────────────

/**
 * getMyReviews — Returns paginated reviews the authenticated user has written,
 * newest-first. Includes basic reviewee profile (name) for display.
 *
 * @param {string} userId - Authenticated user ID (the reviewer)
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{ reviews: Object[], meta: Object }>}
 */
async function getMyReviews(userId, page, limit) {
  const { safePage, safeLimit, offset } = paginate(page, limit, 50);

  const [countResult, rowsResult] = await Promise.all([
    query(
      'SELECT COUNT(*)::int AS total FROM reviews WHERE reviewer_id = $1',
      [userId]
    ),
    query(
      `SELECT r.*,
         u.full_name AS reviewee_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewee_id
       WHERE r.reviewer_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, safeLimit, offset]
    )
  ]);

  return {
    reviews: rowsResult.rows.map(formatReview),
    meta:    buildMeta(countResult.rows[0].total, safePage, safeLimit)
  };
}

// ─── getUserReviews ───────────────────────────────────────────────────────────

/**
 * getUserReviews — Returns paginated visible reviews written about a user.
 * Public endpoint — no auth required. Only is_visible = true rows are returned.
 * Includes reviewer profile (name, image) for display.
 *
 * @param {string} revieweeId - User UUID whose reviews to fetch
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{ reviews: Object[], meta: Object }>}
 */
async function getUserReviews(revieweeId, page, limit) {
  const { safePage, safeLimit, offset } = paginate(page, limit, 50);

  const [countResult, rowsResult] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total
       FROM reviews
       WHERE reviewee_id = $1 AND is_visible = true`,
      [revieweeId]
    ),
    query(
      `SELECT r.*,
         u.full_name          AS reviewer_name,
         u.profile_image_url  AS reviewer_image
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewee_id = $1 AND r.is_visible = true
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [revieweeId, safeLimit, offset]
    )
  ]);

  return {
    reviews: rowsResult.rows.map(formatReview),
    meta:    buildMeta(countResult.rows[0].total, safePage, safeLimit)
  };
}

// ─── deleteReview ─────────────────────────────────────────────────────────────

/**
 * deleteReview — Deletes the reviewer's own review within the platform-configured
 * edit window, then atomically recalculates the reviewee's rating.
 *
 * Uses a transaction: DELETE + rating recalculation must succeed or fail together.
 * A deleted review that fails to recalculate the rating would leave the reviewee's
 * aggregate permanently inflated.
 *
 * @param {string} reviewId - Review UUID to delete
 * @param {string} userId   - Authenticated user ID (must match reviewer_id)
 * @returns {Promise<{ deleted: boolean }>}
 * @throws {ApiError} 404 if review not found
 * @throws {ApiError} 403 if userId is not the reviewer
 * @throws {ApiError} 422 if the edit window has expired
 */
async function deleteReview(reviewId, userId) {
  // 1. Fetch review
  const reviewResult = await query(
    'SELECT id, reviewer_id, reviewee_id, created_at FROM reviews WHERE id = $1',
    [reviewId]
  );
  if (reviewResult.rows.length === 0) {
    throw ApiError.notFound('Review');
  }
  const review = reviewResult.rows[0];

  // 2. Ownership — only the reviewer may delete their own review
  if (review.reviewer_id !== userId) {
    throw ApiError.forbidden('You can only delete reviews you have written.');
  }

  // 3. Check the platform-configured edit window
  const windowHours = await getPlatformSetting(PLATFORM_SETTINGS.REVIEW_EDIT_WINDOW_HOURS, 24);
  const windowMs    = windowHours * 60 * 60 * 1000;
  if (Date.now() - new Date(review.created_at).getTime() > windowMs) {
    throw ApiError.businessRule(
      'The edit window for this review has expired.',
      'REVIEW_EDIT_WINDOW_EXPIRED'
    );
  }

  // 4. Transactional delete + rating recalculation
  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    await client.query(
      `UPDATE users
       SET rating        = (
             SELECT ROUND(AVG(rating)::numeric, 2)
             FROM reviews
             WHERE reviewee_id = $1 AND is_visible = true
           ),
           total_reviews = (
             SELECT COUNT(*)::int
             FROM reviews
             WHERE reviewee_id = $1 AND is_visible = true
           )
       WHERE id = $1`,
      [review.reviewee_id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { deleted: true };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createReview,
  getBookingReviews,
  getMyReviews,
  getUserReviews,
  deleteReview
};
