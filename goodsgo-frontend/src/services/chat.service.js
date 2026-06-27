import { api, unwrapResponse } from './api';

/**
 * Fetch the authenticated user's conversations (with last message preview and participant info).
 * @returns {Promise<{ data: Array, meta: object }>}
 */
export async function getConversations() {
  const res = await api.get('/chat');
  return unwrapResponse(res);
}

/**
 * Fetch a single conversation's header details.
 * @param {string} conversationId
 * @returns {Promise<object>} Conversation object
 */
export async function getConversationById(conversationId) {
  const res = await api.get(`/chat/${conversationId}`);
  return unwrapResponse(res).data;
}

/**
 * Fetch paginated messages for a conversation (newest-first).
 * @param {string} conversationId
 * @param {{ page?: number, limit?: number }} params
 * @returns {Promise<{ data: Array, meta: object }>}
 */
export async function getMessages(conversationId, params = {}) {
  const res = await api.get(`/chat/${conversationId}/messages`, { params });
  return unwrapResponse(res);
}

/**
 * Send a text message to a conversation.
 * @param {string} conversationId
 * @param {string} content
 * @returns {Promise<object>} Created message object
 */
export async function sendMessage(conversationId, content) {
  const res = await api.post(`/chat/${conversationId}/messages`, { content });
  return unwrapResponse(res).data;
}

/**
 * Send an image message to a conversation.
 * @param {string} conversationId
 * @param {File} imageFile - The image file to upload (field name: 'image')
 * @returns {Promise<object>} Created message object
 */
export async function sendImageMessage(conversationId, imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  const res = await api.post(`/chat/${conversationId}/messages/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapResponse(res).data;
}
