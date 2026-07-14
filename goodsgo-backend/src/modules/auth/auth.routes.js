'use strict';

const express = require('express');

const { validate }                      = require('../../middleware/validate.middleware');
const {
  authLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter
}                                        = require('../../middleware/rateLimiter.middleware');
const authController                    = require('./auth.controller');
const {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
}                                        = require('./auth.validator');

const router = express.Router();

// ─── Routes ──────────────────────────────────────────────────────────────────
// Middleware chain on each route: [rate limiter] → [validate] → [controller]
// The validate middleware replaces req.body with the validated+sanitized value.
// asyncHandler is applied inside each controller function, not here.

/**
 * POST /api/v1/auth/register
 * Rate limit: 10 per 15 min per IP (authLimiter)
 * Validates: email, password (complexity), full_name, phone (optional)
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register
);

/**
 * POST /api/v1/auth/login
 * Rate limit: 10 per 15 min per IP (authLimiter)
 * Validates: email, password (max only — no complexity check on login)
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login
);

/**
 * POST /api/v1/auth/logout
 * No rate limit — harmless, reads cookie only.
 * No body validation — no body expected.
 */
router.post(
  '/logout',
  authController.logout
);

/**
 * POST /api/v1/auth/refresh-token
 * No body. Reads httpOnly cookie: refresh_token.
 * No rate limit — rotation adds friction for abuse naturally.
 */
router.post(
  '/refresh-token',
  authController.refreshToken
);

/**
 * POST /api/v1/auth/forgot-password
 * Rate limit: 3 per hour per IP (forgotPasswordLimiter)
 * Validates: email
 * Always returns 200 — anti-enumeration.
 */
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * POST /api/v1/auth/reset-password
 * No extra rate limit — 64-byte hex token space is brute-force proof.
 * Validates: token (64-char hex), password (complexity rules)
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword
);

/**
 * GET /api/v1/auth/verify-email?token=<64-char-hex>
 * Triggered when user clicks the link in the verification email.
 * Token is in the query string, not the body.
 */
router.get(
  '/verify-email',
  validate(verifyEmailSchema, 'query'),
  authController.verifyEmail
);

/**
 * POST /api/v1/auth/verify-email
 * Programmatic verification (from frontend SPA that reads token from URL
 * and sends it as a POST body instead of relying on the GET redirect).
 */
router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  authController.verifyEmail
);

/**
 * POST /api/v1/auth/resend-verification
 * Rate limit: 3 per hour per IP (resendVerificationLimiter)
 * Validates: email
 * Always returns 200 — anti-enumeration.
 */
router.post(
  '/resend-verification',
  resendVerificationLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification
);

/**
 * POST /api/v1/auth/admin/login
 * Rate limit: 10 per 15 min per IP (authLimiter) — same as user login.
 * Validates: email, password (max only — no complexity check).
 * Returns: adminToken (JWT signed with JWT_ADMIN_SECRET) + admin profile.
 * No httpOnly cookie — admin sessions have no refresh mechanism; token expires in 8h.
 * Added to resolve the gap: generateAdminToken() existed but was never called.
 */
router.post(
  '/admin/login',
  authLimiter,
  validate(adminLoginSchema),
  authController.adminLogin
);

/**
 * GET /api/v1/auth/diagnose-email
 * Temporary debug endpoint — shows SMTP config status and tests the connection.
 * Remove after email is confirmed working.
 */
router.get('/diagnose-email', async (req, res) => {
  const { getTransporter, verifyEmailConnection, resetTransporter } = require('../../config/email');

  // Reset singleton so it re-reads env vars on this request
  resetTransporter();

  const config = {
    EMAIL_HOST:   process.env.EMAIL_HOST   || '(not set)',
    EMAIL_PORT:   process.env.EMAIL_PORT   || '(not set)',
    EMAIL_SECURE: process.env.EMAIL_SECURE || '(not set)',
    EMAIL_USER:   process.env.EMAIL_USER   || '(not set)',
    EMAIL_PASS:   process.env.EMAIL_PASS   ? `(set, ${process.env.EMAIL_PASS.length} chars)` : '(not set)',
    EMAIL_FROM:   process.env.EMAIL_FROM   || '(not set — will fall back to EMAIL_USER)',
    NODE_ENV:     process.env.NODE_ENV     || '(not set)',
  };

  let smtpResult = null;
  let smtpError  = null;
  try {
    const transporter = getTransporter();
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT: No response from SMTP server after 10s — port 587 is likely blocked by Railway')), 10000)
      )
    ]);
    smtpResult = 'SMTP connection verified successfully';
  } catch (err) {
    smtpError = { message: err.message, code: err.code || null, responseCode: err.responseCode || null };
  }

  res.json({ config, smtpResult, smtpError });
});

module.exports = router;