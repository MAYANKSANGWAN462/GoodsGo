'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse  = require('../../utils/ApiResponse');
const adminService = require('./admin.service');
const { HTTP_STATUS } = require('../../utils/constants');

// ─── User Management ──────────────────────────────────────────────────────────

/**
 * listUsers — GET /admin/users
 * Query params are Joi-coerced to their final types by validate() before this runs.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const listUsers = asyncHandler(async (req, res) => {
  const { q, is_active, is_email_verified, page, limit } = req.query;
  const result = await adminService.listUsers(
    { q, is_active, is_email_verified },
    { page, limit }
  );
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Users retrieved successfully.', result.users, result.meta)
  );
});

/**
 * getUserDetail — GET /admin/users/:userId
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getUserDetail = asyncHandler(async (req, res) => {
  const user = await adminService.getUserDetail(req.params.userId);
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'User details retrieved successfully.', user)
  );
});

/**
 * suspendUser — PUT /admin/users/:userId/suspend
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const suspendUser = asyncHandler(async (req, res) => {
  const user = await adminService.suspendUser(
    req.params.userId,
    req.body.reason,
    req.admin.id
  );
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'User suspended successfully.', user)
  );
});

/**
 * reactivateUser — PUT /admin/users/:userId/reactivate
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const reactivateUser = asyncHandler(async (req, res) => {
  const user = await adminService.reactivateUser(req.params.userId, req.admin.id);
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'User reactivated successfully.', user)
  );
});

// ─── Post Moderation ──────────────────────────────────────────────────────────

/**
 * listPostsAdmin — GET /admin/posts
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const listPostsAdmin = asyncHandler(async (req, res) => {
  const { status, type, reported, page, limit } = req.query;
  const result = await adminService.listPostsAdmin(
    { status, type, reported },
    { page, limit }
  );
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Posts retrieved successfully.', result.posts, result.meta)
  );
});

/**
 * hidePost — PUT /admin/posts/:postId/hide
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const hidePost = asyncHandler(async (req, res) => {
  const post = await adminService.hidePost(req.params.postId, req.admin.id);
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Post hidden successfully.', post)
  );
});

/**
 * restorePost — PUT /admin/posts/:postId/restore
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const restorePost = asyncHandler(async (req, res) => {
  const post = await adminService.restorePost(req.params.postId, req.admin.id);
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Post restored successfully.', post)
  );
});

// ─── Report Management ────────────────────────────────────────────────────────

/**
 * listReports — GET /admin/reports
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const listReports = asyncHandler(async (req, res) => {
  const { status, reason, page, limit } = req.query;
  const result = await adminService.listReports({ status, reason }, { page, limit });
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Reports retrieved successfully.', result.reports, result.meta)
  );
});

/**
 * resolveReport — PUT /admin/reports/:reportId/resolve
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const resolveReport = asyncHandler(async (req, res) => {
  const report = await adminService.resolveReport(
    req.params.reportId,
    req.admin.id,
    req.body.admin_notes
  );
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Report resolved successfully.', report)
  );
});

/**
 * dismissReport — PUT /admin/reports/:reportId/dismiss
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const dismissReport = asyncHandler(async (req, res) => {
  const report = await adminService.dismissReport(
    req.params.reportId,
    req.admin.id,
    req.body.admin_notes || null
  );
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Report dismissed successfully.', report)
  );
});

// ─── Dispute Resolution ───────────────────────────────────────────────────────

/**
 * listDisputes — GET /admin/disputes
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const listDisputes = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await adminService.listDisputes({ status }, { page, limit });
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Disputes retrieved successfully.', result.disputes, result.meta)
  );
});

/**
 * getDisputeDetail — GET /admin/disputes/:disputeId
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getDisputeDetail = asyncHandler(async (req, res) => {
  const dispute = await adminService.getDisputeDetail(req.params.disputeId);
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Dispute retrieved successfully.', dispute)
  );
});

/**
 * resolveDispute — PUT /admin/disputes/:disputeId/resolve
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const resolveDispute = asyncHandler(async (req, res) => {
  const dispute = await adminService.resolveDispute(
    req.params.disputeId,
    req.body.status,
    req.body.admin_notes,
    req.admin.id
  );
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Dispute updated successfully.', dispute)
  );
});

// ─── Payment Actions ──────────────────────────────────────────────────────────

/**
 * releasePayment — POST /admin/payments/:bookingId/release
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const releasePayment = asyncHandler(async (req, res) => {
  const result = await adminService.releasePaymentAdmin(req.params.bookingId, req.admin.id);
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Payment released successfully.', result)
  );
});

/**
 * refundPayment — POST /admin/payments/:bookingId/refund
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const refundPayment = asyncHandler(async (req, res) => {
  const result = await adminService.refundPaymentAdmin(
    req.params.bookingId,
    req.body.amount,
    req.body.reason,
    req.admin.id
  );
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Payment refunded successfully.', result)
  );
});

// ─── Platform Settings ────────────────────────────────────────────────────────

/**
 * getPlatformSettings — GET /admin/settings
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getPlatformSettings = asyncHandler(async (req, res) => {
  const settings = await adminService.getPlatformSettings();
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Platform settings retrieved successfully.', settings)
  );
});

/**
 * updatePlatformSetting — PUT /admin/settings/:key
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updatePlatformSetting = asyncHandler(async (req, res) => {
  const setting = await adminService.updatePlatformSetting(
    req.params.key,
    req.body.value,
    req.admin.id
  );
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, 'Platform setting updated successfully.', setting)
  );
});

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
  releasePayment,
  refundPayment,
  getPlatformSettings,
  updatePlatformSetting
};
