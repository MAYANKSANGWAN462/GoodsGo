import { api, unwrapResponse } from './api';

/** Strip empty/null/undefined values from a filter object before sending as query params. */
function cleanParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
}

/**
 * Create a new booking request.
 * @param {{ postId: string, pickupAddress: string, destinationAddress: string,
 *   scheduledDate: string, goodsDescription: string, specialInstructions?: string }} body
 * @returns {Promise<object>} Created booking object
 */
export async function createBooking(body) {
  const res = await api.post('/bookings', body);
  return unwrapResponse(res).data;
}

/**
 * Fetch the authenticated user's bookings (as requester or post owner).
 * @param {{ role?: 'requester'|'owner', status?: string, page?: number, limit?: number }} filters
 * @returns {Promise<{ data: Array, meta: object }>}
 */
export async function getBookings(filters = {}) {
  const res = await api.get('/bookings', { params: cleanParams(filters) });
  return unwrapResponse(res);
}

/**
 * Fetch a single booking by ID. Only accessible by booking parties.
 * @param {string} bookingId
 * @returns {Promise<object>} Full booking object
 */
export async function getBookingById(bookingId) {
  const res = await api.get(`/bookings/${bookingId}`);
  return unwrapResponse(res).data;
}

/**
 * Accept a booking request (post owner only).
 * @param {string} bookingId
 * @param {{ agreedPrice: number }} body
 * @returns {Promise<object>} Updated booking object
 */
export async function acceptBooking(bookingId, body) {
  const res = await api.put(`/bookings/${bookingId}/accept`, body);
  return unwrapResponse(res).data;
}

/**
 * Reject a booking request (post owner only).
 * @param {string} bookingId
 * @param {{ reason?: string }} body
 * @returns {Promise<object>} Updated booking object
 */
export async function rejectBooking(bookingId, body = {}) {
  const res = await api.put(`/bookings/${bookingId}/reject`, body);
  return unwrapResponse(res).data;
}

/**
 * Withdraw a pending booking request (requester only).
 * @param {string} bookingId
 * @returns {Promise<object>} Updated booking object
 */
export async function withdrawBooking(bookingId) {
  const res = await api.put(`/bookings/${bookingId}/withdraw`);
  return unwrapResponse(res).data;
}

/**
 * Cancel an accepted or in-progress booking (either party).
 * @param {string} bookingId
 * @param {{ reason: string }} body - Min 5 characters
 * @returns {Promise<object>} Updated booking object
 */
export async function cancelBooking(bookingId, body) {
  const res = await api.put(`/bookings/${bookingId}/cancel`, body);
  return unwrapResponse(res).data;
}

/**
 * Mark a booking as in-progress (post owner only, accepted status).
 * @param {string} bookingId
 * @returns {Promise<object>} Updated booking object
 */
export async function markInProgress(bookingId) {
  const res = await api.put(`/bookings/${bookingId}/mark-in-progress`);
  return unwrapResponse(res).data;
}

/**
 * Mark a booking as completed (post owner only, in_progress status).
 * @param {string} bookingId
 * @returns {Promise<object>} Updated booking object
 */
export async function completeBooking(bookingId) {
  const res = await api.put(`/bookings/${bookingId}/complete`);
  return unwrapResponse(res).data;
}

/**
 * File a dispute on a booking (either party, in_progress or completed status).
 * @param {string} bookingId
 * @param {{ reason: string, description: string, evidenceUrls?: string[] }} body
 * @returns {Promise<object>} Updated booking object
 */
export async function disputeBooking(bookingId, body) {
  const res = await api.put(`/bookings/${bookingId}/dispute`, body);
  return unwrapResponse(res).data;
}

/**
 * Fetch the status transition history for a booking.
 * @param {string} bookingId
 * @returns {Promise<Array>} Array of history entries
 */
export async function getBookingHistory(bookingId) {
  const res = await api.get(`/bookings/${bookingId}/history`);
  return unwrapResponse(res).data;
}

/**
 * Fetch all booking requests for a specific post (post owner only).
 * Used by PostDetailPage to render the incoming requests panel.
 * @param {string} postId
 * @returns {Promise<{ data: Array, meta: object }>}
 */
export async function getPostBookings(postId) {
  const res = await api.get(`/posts/${postId}/bookings`);
  return unwrapResponse(res);
}
