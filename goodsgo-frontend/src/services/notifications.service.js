import { api, unwrapResponse } from './api';

function cleanParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
}

/**
 * Fetch the authenticated user's notifications with optional pagination.
 * @param {{ page?: number, limit?: number }} filters
 * @returns {Promise<{ data: Array, meta: object }>} data = notification array; meta includes unreadCount
 */
export async function listNotifications(filters = {}) {
  const res = await api.get('/users/me/notifications', { params: cleanParams(filters) });
  return unwrapResponse(res);
}

/**
 * Mark a single notification as read.
 * @param {string} notificationId
 * @returns {Promise<object>} Updated notification
 */
export async function markOneRead(notificationId) {
  const res = await api.put(`/users/me/notifications/${notificationId}/read`);
  return unwrapResponse(res).data;
}

/**
 * Mark all of the authenticated user's notifications as read.
 * @returns {Promise<object>}
 */
export async function markAllRead() {
  const res = await api.put('/users/me/notifications/read-all');
  return unwrapResponse(res).data;
}
