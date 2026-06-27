import { api, unwrapResponse } from './api';

/**
 * Fetch paginated reviews for a specific user (as reviewee).
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} [filters]
 * @returns {Promise<{ data: Array, meta: object }>}
 */
export async function getUserReviews(userId, filters = {}) {
  const res = await api.get(`/reviews/users/${userId}`, { params: filters });
  return unwrapResponse(res);
}

/**
 * Fetch reviews written by the authenticated user.
 * @returns {Promise<{ data: Array, meta: object }>}
 */
export async function getMyReviews() {
  const res = await api.get('/users/me/reviews');
  return unwrapResponse(res);
}

/**
 * Delete a review written by the authenticated user.
 * Only permitted within the backend's edit window.
 * @param {string} reviewId
 * @returns {Promise<void>}
 */
export async function deleteReview(reviewId) {
  await api.delete(`/reviews/${reviewId}`);
}
