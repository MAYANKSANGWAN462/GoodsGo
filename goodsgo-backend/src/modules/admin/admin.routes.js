'use strict';

const { Router } = require('express');
const { validate }                           = require('../../middleware/validate.middleware');
const { authenticateAdmin, requireAdminRole, logAdminAction } = require('../../middleware/adminAuth.middleware');
const { ADMIN_ROLES }                        = require('../../utils/constants');
const adminController                        = require('./admin.controller');
const {
  listUsersSchema,
  adminUserIdParamSchema,
  suspendUserSchema,
  listPostsAdminSchema,
  adminPostIdParamSchema,
  listReportsSchema,
  adminReportIdParamSchema,
  resolveReportSchema,
  dismissReportSchema,
  listDisputesSchema,
  adminDisputeIdParamSchema,
  resolveDisputeSchema,
  adminBookingIdParamSchema,
  refundPaymentSchema,
  settingKeyParamSchema,
  updateSettingSchema
} = require('./admin.validator');

const router = Router();

// All routes in this file require a valid admin JWT.
// authenticateAdmin verifies JWT_ADMIN_SECRET (not JWT_SECRET) and performs a
// live admin_users DB lookup — a regular-user token is cryptographically rejected.
router.use(authenticateAdmin);

// ─── User Management ─────────────────────────────────────────────────────────
// Requires admin role (level 2) or higher.
// Specific literal paths (/users) declared before parameterised (/users/:userId)
// to prevent Express greedily matching the literal string.

router.get(
  '/users',
  requireAdminRole(ADMIN_ROLES.ADMIN),
  validate(listUsersSchema, 'query'),
  adminController.listUsers
);

router.get(
  '/users/:userId',
  requireAdminRole(ADMIN_ROLES.ADMIN),
  validate(adminUserIdParamSchema, 'params'),
  adminController.getUserDetail
);

router.put(
  '/users/:userId/suspend',
  requireAdminRole(ADMIN_ROLES.ADMIN),
  logAdminAction('suspend_user', 'user'),
  validate(adminUserIdParamSchema, 'params'),
  validate(suspendUserSchema),
  adminController.suspendUser
);

router.put(
  '/users/:userId/reactivate',
  requireAdminRole(ADMIN_ROLES.ADMIN),
  logAdminAction('reactivate_user', 'user'),
  validate(adminUserIdParamSchema, 'params'),
  adminController.reactivateUser
);

// ─── Post Moderation ─────────────────────────────────────────────────────────
// Requires moderator role (level 1) or higher.

router.get(
  '/posts',
  requireAdminRole(ADMIN_ROLES.MODERATOR),
  validate(listPostsAdminSchema, 'query'),
  adminController.listPostsAdmin
);

router.put(
  '/posts/:postId/hide',
  requireAdminRole(ADMIN_ROLES.MODERATOR),
  logAdminAction('hide_post', 'post'),
  validate(adminPostIdParamSchema, 'params'),
  adminController.hidePost
);

router.put(
  '/posts/:postId/restore',
  requireAdminRole(ADMIN_ROLES.MODERATOR),
  logAdminAction('restore_post', 'post'),
  validate(adminPostIdParamSchema, 'params'),
  adminController.restorePost
);

// ─── Report Management ────────────────────────────────────────────────────────
// Requires moderator role (level 1) or higher.
// Note: logAdminAction records req.params.reportId as target_id = null because
// logAdminAction only extracts id/userId/postId/bookingId from params. This is
// an acceptable limitation — action_type + target_type still provide full context
// in the audit log.

router.get(
  '/reports',
  requireAdminRole(ADMIN_ROLES.MODERATOR),
  validate(listReportsSchema, 'query'),
  adminController.listReports
);

router.put(
  '/reports/:reportId/resolve',
  requireAdminRole(ADMIN_ROLES.MODERATOR),
  logAdminAction('resolve_report', 'reported_post'),
  validate(adminReportIdParamSchema, 'params'),
  validate(resolveReportSchema),
  adminController.resolveReport
);

router.put(
  '/reports/:reportId/dismiss',
  requireAdminRole(ADMIN_ROLES.MODERATOR),
  logAdminAction('dismiss_report', 'reported_post'),
  validate(adminReportIdParamSchema, 'params'),
  validate(dismissReportSchema),
  adminController.dismissReport
);

// ─── Dispute Resolution ───────────────────────────────────────────────────────
// Requires admin role (level 2) or higher.
// Literal /disputes declared before /disputes/:disputeId.

router.get(
  '/disputes',
  requireAdminRole(ADMIN_ROLES.ADMIN),
  validate(listDisputesSchema, 'query'),
  adminController.listDisputes
);

router.get(
  '/disputes/:disputeId',
  requireAdminRole(ADMIN_ROLES.ADMIN),
  validate(adminDisputeIdParamSchema, 'params'),
  adminController.getDisputeDetail
);

router.put(
  '/disputes/:disputeId/resolve',
  requireAdminRole(ADMIN_ROLES.ADMIN),
  logAdminAction('resolve_dispute', 'dispute'),
  validate(adminDisputeIdParamSchema, 'params'),
  validate(resolveDisputeSchema),
  adminController.resolveDispute
);

// ─── Payment Actions ──────────────────────────────────────────────────────────
// Requires admin role (level 2) or higher.
// These delegate to payments.service — no rate limiter needed (admin-only, closed set).

router.post(
  '/payments/:bookingId/release',
  requireAdminRole(ADMIN_ROLES.ADMIN),
  logAdminAction('release_payment', 'booking'),
  validate(adminBookingIdParamSchema, 'params'),
  adminController.releasePayment
);

router.post(
  '/payments/:bookingId/refund',
  requireAdminRole(ADMIN_ROLES.ADMIN),
  logAdminAction('refund_payment', 'booking'),
  validate(adminBookingIdParamSchema, 'params'),
  validate(refundPaymentSchema),
  adminController.refundPayment
);

// ─── Platform Settings ────────────────────────────────────────────────────────
// Requires super_admin role (level 3) only.
// Literal /settings declared before /settings/:key.

router.get(
  '/settings',
  requireAdminRole(ADMIN_ROLES.SUPER_ADMIN),
  adminController.getPlatformSettings
);

router.put(
  '/settings/:key',
  requireAdminRole(ADMIN_ROLES.SUPER_ADMIN),
  logAdminAction('update_setting', 'platform_setting'),
  validate(settingKeyParamSchema, 'params'),
  validate(updateSettingSchema),
  adminController.updatePlatformSetting
);

module.exports = router;
