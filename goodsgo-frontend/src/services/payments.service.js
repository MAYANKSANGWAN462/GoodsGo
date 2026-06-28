import { api, unwrapResponse } from './api';

/**
 * Creates a Razorpay order for an accepted booking.
 * Only the booking's requester may call this; only accepted bookings within
 * their payment deadline are eligible.
 *
 * @param {string} bookingId
 * @returns {Promise<{ data: { orderId: string, amount: number, currency: string, key: string, paymentRowId: string }, meta: null }>}
 */
export async function initiatePayment(bookingId) {
  const res = await api.post('/payments/initiate', { bookingId });
  return unwrapResponse(res);
}

/**
 * Verifies the Razorpay HMAC-SHA256 signature returned by the checkout modal
 * and marks the payment as completed in the backend.
 *
 * @param {{ bookingId: string, orderId: string, paymentId: string, signature: string }} body
 * @returns {Promise<{ data: object, meta: null }>}
 */
export async function verifyPayment({ bookingId, orderId, paymentId, signature }) {
  const res = await api.post('/payments/verify', { bookingId, orderId, paymentId, signature });
  return unwrapResponse(res);
}
