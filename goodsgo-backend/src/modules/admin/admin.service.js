'use strict';

const { query, getClient } = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const {
  POST_STATUS,
  DISPUTE_STATUS,
  REPORT_STATUS,
  NOTIFICATION_TYPES
} = require('../../utils/constants');

// ─── Lazy Payment Service Loader ─────────────────────────────────────────────
// payments.service is built (Block N) and loads immediately at runtime.
// The try/catch pattern provides resilience if the module ever fails to load.

let _paymentService = null;

function getPaymentService() {
  if (_paymentService) return _paymentService;
  try {
    _paymentService = require('../payments/payments.service');
    return _paymentService;
  } catch {
    return null;
  }
}

// ─── Lazy Notification Loader ─────────────────────────────────────────────────

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
 * @param {object} payload
 * @returns {Promise<void>}
 */
async function notify(payload) {
  const svc = getNotifService();
  if (!svc) return;
  try {
    await svc.createNotification(payload);
  } catch (err) {
    console.error('[Admin] Notification error:', err.message);
  }
}

// ─── Pagination Helper ────────────────────────────────────────────────────────

function buildPageMeta(total, page, limit) {
  const totalInt = parseInt(total, 10);
  const totalPages = Math.ceil(totalInt / limit);
  return {
    page,
    limit,
    total: totalInt,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * listUsers — Paginated, filterable user list for admin management.
 * Supports fuzzy name/email search (ILIKE), active/verified status filters.
 *
 * @param {{ q?: string, is_active?: boolean, is_email_verified?: boolean }} filters
 * @param {{ page: number, limit: number }} pagination
 * @returns {Promise<{ users: Object[], meta: Object }>}
 */
async function listUsers(filters, pagination) {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const conditions = ['deleted_at IS NULL'];
  const params = [];
  let p = 1;

  if (filters.q) {
    conditions.push(`(full_name ILIKE $${p} OR email ILIKE $${p + 1})`);
    params.push(`%${filters.q}%`, `%${filters.q}%`);
    p += 2;
  }

  if (typeof filters.is_active === 'boolean') {
    conditions.push(`is_active = $${p}`);
    params.push(filters.is_active);
    p += 1;
  }

  if (typeof filters.is_email_verified === 'boolean') {
    conditions.push(`is_email_verified = $${p}`);
    params.push(filters.is_email_verified);
    p += 1;
  }

  const where = conditions.join(' AND ');

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT id, email, full_name, phone, city, state,
              is_active, is_email_verified, is_identity_verified,
              suspended_at, suspension_reason,
              rating, total_reviews, cancellation_count, last_login_at, created_at
       FROM users
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, limit, offset]
    ),
    query(`SELECT COUNT(*) AS total FROM users WHERE ${where}`, params)
  ]);

  return {
    users: dataResult.rows.map(formatUser),
    meta: buildPageMeta(countResult.rows[0].total, page, limit)
  };
}

/**
 * getUserDetail — Full user profile with aggregate post and booking counts.
 *
 * @param {string} userId - UUID
 * @returns {Promise<Object>}
 * @throws {ApiError} 404 if user not found
 */
async function getUserDetail(userId) {
  const result = await query(
    `SELECT
       u.id, u.email, u.full_name, u.phone, u.bio, u.city, u.state, u.country,
       u.profile_image_url, u.is_active, u.is_email_verified, u.is_identity_verified,
       u.suspended_at, u.suspension_reason,
       u.rating, u.total_reviews, u.cancellation_count,
       u.last_login_at, u.created_at, u.updated_at, u.deleted_at,
       COUNT(DISTINCT p.id)    FILTER (WHERE p.deleted_at IS NULL) AS total_posts,
       COUNT(DISTINCT b_req.id)                                     AS total_bookings_as_requester,
       COUNT(DISTINCT b_own.id)                                     AS total_bookings_as_owner
     FROM users u
     LEFT JOIN posts    p     ON p.user_id        = u.id
     LEFT JOIN bookings b_req ON b_req.requester_id  = u.id
     LEFT JOIN bookings b_own ON b_own.post_owner_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );

  if (result.rows.length === 0) throw ApiError.notFound('User');

  const row = result.rows[0];
  return {
    ...formatUser(row),
    bio: row.bio || null,
    country: row.country || null,
    profileImageUrl: row.profile_image_url || null,
    isIdentityVerified: row.is_identity_verified,
    lastLoginAt: row.last_login_at || null,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null,
    totalPosts: parseInt(row.total_posts, 10),
    totalBookingsAsRequester: parseInt(row.total_bookings_as_requester, 10),
    totalBookingsAsOwner: parseInt(row.total_bookings_as_owner, 10)
  };
}

/**
 * suspendUser — Sets suspended_at + suspension_reason; deactivates all active posts.
 * Does NOT set is_active = false — that field is reserved for user-initiated
 * account deactivation (which also sets deleted_at). The auth middleware blocks
 * suspended users via the `suspended_at IS NOT NULL` check independently.
 *
 * @param {string} userId - UUID
 * @param {string} reason - Suspension reason (min 10 chars, validated by Joi)
 * @param {string} adminId - UUID of acting admin
 * @returns {Promise<Object>} Updated user summary
 * @throws {ApiError} 404 if not found or deleted, 409 if already suspended
 */
async function suspendUser(userId, reason, adminId) {
  const check = await query(
    'SELECT id, deleted_at, suspended_at FROM users WHERE id = $1',
    [userId]
  );
  if (check.rows.length === 0 || check.rows[0].deleted_at) throw ApiError.notFound('User');
  if (check.rows[0].suspended_at) {
    throw ApiError.conflict(
      'This user is already suspended. Reactivate them first before issuing a new suspension.'
    );
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE users
       SET suspended_at = NOW(), suspension_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, full_name, is_active, is_email_verified,
                 suspended_at, suspension_reason, rating, total_reviews,
                 cancellation_count, created_at`,
      [reason, userId]
    );

    // Deactivate all of this user's currently active posts so they stop appearing
    // in the public marketplace feed while the account is suspended.
    await client.query(
      `UPDATE posts
       SET status = $1, updated_at = NOW()
       WHERE user_id = $2 AND status = $3 AND deleted_at IS NULL`,
      [POST_STATUS.INACTIVE, userId, POST_STATUS.ACTIVE]
    );

    await client.query('COMMIT');
    return formatUser(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * reactivateUser — Clears suspended_at and suspension_reason.
 * The user's posts remain inactive — the user must re-activate them manually.
 *
 * @param {string} userId - UUID
 * @param {string} adminId - UUID of acting admin
 * @returns {Promise<Object>} Updated user summary
 * @throws {ApiError} 404 if not found or deleted, 409 if not currently suspended
 */
async function reactivateUser(userId, adminId) {
  const check = await query(
    'SELECT id, deleted_at, suspended_at FROM users WHERE id = $1',
    [userId]
  );
  if (check.rows.length === 0 || check.rows[0].deleted_at) throw ApiError.notFound('User');
  if (!check.rows[0].suspended_at) {
    throw ApiError.conflict('This user is not currently suspended.');
  }

  const updated = await query(
    `UPDATE users
     SET suspended_at = NULL, suspension_reason = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, full_name, is_active, is_email_verified,
               suspended_at, suspension_reason, rating, total_reviews,
               cancellation_count, created_at`,
    [userId]
  );

  return formatUser(updated.rows[0]);
}

/**
 * @param {Object} row - DB row from users table
 * @returns {Object}
 */
function formatUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone || null,
    city: row.city || null,
    state: row.state || null,
    isActive: row.is_active,
    isEmailVerified: row.is_email_verified,
    suspendedAt: row.suspended_at || null,
    suspensionReason: row.suspension_reason || null,
    rating: row.rating ? parseFloat(row.rating) : null,
    totalReviews: row.total_reviews || 0,
    cancellationCount: row.cancellation_count || 0,
    createdAt: row.created_at
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST MODERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * listPostsAdmin — Paginated post list including all statuses (deleted/hidden).
 * Unlike the public feed this shows posts of every status.
 *
 * @param {{ status?: string, type?: string, reported?: boolean }} filters
 * @param {{ page: number, limit: number }} pagination
 * @returns {Promise<{ posts: Object[], meta: Object }>}
 */
async function listPostsAdmin(filters, pagination) {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let p = 1;

  if (filters.status) {
    conditions.push(`p.status = $${p}`);
    params.push(filters.status);
    p += 1;
  }

  if (filters.type) {
    conditions.push(`p.post_type = $${p}`);
    params.push(filters.type);
    p += 1;
  }

  if (filters.reported === true) {
    // Filter to only posts that have at least one pending report.
    // Fixed string — not user-controlled — so safe to embed in the condition.
    conditions.push(
      `EXISTS (
        SELECT 1 FROM reported_posts rp
        WHERE rp.post_id = p.id AND rp.status = 'pending'
      )`
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT p.id, p.post_type, p.status, p.origin_address, p.origin_city,
              p.destination_address, p.destination_city, p.availability_date,
              p.goods_type, p.vehicle_type, p.price_expectation, p.budget_min,
              p.budget_max, p.view_count, p.created_at, p.deleted_at,
              u.id AS owner_id, u.full_name AS owner_name, u.email AS owner_email,
              EXISTS (
                SELECT 1 FROM reported_posts rp
                WHERE rp.post_id = p.id AND rp.status = 'pending'
              ) AS has_pending_report
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, limit, offset]
    ),
    query(
      `SELECT COUNT(*) AS total FROM posts p ${where}`,
      params
    )
  ]);

  return {
    posts: dataResult.rows.map(formatPostAdmin),
    meta: buildPageMeta(countResult.rows[0].total, page, limit)
  };
}

/**
 * hidePost — Admin soft-hide: sets post status to 'deleted' without owner action.
 * Note: hiding a booked/in-progress post leaves the booking intact — admin
 * should coordinate with dispute/booking management if needed.
 *
 * @param {string} postId - UUID
 * @param {string} adminId - UUID of acting admin
 * @returns {Promise<Object>} Updated post summary
 * @throws {ApiError} 404 if not found, 409 if already hidden
 */
async function hidePost(postId, adminId) {
  const check = await query('SELECT id, status FROM posts WHERE id = $1', [postId]);
  if (check.rows.length === 0) throw ApiError.notFound('Post');
  if (check.rows[0].status === POST_STATUS.DELETED) {
    throw ApiError.conflict('This post is already hidden.');
  }

  const updated = await query(
    `UPDATE posts SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, post_type, status, origin_address, deleted_at, updated_at`,
    [POST_STATUS.DELETED, postId]
  );

  return formatPostAdmin(updated.rows[0]);
}

/**
 * restorePost — Restores an admin-hidden post to 'inactive' status.
 * Restored to inactive (not active) so the owner can review before republishing.
 *
 * @param {string} postId - UUID
 * @param {string} adminId - UUID of acting admin
 * @returns {Promise<Object>} Updated post summary
 * @throws {ApiError} 404 if not found, 409 if not currently hidden
 */
async function restorePost(postId, adminId) {
  const check = await query('SELECT id, status FROM posts WHERE id = $1', [postId]);
  if (check.rows.length === 0) throw ApiError.notFound('Post');
  if (check.rows[0].status !== POST_STATUS.DELETED) {
    throw ApiError.conflict(
      `Post cannot be restored — current status is '${check.rows[0].status}', not 'deleted'.`
    );
  }

  const updated = await query(
    `UPDATE posts SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, post_type, status, origin_address, deleted_at, updated_at`,
    [POST_STATUS.INACTIVE, postId]
  );

  return formatPostAdmin(updated.rows[0]);
}

/**
 * @param {Object} row
 * @returns {Object}
 */
function formatPostAdmin(row) {
  return {
    id: row.id,
    postType: row.post_type || null,
    status: row.status,
    originAddress: row.origin_address || null,
    originCity: row.origin_city || null,
    destinationAddress: row.destination_address || null,
    destinationCity: row.destination_city || null,
    availabilityDate: row.availability_date || null,
    goodsType: row.goods_type || null,
    vehicleType: row.vehicle_type || null,
    priceExpectation: row.price_expectation != null ? parseFloat(row.price_expectation) : null,
    budgetMin: row.budget_min != null ? parseFloat(row.budget_min) : null,
    budgetMax: row.budget_max != null ? parseFloat(row.budget_max) : null,
    viewCount: row.view_count || 0,
    ownerId: row.owner_id || null,
    ownerName: row.owner_name || null,
    ownerEmail: row.owner_email || null,
    hasPendingReport: row.has_pending_report || false,
    deletedAt: row.deleted_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * listReports — Paginated reported-posts list with reporter and post metadata.
 *
 * @param {{ status?: string, reason?: string }} filters
 * @param {{ page: number, limit: number }} pagination
 * @returns {Promise<{ reports: Object[], meta: Object }>}
 */
async function listReports(filters, pagination) {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let p = 1;

  if (filters.status) {
    conditions.push(`rp.status = $${p}`);
    params.push(filters.status);
    p += 1;
  }

  if (filters.reason) {
    conditions.push(`rp.reason = $${p}`);
    params.push(filters.reason);
    p += 1;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT rp.id, rp.reason, rp.description, rp.status, rp.admin_notes,
              rp.created_at, rp.reviewed_at,
              reporter.id         AS reporter_id,
              reporter.full_name  AS reporter_name,
              reporter.email      AS reporter_email,
              p.id                AS post_id,
              p.post_type,
              p.origin_address,
              p.status            AS post_status,
              owner.full_name     AS post_owner_name,
              owner.email         AS post_owner_email
       FROM reported_posts rp
       JOIN users reporter ON reporter.id = rp.reporter_id
       JOIN posts p        ON p.id = rp.post_id
       JOIN users owner    ON owner.id = p.user_id
       ${where}
       ORDER BY rp.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, limit, offset]
    ),
    query(
      `SELECT COUNT(*) AS total FROM reported_posts rp ${where}`,
      params
    )
  ]);

  return {
    reports: dataResult.rows.map(formatReport),
    meta: buildPageMeta(countResult.rows[0].total, page, limit)
  };
}

/**
 * resolveReport — Marks a report as resolved with admin notes.
 *
 * @param {string} reportId - UUID
 * @param {string} adminId - UUID of acting admin
 * @param {string} adminNotes - Required resolution notes
 * @returns {Promise<Object>} Updated report
 * @throws {ApiError} 404 if not found, 409 if already resolved or dismissed
 */
async function resolveReport(reportId, adminId, adminNotes) {
  const check = await query('SELECT id, status FROM reported_posts WHERE id = $1', [reportId]);
  if (check.rows.length === 0) throw ApiError.notFound('Report');

  const { status } = check.rows[0];
  if (status === REPORT_STATUS.RESOLVED || status === REPORT_STATUS.DISMISSED) {
    throw ApiError.conflict(`Report is already ${status} and cannot be changed.`);
  }

  const updated = await query(
    `UPDATE reported_posts
     SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW()
     WHERE id = $4
     RETURNING id, reason, description, status, admin_notes, created_at, reviewed_at`,
    [REPORT_STATUS.RESOLVED, adminNotes, adminId, reportId]
  );

  return formatReport(updated.rows[0]);
}

/**
 * dismissReport — Marks a report as dismissed.
 *
 * @param {string} reportId - UUID
 * @param {string} adminId - UUID of acting admin
 * @param {string|null} adminNotes - Optional dismissal notes
 * @returns {Promise<Object>} Updated report
 * @throws {ApiError} 404 if not found, 409 if already resolved or dismissed
 */
async function dismissReport(reportId, adminId, adminNotes) {
  const check = await query('SELECT id, status FROM reported_posts WHERE id = $1', [reportId]);
  if (check.rows.length === 0) throw ApiError.notFound('Report');

  const { status } = check.rows[0];
  if (status === REPORT_STATUS.RESOLVED || status === REPORT_STATUS.DISMISSED) {
    throw ApiError.conflict(`Report is already ${status} and cannot be changed.`);
  }

  const updated = await query(
    `UPDATE reported_posts
     SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW()
     WHERE id = $4
     RETURNING id, reason, description, status, admin_notes, created_at, reviewed_at`,
    [REPORT_STATUS.DISMISSED, adminNotes || null, adminId, reportId]
  );

  return formatReport(updated.rows[0]);
}

/**
 * @param {Object} row
 * @returns {Object}
 */
function formatReport(row) {
  return {
    id: row.id,
    reason: row.reason,
    description: row.description || null,
    status: row.status,
    adminNotes: row.admin_notes || null,
    reviewedAt: row.reviewed_at || null,
    reporterId: row.reporter_id || null,
    reporterName: row.reporter_name || null,
    reporterEmail: row.reporter_email || null,
    postId: row.post_id || null,
    postType: row.post_type || null,
    postStatus: row.post_status || null,
    postOriginAddress: row.origin_address || null,
    postOwnerName: row.post_owner_name || null,
    postOwnerEmail: row.post_owner_email || null,
    createdAt: row.created_at
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPUTE RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * listDisputes — Paginated dispute list with booking and user context.
 *
 * @param {{ status?: string }} filters
 * @param {{ page: number, limit: number }} pagination
 * @returns {Promise<{ disputes: Object[], meta: Object }>}
 */
async function listDisputes(filters, pagination) {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let p = 1;

  if (filters.status) {
    conditions.push(`d.status = $${p}`);
    params.push(filters.status);
    p += 1;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT d.id, d.reason, d.description, d.status, d.admin_notes,
              d.resolved_at, d.created_at,
              u.id           AS raised_by_id,
              u.full_name    AS raised_by_name,
              u.email        AS raised_by_email,
              b.id           AS booking_id,
              b.status       AS booking_status,
              b.agreed_price,
              b.post_id
       FROM disputes d
       JOIN users    u ON u.id = d.raised_by
       JOIN bookings b ON b.id = d.booking_id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, limit, offset]
    ),
    query(`SELECT COUNT(*) AS total FROM disputes d ${where}`, params)
  ]);

  return {
    disputes: dataResult.rows.map(formatDisputeRow),
    meta: buildPageMeta(countResult.rows[0].total, page, limit)
  };
}

/**
 * getDisputeDetail — Full dispute detail including booking, parties, and resolver.
 *
 * @param {string} disputeId - UUID
 * @returns {Promise<Object>}
 * @throws {ApiError} 404 if not found
 */
async function getDisputeDetail(disputeId) {
  const result = await query(
    `SELECT d.*,
            u.full_name       AS raised_by_name,
            u.email           AS raised_by_email,
            b.status          AS booking_status,
            b.agreed_price,
            b.post_id,
            b.requester_id,
            b.post_owner_id,
            au.full_name      AS resolved_by_name
     FROM disputes d
     JOIN users       u  ON u.id  = d.raised_by
     JOIN bookings    b  ON b.id  = d.booking_id
     LEFT JOIN admin_users au ON au.id = d.resolved_by
     WHERE d.id = $1`,
    [disputeId]
  );

  if (result.rows.length === 0) throw ApiError.notFound('Dispute');

  const row = result.rows[0];
  return {
    id: row.id,
    reason: row.reason,
    description: row.description || null,
    evidenceUrls: row.evidence_urls || [],
    status: row.status,
    adminNotes: row.admin_notes || null,
    resolvedAt: row.resolved_at || null,
    raisedBy: {
      id: row.raised_by,
      name: row.raised_by_name,
      email: row.raised_by_email
    },
    resolvedBy: row.resolved_by
      ? { id: row.resolved_by, name: row.resolved_by_name }
      : null,
    booking: {
      id: row.booking_id,
      status: row.booking_status,
      agreedPrice: row.agreed_price != null ? parseFloat(row.agreed_price) : null,
      postId: row.post_id,
      requesterId: row.requester_id,
      postOwnerId: row.post_owner_id
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * resolveDispute — Updates dispute status and resolution metadata.
 * Notifies both booking parties when a terminal status is set.
 *
 * @param {string} disputeId - UUID
 * @param {string} status - Target status (validated against DISPUTE_STATUS minus 'open')
 * @param {string} adminNotes - Required admin notes
 * @param {string} adminId - UUID of acting admin
 * @returns {Promise<Object>} Full dispute detail after update
 * @throws {ApiError} 404 if not found, 409 if already in a terminal resolved state
 */
async function resolveDispute(disputeId, status, adminNotes, adminId) {
  const existing = await query(
    `SELECT d.id, d.status, b.requester_id, b.post_owner_id, b.id AS booking_id, b.post_id
     FROM disputes d
     JOIN bookings b ON b.id = d.booking_id
     WHERE d.id = $1`,
    [disputeId]
  );
  if (existing.rows.length === 0) throw ApiError.notFound('Dispute');

  const current = existing.rows[0];
  const terminalStatuses = [
    DISPUTE_STATUS.RESOLVED_FOR_CUSTOMER,
    DISPUTE_STATUS.RESOLVED_FOR_TRANSPORTER,
    DISPUTE_STATUS.RESOLVED_PARTIAL
  ];

  if (terminalStatuses.includes(current.status)) {
    throw ApiError.conflict(
      `Dispute is already resolved (status: ${current.status}) and cannot be changed.`
    );
  }

  // resolved_by and resolved_at are only set on terminal statuses.
  // For under_review, those fields remain NULL to indicate no final ruling yet.
  const isTerminal = terminalStatuses.includes(status);

  await query(
    `UPDATE disputes
     SET status       = $1,
         admin_notes  = $2,
         resolved_by  = CASE WHEN $3 THEN $4 ELSE NULL END,
         resolved_at  = CASE WHEN $3 THEN NOW() ELSE NULL END,
         updated_at   = NOW()
     WHERE id = $5`,
    [status, adminNotes, isTerminal, adminId, disputeId]
  );

  if (isTerminal) {
    setImmediate(async () => {
      const data = { disputeId, bookingId: current.booking_id, postId: current.post_id };
      await notify({
        userId: current.requester_id,
        type:   NOTIFICATION_TYPES.DISPUTE_RESOLVED,
        title:  'Dispute resolved',
        body:   'The dispute on your booking has been reviewed and resolved by our team.',
        data
      });
      await notify({
        userId: current.post_owner_id,
        type:   NOTIFICATION_TYPES.DISPUTE_RESOLVED,
        title:  'Dispute resolved',
        body:   'The dispute on your booking has been reviewed and resolved by our team.',
        data
      });
    });
  }

  return getDisputeDetail(disputeId);
}

/**
 * @param {Object} row - Row from listDisputes data query
 * @returns {Object}
 */
function formatDisputeRow(row) {
  return {
    id: row.id,
    reason: row.reason,
    description: row.description || null,
    status: row.status,
    adminNotes: row.admin_notes || null,
    resolvedAt: row.resolved_at || null,
    raisedBy: {
      id: row.raised_by_id,
      name: row.raised_by_name,
      email: row.raised_by_email
    },
    booking: {
      id: row.booking_id,
      status: row.booking_status,
      agreedPrice: row.agreed_price != null ? parseFloat(row.agreed_price) : null,
      postId: row.post_id
    },
    createdAt: row.created_at
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT ADMIN ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * releasePaymentAdmin — Triggers escrow payment release for a completed booking.
 * Delegates entirely to payments.service.releasePayment().
 *
 * @param {string} bookingId - UUID
 * @param {string} adminId - UUID of acting admin
 * @returns {Promise<Object>}
 * @throws {ApiError} 503 if payment service unavailable; other errors propagated from payments.service
 */
async function releasePaymentAdmin(bookingId, adminId) {
  const svc = getPaymentService();
  if (!svc) throw ApiError.internal('Payment service is not available.');
  return svc.releasePayment(bookingId, adminId);
}

/**
 * refundPaymentAdmin — Issues a partial or full Razorpay refund for a booking.
 * Delegates entirely to payments.service.refundPayment().
 *
 * @param {string} bookingId - UUID
 * @param {number} amount - Refund amount in INR (smallest currency unit: paise)
 * @param {string} reason - Human-readable refund reason
 * @param {string} adminId - UUID of acting admin
 * @returns {Promise<Object>}
 * @throws {ApiError} 503 if payment service unavailable; other errors propagated from payments.service
 */
async function refundPaymentAdmin(bookingId, amount, reason, adminId) {
  const svc = getPaymentService();
  if (!svc) throw ApiError.internal('Payment service is not available.');
  return svc.refundPayment(bookingId, amount, reason, adminId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * getPlatformSettings — Returns all platform settings with raw and parsed values.
 *
 * @returns {Promise<Object[]>}
 */
async function getPlatformSettings() {
  const result = await query(
    'SELECT key, value, value_type, description, updated_at FROM platform_settings ORDER BY key'
  );

  return result.rows.map((row) => {
    let parsedValue = row.value;
    if (row.value_type === 'number')      parsedValue = parseFloat(row.value);
    else if (row.value_type === 'boolean') parsedValue = row.value === 'true';
    else if (row.value_type === 'json') {
      try { parsedValue = JSON.parse(row.value); } catch { parsedValue = row.value; }
    }
    return {
      key: row.key,
      value: row.value,
      parsedValue,
      valueType: row.value_type,
      description: row.description,
      updatedAt: row.updated_at
    };
  });
}

/**
 * updatePlatformSetting — Updates a single platform setting value.
 * Validates the incoming string value against the setting's declared value_type.
 *
 * @param {string} key - Must already exist in platform_settings
 * @param {string} value - New value as string; stored as text in DB
 * @param {string} adminId - UUID of acting admin
 * @returns {Promise<Object>} Updated setting
 * @throws {ApiError} 404 if key not found, 400 if value type mismatch
 */
async function updatePlatformSetting(key, value, adminId) {
  const existing = await query(
    'SELECT key, value_type FROM platform_settings WHERE key = $1',
    [key]
  );
  if (existing.rows.length === 0) throw ApiError.notFound(`Platform setting "${key}"`);

  const { value_type } = existing.rows[0];
  if (value_type === 'number' && isNaN(parseFloat(value))) {
    throw ApiError.badRequest(`Setting "${key}" requires a numeric value.`);
  }
  if (value_type === 'boolean' && !['true', 'false'].includes(value.toLowerCase())) {
    throw ApiError.badRequest(`Setting "${key}" requires "true" or "false".`);
  }
  if (value_type === 'json') {
    try {
      JSON.parse(value);
    } catch {
      throw ApiError.badRequest(`Setting "${key}" requires a valid JSON string.`);
    }
  }

  const updated = await query(
    `UPDATE platform_settings
     SET value = $1, updated_by = $2, updated_at = NOW()
     WHERE key = $3
     RETURNING key, value, value_type, description, updated_at`,
    [value, adminId, key]
  );

  const row = updated.rows[0];
  let parsedValue = row.value;
  if (row.value_type === 'number')       parsedValue = parseFloat(row.value);
  else if (row.value_type === 'boolean') parsedValue = row.value === 'true';

  return {
    key: row.key,
    value: row.value,
    parsedValue,
    valueType: row.value_type,
    description: row.description,
    updatedAt: row.updated_at
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  listUsers,
  getUserDetail,
  suspendUser,
  reactivateUser,
  listPostsAdmin,
  hidePost,
  restorePost,
  listReports,
  resolveReport,
  dismissReport,
  listDisputes,
  getDisputeDetail,
  resolveDispute,
  releasePaymentAdmin,
  refundPaymentAdmin,
  getPlatformSettings,
  updatePlatformSetting
};
