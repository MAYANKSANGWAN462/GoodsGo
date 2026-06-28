import { api, adminApi, unwrapResponse } from './api';

// ── Admin Auth ──────────────────────────────────────────────────────────────

/**
 * adminLogin — POST /auth/admin/login
 * Returns { adminToken, admin } on success.
 * @param {string} email
 * @param {string} password
 */
export async function adminLogin(email, password) {
  const res = await api.post('/auth/admin/login', { email, password });
  return unwrapResponse(res);
}

// ── User Management ─────────────────────────────────────────────────────────

/**
 * getAdminUsers — GET /admin/users
 * @param {{ q?, is_active?, is_email_verified?, page?, limit? }} filters
 */
export async function getAdminUsers(filters = {}) {
  const res = await adminApi.get('/admin/users', { params: filters });
  return unwrapResponse(res);
}

/**
 * getAdminUser — GET /admin/users/:userId
 * @param {string} userId
 */
export async function getAdminUser(userId) {
  const res = await adminApi.get(`/admin/users/${userId}`);
  return unwrapResponse(res);
}

/**
 * suspendUser — PUT /admin/users/:userId/suspend
 * @param {string} userId
 * @param {string} reason
 */
export async function suspendUser(userId, reason) {
  const res = await adminApi.put(`/admin/users/${userId}/suspend`, { reason });
  return unwrapResponse(res);
}

/**
 * reactivateUser — PUT /admin/users/:userId/reactivate
 * @param {string} userId
 */
export async function reactivateUser(userId) {
  const res = await adminApi.put(`/admin/users/${userId}/reactivate`);
  return unwrapResponse(res);
}

// ── Post Moderation ─────────────────────────────────────────────────────────

/**
 * getAdminPosts — GET /admin/posts
 * @param {{ status?, type?, reported?, page?, limit? }} filters
 */
export async function getAdminPosts(filters = {}) {
  const res = await adminApi.get('/admin/posts', { params: filters });
  return unwrapResponse(res);
}

/**
 * hidePost — PUT /admin/posts/:postId/hide
 * @param {string} postId
 */
export async function hidePost(postId) {
  const res = await adminApi.put(`/admin/posts/${postId}/hide`);
  return unwrapResponse(res);
}

/**
 * restorePost — PUT /admin/posts/:postId/restore
 * @param {string} postId
 */
export async function restorePost(postId) {
  const res = await adminApi.put(`/admin/posts/${postId}/restore`);
  return unwrapResponse(res);
}

// ── Report Management ───────────────────────────────────────────────────────

/**
 * getAdminReports — GET /admin/reports
 * @param {{ status?, page?, limit? }} filters
 */
export async function getAdminReports(filters = {}) {
  const res = await adminApi.get('/admin/reports', { params: filters });
  return unwrapResponse(res);
}

/**
 * resolveReport — PUT /admin/reports/:reportId/resolve
 * @param {string} reportId
 * @param {{ adminNotes: string, action: string }} body
 */
export async function resolveReport(reportId, body) {
  const res = await adminApi.put(`/admin/reports/${reportId}/resolve`, body);
  return unwrapResponse(res);
}

/**
 * dismissReport — PUT /admin/reports/:reportId/dismiss
 * @param {string} reportId
 * @param {{ adminNotes: string }} body
 */
export async function dismissReport(reportId, body) {
  const res = await adminApi.put(`/admin/reports/${reportId}/dismiss`, body);
  return unwrapResponse(res);
}

// ── Dispute Management ──────────────────────────────────────────────────────

/**
 * getAdminDisputes — GET /admin/disputes
 * @param {{ status?, page?, limit? }} filters
 */
export async function getAdminDisputes(filters = {}) {
  const res = await adminApi.get('/admin/disputes', { params: filters });
  return unwrapResponse(res);
}

/**
 * resolveDispute — PUT /admin/disputes/:disputeId/resolve
 * @param {string} disputeId
 * @param {{ status: string, adminNotes: string }} body
 */
export async function resolveDispute(disputeId, body) {
  const res = await adminApi.put(`/admin/disputes/${disputeId}/resolve`, body);
  return unwrapResponse(res);
}

// ── Payment Actions ─────────────────────────────────────────────────────────

/**
 * releasePayment — POST /admin/payments/:bookingId/release
 * @param {string} bookingId
 */
export async function releasePayment(bookingId) {
  const res = await adminApi.post(`/admin/payments/${bookingId}/release`);
  return unwrapResponse(res);
}

/**
 * refundPayment — POST /admin/payments/:bookingId/refund
 * @param {string} bookingId
 * @param {{ amount: number, reason: string }} body
 */
export async function refundPayment(bookingId, body) {
  const res = await adminApi.post(`/admin/payments/${bookingId}/refund`, body);
  return unwrapResponse(res);
}

// ── Platform Settings ───────────────────────────────────────────────────────

/**
 * getAdminSettings — GET /admin/settings
 */
export async function getAdminSettings() {
  const res = await adminApi.get('/admin/settings');
  return unwrapResponse(res);
}
