import { api, unwrapResponse } from './api';

/** Strip empty/null/undefined values from a filter object before sending as query params. */
function cleanParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
}

/**
 * Create a new post. Sends multipart/form-data.
 * @param {FormData} formData - Post fields + up to 5 image files (field name: 'images')
 * @returns {Promise<object>} Created post object
 */
export async function createPost(formData) {
  const res = await api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapResponse(res).data;
}

/**
 * Update an existing post. Sends multipart/form-data.
 * @param {string} postId
 * @param {FormData} formData - Updatable fields + optional new images
 * @returns {Promise<object>} Updated post object
 */
export async function updatePost(postId, formData) {
  const res = await api.put(`/posts/${postId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapResponse(res).data;
}

/**
 * Permanently delete a post. Owner-only, enforced by backend.
 * @param {string} postId
 * @returns {Promise<void>}
 */
export async function deletePost(postId) {
  await api.delete(`/posts/${postId}`);
}

/**
 * Toggle a post's visibility between active and inactive.
 * @param {string} postId
 * @param {'active'|'inactive'} status
 * @returns {Promise<object>} Updated post object
 */
export async function updatePostStatus(postId, status) {
  const res = await api.put(`/posts/${postId}/status`, { status });
  return unwrapResponse(res).data;
}

/**
 * Fetch the marketplace post feed with optional filters.
 * @param {object} [filters] - Query params: post_type, vehicle_type, goods_category,
 *   origin_city, destination_city, date_from, date_to, min_price, max_price,
 *   lat, lng, radius_km, sort_by, sort_order, page, limit, q
 * @returns {Promise<{ data: Array, meta: { total, page, limit, totalPages } }>}
 */
export async function getFeed(filters = {}) {
  const res = await api.get('/posts', { params: cleanParams(filters) });
  return unwrapResponse(res);
}

/**
 * Fetch a single post by ID.
 * @param {string} postId
 * @returns {Promise<object>} Post object including images, owner, isSaved
 */
export async function getPostById(postId) {
  const res = await api.get(`/posts/${postId}`);
  return unwrapResponse(res).data;
}

/**
 * Toggle the saved state of a post for the authenticated user.
 * @param {string} postId
 * @returns {Promise<object>}
 */
export async function toggleSave(postId) {
  const res = await api.post(`/posts/${postId}/save`);
  return unwrapResponse(res).data;
}

/**
 * Report a post for moderation.
 * @param {string} postId
 * @param {{ reason: string, description?: string }} body
 * @returns {Promise<object>}
 */
export async function reportPost(postId, body) {
  const res = await api.post(`/posts/${postId}/report`, body);
  return unwrapResponse(res).data;
}

/**
 * Fetch the authenticated user's own posts.
 * @param {object} [filters] - Query params: status, page, limit
 * @returns {Promise<{ data: Array, meta: object }>}
 */
export async function getMyPosts(filters = {}) {
  const res = await api.get('/users/me/posts', { params: cleanParams(filters) });
  return unwrapResponse(res);
}

/**
 * Fetch the authenticated user's saved posts.
 * @returns {Promise<{ data: Array, meta: object }>}
 */
export async function getSavedPosts() {
  const res = await api.get('/users/me/saved-posts');
  return unwrapResponse(res);
}
