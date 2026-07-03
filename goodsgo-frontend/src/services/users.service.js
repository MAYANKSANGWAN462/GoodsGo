import { api, unwrapResponse } from './api';

/**
 * Fetch the authenticated user's full profile.
 * @returns {Promise<object>} Full user object
 */
export async function getMe() {
  const res = await api.get('/users/me');
  return unwrapResponse(res).data;
}

/**
 * Update the authenticated user's profile fields.
 * At least one field must be provided (backend enforced).
 * @param {{ full_name?: string, phone?: string, bio?: string, city?: string, state?: string, country?: string }} body
 * @returns {Promise<object>} Updated user object
 */
export async function updateProfile(body) {
  const res = await api.put('/users/me', body);
  return unwrapResponse(res).data;
}

/**
 * Change the authenticated user's password.
 * The backend revokes all sessions on success — caller must log out.
 * @param {{ currentPassword: string, newPassword: string }} body
 * @returns {Promise<void>}
 */
export async function changePassword(body) {
  await api.put('/users/me/password', body);
}

/**
 * Upload a new avatar image for the authenticated user.
 * @param {FormData} formData - Contains field 'avatar' (JPEG/PNG/WebP, max 5 MB)
 * @returns {Promise<object>} Updated user object with new profileImageUrl
 */
export async function uploadAvatar(formData) {
  const res = await api.post('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapResponse(res).data;
}

/**
 * Remove the authenticated user's avatar, reverting to initials display.
 * @returns {Promise<void>}
 */
export async function removeAvatar() {
  await api.delete('/users/me/avatar');
}

/**
 * Fetch a public user profile by ID.
 * Returns 404 for suspended or deleted users (backend conceals suspension).
 * @param {string} userId
 * @returns {Promise<object>} Public user profile
 */
export async function getPublicProfile(userId) {
  const res = await api.get(`/users/${userId}`);
  return unwrapResponse(res).data;
}

/**
 * Deactivate the authenticated user's account.
 * Also deactivates all active posts. Caller must log out on success.
 * @returns {Promise<void>}
 */
export async function deactivateAccount() {
  await api.delete('/users/me');
}
