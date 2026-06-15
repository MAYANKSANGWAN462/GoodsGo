'use strict';

const { verifyAccessToken } = require('../utils/generateTokens');
const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');

// ─── Database User Lookup ─────────────────────────────────────────────────────

/**
 * fetchActiveUser — Fetches a user from the database and validates account status.
 *
 * Why hit the database on every request?
 *   A JWT is self-contained — once issued, it's valid until expiry (15 min).
 *   If a user is suspended or deleted AFTER their token was issued, a pure-JWT
 *   approach would let them continue acting for up to 15 minutes.
 *   This DB check closes that window.
 *
 *   Performance note: The users table has an index on `id` (PRIMARY KEY).
 *   This query is a single primary-key lookup — effectively O(1) in PostgreSQL.
 *   At MVP scale this adds ~1-3ms. If this becomes a bottleneck at scale,
 *   add Redis caching with a 5-minute TTL (invalidate on suspend/delete).
 *
 * @param {string} userId - UUID from JWT payload
 * @returns {Promise<Object>} User record
 * @throws {ApiError} 401 if not found, 403 if suspended/deactivated
 */
async function fetchActiveUser(userId) {
  const result = await query(
    `SELECT
       id,
       email,
       full_name,
       profile_image_url,
       is_email_verified,
       is_identity_verified,
       is_active,
       suspended_at,
       suspension_reason,
       deleted_at,
       rating,
       total_reviews
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.unauthorized(
      'Authentication failed. User account not found. Please log in again.'
    );
  }

  const user = result.rows[0];

  // Soft-deleted account
  if (user.deleted_at) {
    throw ApiError.unauthorized(
      'This account has been deactivated. Please contact support if you believe this is an error.'
    );
  }

  // Suspended account (is_active = false OR suspended_at is set)
  if (!user.is_active || user.suspended_at) {
    throw new ApiError(
      403,
      'Your account has been suspended. Please contact GoodsGo support for assistance.',
      null,
      'ACCOUNT_SUSPENDED'
    );
  }

  return user;
}

/**
 * buildUserObject — Shapes the database row into the req.user object.
 * Only include fields needed by route handlers — never expose sensitive data.
 *
 * @param {Object} dbUser - Row from users table
 * @returns {Object} Safe user object attached to req.user
 */
function buildUserObject(dbUser) {
  return {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.full_name,
    profileImageUrl: dbUser.profile_image_url,
    isEmailVerified: dbUser.is_email_verified,
    isIdentityVerified: dbUser.is_identity_verified,
    rating: parseFloat(dbUser.rating) || 0,
    totalReviews: dbUser.total_reviews || 0
  };
}

// ─── Middleware Exports ────────────────────────────────────────────────────────

/**
 * authenticate — Requires a valid JWT. Blocks the request if not authenticated.
 *
 * Token location: Authorization header — "Bearer <access_token>"
 * The access_token is the JWT returned by POST /auth/login.
 * The refresh token (in httpOnly cookie) is NOT used here.
 *
 * On success: attaches req.user = { id, email, fullName, ... }
 * On failure: calls next(ApiError.unauthorized(...))
 *
 * Usage:
 *   router.post('/posts', authenticate, requireEmailVerified, asyncHandler(postController.create));
 *   router.get('/users/me', authenticate, asyncHandler(userController.getMe));
 */
const authenticate = async (req, res, next) => {
  try {
    // ── Step 1: Extract token from Authorization header ──────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw ApiError.unauthorized(
        'Authentication required. Please include an Authorization header with a Bearer token.'
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized(
        'Invalid Authorization header format. Expected: "Bearer <token>".'
      );
    }

    const token = authHeader.slice(7).trim();

    if (!token || token === 'null' || token === 'undefined') {
      throw ApiError.unauthorized('Authentication token is missing.');
    }

    // ── Step 2: Verify JWT signature and expiry ──────────────────────────────
    // verifyAccessToken throws JsonWebTokenError / TokenExpiredError on failure.
    // These are caught by errorHandler.middleware.js and returned as 401.
    const decoded = verifyAccessToken(token);

    // ── Step 3: Confirm this is a user token (not an admin token) ────────────
    // Admin tokens have role: 'admin' and are signed with JWT_ADMIN_SECRET.
    // An admin token passed to verifyAccessToken (which uses JWT_SECRET) would
    // fail step 2 already, but this is a belt-and-suspenders check.
    if (decoded.role !== 'user') {
      throw ApiError.forbidden(
        'Access denied. This endpoint requires a user authentication token.'
      );
    }

    // ── Step 4: Validate user account status in database ─────────────────────
    const dbUser = await fetchActiveUser(decoded.id);

    // ── Step 5: Attach user to request ───────────────────────────────────────
    req.user = buildUserObject(dbUser);

    next();
  } catch (err) {
    // Forward ALL errors to the global error handler (including JWT errors)
    next(err);
  }
};

/**
 * optionalAuth — Attaches user to req.user if a valid token is present.
 * Continues the request chain even if no token / invalid token is provided.
 *
 * Use for public endpoints that show enriched data when logged in:
 *   - Marketplace feed: shows "saved" indicator if user is logged in
 *   - Post detail: shows "book now" button if logged in
 *   - User profile: shows "send message" if logged in
 *
 * On valid token: req.user = { id, email, ... }
 * On no/invalid token: req.user = null — route handler must check for null
 *
 * Usage:
 *   router.get('/posts', optionalAuth, asyncHandler(postController.getAll));
 *   router.get('/posts/:postId', optionalAuth, asyncHandler(postController.getOne));
 */
const optionalAuth = async (req, res, next) => {
  req.user = null; // Set default — route handler can check req.user !== null

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token — continue as unauthenticated
    }

    const token = authHeader.slice(7).trim();

    if (!token || token === 'null' || token === 'undefined') {
      return next();
    }

    const decoded = verifyAccessToken(token);

    if (decoded.role !== 'user') {
      return next(); // Not a user token — continue unauthenticated
    }

    const dbUser = await fetchActiveUser(decoded.id);
    req.user = buildUserObject(dbUser);

    next();
  } catch {
    // Any error (expired, invalid, DB error) → treat as unauthenticated
    // Never fail the request for optionalAuth — just continue without user
    req.user = null;
    next();
  }
};

/**
 * requireEmailVerified — Ensures the authenticated user has verified their email.
 *
 * Must be used AFTER authenticate (which sets req.user).
 *
 * Applied to actions that should not be available to unverified accounts:
 *   - Creating posts
 *   - Sending booking requests
 *   - Writing reviews
 *   - Initiating payments
 *
 * Usage:
 *   router.post('/posts',
 *     authenticate,
 *     requireEmailVerified,  ← placed after authenticate
 *     asyncHandler(postController.create)
 *   );
 */
const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required.'));
  }

  if (!req.user.isEmailVerified) {
    return next(
      new ApiError(
        403,
        'Please verify your email address before performing this action. ' +
        'Check your inbox for a verification link, or request a new one.',
        null,
        'EMAIL_NOT_VERIFIED'
      )
    );
  }

  next();
};

module.exports = { authenticate, optionalAuth, requireEmailVerified };