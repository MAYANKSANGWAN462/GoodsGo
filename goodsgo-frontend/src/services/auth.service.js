import { api, unwrapResponse } from './api';

/**
 * Register a new user account.
 * @param {{ fullName: string, email: string, password: string, phone?: string }} payload
 * @returns {Promise<{ data: null }>}
 */
export async function register(payload) {
  const res = await api.post('/auth/register', payload);
  return unwrapResponse(res);
}

/**
 * Log in with email and password.
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<{ data: { accessToken: string, user: object } }>}
 */
export async function login(payload) {
  const res = await api.post('/auth/login', payload);
  return unwrapResponse(res);
}

/**
 * Log out the current user. Clears the httpOnly refresh cookie on the backend.
 * @returns {Promise<void>}
 */
export async function logout() {
  await api.post('/auth/logout');
}

/**
 * Silently refresh the access token using the httpOnly refresh cookie.
 * @returns {Promise<{ data: { accessToken: string, user: object } }>}
 */
export async function refreshToken() {
  const res = await api.post('/auth/refresh-token');
  return unwrapResponse(res);
}

/**
 * Request a password reset email.
 * @param {{ email: string }} payload
 * @returns {Promise<void>}
 */
export async function forgotPassword(payload) {
  await api.post('/auth/forgot-password', payload);
}

/**
 * Complete a password reset using the token from the reset email.
 * @param {{ token: string, password: string }} payload
 * @returns {Promise<void>}
 */
export async function resetPassword(payload) {
  await api.post('/auth/reset-password', payload);
}

/**
 * Verify an email address using the token from the verification email.
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function verifyEmail(token) {
  await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

/**
 * Resend the email verification link.
 * @param {{ email: string }} payload
 * @returns {Promise<void>}
 */
export async function resendVerification(payload) {
  await api.post('/auth/resend-verification', payload);
}
