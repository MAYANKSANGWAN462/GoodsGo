'use strict';

const authService  = require('./auth.service');
const ApiResponse  = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

// ─── register ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Body (validated by registerSchema): { email, password, full_name, phone? }
 */
const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);

  res.status(201).json(
    new ApiResponse(
      201,
      'Account created successfully. Please check your email to verify your account.',
      {
        id:       user.id,
        email:    user.email,
        fullName: user.full_name
      }
    )
  );
});

// ─── login ────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 * Body (validated by loginSchema): { email, password }
 * Sets httpOnly cookie: refresh_token
 */
const login = asyncHandler(async (req, res) => {
  // res is passed to service so it can set the httpOnly cookie
  const { accessToken, user } = await authService.login(req.body, res);

  res.status(200).json(
    new ApiResponse(200, 'Login successful.', { accessToken, user })
  );
});

// ─── logout ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/logout
 * No body required. Reads refresh_token from cookie.
 * Clears cookie and revokes token in DB.
 */
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req, res);

  res.status(200).json(
    new ApiResponse(200, 'Logged out successfully.')
  );
});

// ─── refreshToken ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/refresh-token
 * No body required. Reads refresh_token from httpOnly cookie.
 * Returns new access token + rotates cookie.
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { accessToken } = await authService.refreshAccessToken(req, res);

  res.status(200).json(
    new ApiResponse(200, 'Token refreshed successfully.', { accessToken })
  );
});

// ─── forgotPassword ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/forgot-password
 * Body (validated by forgotPasswordSchema): { email }
 * Always returns 200 to prevent email enumeration.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);

  res.status(200).json(
    new ApiResponse(
      200,
      'If an account exists with this email address, a password reset link has been sent.'
    )
  );
});

// ─── resetPassword ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/reset-password
 * Body (validated by resetPasswordSchema): { token, password }
 */
const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);

  res.status(200).json(
    new ApiResponse(
      200,
      'Password reset successfully. Please log in with your new password.'
    )
  );
});

// ─── verifyEmail ──────────────────────────────────────────────────────────────

/**
 * GET  /api/v1/auth/verify-email?token=<token>   (from email link click)
 * POST /api/v1/auth/verify-email                  (programmatic — body: { token })
 * Token validated by verifyEmailSchema on both query and body.
 */
const verifyEmail = asyncHandler(async (req, res) => {
  // Token arrives as query param (GET) or body (POST)
  const token = req.query.token || req.body.token;

  await authService.verifyEmail(token);

  res.status(200).json(
    new ApiResponse(200, 'Email verified successfully. You can now log in.')
  );
});

// ─── resendVerification ───────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/resend-verification
 * Body (validated by resendVerificationSchema): { email }
 * Always returns 200 to prevent email enumeration.
 */
const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.body.email);

  res.status(200).json(
    new ApiResponse(
      200,
      'If your account is registered and not yet verified, a new verification email has been sent.'
    )
  );
});

// ─── adminLogin ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/admin/login
 * Body (validated by adminLoginSchema): { email, password }
 * Returns adminToken (signed with JWT_ADMIN_SECRET) and admin profile.
 * No httpOnly cookie — admin sessions are stateless (no refresh rotation).
 */
const adminLogin = asyncHandler(async (req, res) => {
  const { adminToken, admin } = await authService.adminLogin(req.body);

  res.status(200).json(
    new ApiResponse(200, 'Admin login successful.', { adminToken, admin })
  );
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  register,
  login,
  adminLogin,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification
};