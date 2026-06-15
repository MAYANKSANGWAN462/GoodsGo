'use strict';

const { verifyAdminToken } = require('../utils/generateTokens');
const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { ADMIN_ROLES } = require('../utils/constants');

// ─── Role Hierarchy ───────────────────────────────────────────────────────────
// Numeric levels allow simple >= comparison for permission checks.
// super_admin (3) can do everything admin (2) and moderator (1) can.
// admin (2) can do everything moderator (1) can.
// This means requireAdminRole(ADMIN_ROLES.ADMIN) also allows super_admin.

const ROLE_LEVEL = {
  [ADMIN_ROLES.SUPER_ADMIN]: 3,
  [ADMIN_ROLES.ADMIN]: 2,
  [ADMIN_ROLES.MODERATOR]: 1
};

// ─── Database Admin Lookup ────────────────────────────────────────────────────

/**
 * fetchActiveAdmin — Fetches an admin from the admin_users table.
 * Validates the admin account is still active.
 *
 * Admin accounts are in a completely separate table from regular users.
 * An admin_users row cannot be accessed via the user auth path, and a
 * users row cannot be accessed via the admin auth path.
 *
 * @param {string} adminId - UUID from admin JWT payload
 * @returns {Promise<Object>} Admin record
 * @throws {ApiError} 401 if not found, 403 if deactivated
 */
async function fetchActiveAdmin(adminId) {
  const result = await query(
    `SELECT
       id,
       email,
       full_name,
       role,
       is_active,
       last_login_at
     FROM admin_users
     WHERE id = $1`,
    [adminId]
  );

  if (result.rows.length === 0) {
    throw ApiError.unauthorized(
      'Admin account not found. Please contact your system administrator.'
    );
  }

  const admin = result.rows[0];

  if (!admin.is_active) {
    throw ApiError.forbidden(
      'This admin account has been deactivated. Please contact your system administrator.'
    );
  }

  return admin;
}

// ─── Middleware Exports ───────────────────────────────────────────────────────

/**
 * authenticateAdmin — Verifies an admin JWT and attaches the admin to req.admin.
 *
 * Must be the first middleware on every /admin/* route.
 * Uses JWT_ADMIN_SECRET — NOT JWT_SECRET.
 *
 * Key differences from authenticate (user):
 *   - Different JWT secret (JWT_ADMIN_SECRET)
 *   - Queries admin_users table (not users)
 *   - Attaches to req.admin (not req.user)
 *   - Token payload contains adminRole field
 *
 * On success: req.admin = { id, email, fullName, adminRole }
 * On failure: next(ApiError) → 401 or 403
 *
 * Usage:
 *   router.get('/admin/users', authenticateAdmin, asyncHandler(adminController.listUsers));
 *   router.delete('/admin/users/:id', authenticateAdmin, requireAdminRole(ADMIN_ROLES.SUPER_ADMIN), handler);
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // ── Step 1: Extract token ─────────────────────────────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw ApiError.unauthorized(
        'Admin authentication required. Please include an Authorization header.'
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized(
        'Invalid Authorization header format. Expected: "Bearer <admin_token>".'
      );
    }

    const token = authHeader.slice(7).trim();

    if (!token || token === 'null' || token === 'undefined') {
      throw ApiError.unauthorized('Admin authentication token is missing.');
    }

    // ── Step 2: Verify JWT with ADMIN secret ──────────────────────────────────
    // verifyAdminToken uses JWT_ADMIN_SECRET.
    // A user token signed with JWT_SECRET will throw JsonWebTokenError here
    // because the signature doesn't match. This is the primary security boundary.
    const decoded = verifyAdminToken(token);

    // ── Step 3: Confirm role in payload ───────────────────────────────────────
    // Belt-and-suspenders: even if somehow a non-admin token passed step 2
    // (impossible with different secrets, but defensive programming), this check
    // ensures the token explicitly declares role: 'admin'.
    if (decoded.role !== 'admin') {
      throw ApiError.forbidden(
        'Access denied. This endpoint requires an admin authentication token. ' +
        'User tokens cannot access admin routes.'
      );
    }

    // ── Step 4: Validate admin account in database ────────────────────────────
    const dbAdmin = await fetchActiveAdmin(decoded.id);

    // ── Step 5: Attach admin to request ──────────────────────────────────────
    req.admin = {
      id: dbAdmin.id,
      email: dbAdmin.email,
      fullName: dbAdmin.full_name,
      adminRole: dbAdmin.role,        // 'super_admin' | 'admin' | 'moderator'
      roleLevel: ROLE_LEVEL[dbAdmin.role] || 0  // Numeric level for quick comparisons
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * requireAdminRole — Checks that the authenticated admin has sufficient role level.
 *
 * Must be used AFTER authenticateAdmin (which populates req.admin).
 * Uses the ROLE_LEVEL hierarchy — higher roles automatically pass lower-role checks.
 *
 * @param {string} requiredRole - Minimum required role from ADMIN_ROLES constant
 * @returns {import('express').RequestHandler}
 *
 * Examples:
 *   // Any admin (moderator, admin, super_admin) can view reports
 *   router.get('/reports', authenticateAdmin, requireAdminRole(ADMIN_ROLES.MODERATOR), handler);
 *
 *   // Only admin or super_admin can suspend users
 *   router.put('/users/:id/suspend', authenticateAdmin, requireAdminRole(ADMIN_ROLES.ADMIN), handler);
 *
 *   // Only super_admin can delete accounts or change platform settings
 *   router.delete('/users/:id', authenticateAdmin, requireAdminRole(ADMIN_ROLES.SUPER_ADMIN), handler);
 */
const requireAdminRole = (requiredRole) => {
  // Validate that requiredRole is a known admin role
  if (!ROLE_LEVEL[requiredRole]) {
    throw new Error(
      `requireAdminRole: Unknown role "${requiredRole}". ` +
      `Must be one of: ${Object.keys(ROLE_LEVEL).join(', ')}`
    );
  }

  return (req, res, next) => {
    if (!req.admin) {
      return next(ApiError.unauthorized('Admin authentication required.'));
    }

    const adminLevel = req.admin.roleLevel || 0;
    const requiredLevel = ROLE_LEVEL[requiredRole] || 0;

    if (adminLevel < requiredLevel) {
      return next(
        ApiError.forbidden(
          `This action requires "${requiredRole}" role or higher. ` +
          `Your current role is "${req.admin.adminRole}".`
        )
      );
    }

    next();
  };
};

/**
 * logAdminAction — Middleware that records admin actions to admin_audit_logs.
 *
 * Place AFTER the route handler has executed its action and sent a response.
 * Note: This is a fire-and-forget logger — it does NOT block the response.
 *
 * BLOCK O: This middleware is wired into admin routes when admin.routes.js
 * is generated. It requires the admin_audit_logs table from migration 022.
 *
 * @param {string} actionType - Human-readable action name (e.g. 'suspend_user')
 * @param {string} targetType - Entity type (e.g. 'user', 'post', 'booking')
 * @returns {import('express').RequestHandler}
 */
const logAdminAction = (actionType, targetType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept the response
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      // Log only successful actions (2xx responses)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.admin) {
        try {
          const targetId = req.params.id ||
                           req.params.userId ||
                           req.params.postId ||
                           req.params.bookingId ||
                           null;

          await query(
            `INSERT INTO admin_audit_logs
               (admin_id, action_type, target_type, target_id, ip_address, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
              req.admin.id,
              actionType,
              targetType,
              targetId,
              req.ip
            ]
          );
        } catch (logErr) {
          // Never let audit log failure affect the response
          console.error('[AdminAudit] Failed to log action:', logErr.message);
        }
      }

      return originalJson(body);
    };

    next();
  };
};

module.exports = { authenticateAdmin, requireAdminRole, logAdminAction };