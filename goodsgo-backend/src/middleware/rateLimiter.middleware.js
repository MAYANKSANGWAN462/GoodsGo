'use strict';

const rateLimit = require('express-rate-limit');
const { RATE_LIMITS, ERROR_CODES } = require('../utils/constants');

// ─── Standard Rate Limit Response Handler ─────────────────────────────────────
// Overrides the default text/html response from express-rate-limit.
// All rate limit errors must match the ApiError JSON shape for consistency.

const rateLimitResponseHandler = (req, res, next, options) => {
  const resetTime = req.rateLimit && req.rateLimit.resetTime
    ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    : null;

  res.status(429).json({
    success: false,
    message: options.message || 'Too many requests. Please slow down and try again later.',
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    ...(resetTime !== null && { retryAfterSeconds: resetTime })
  });
};

// ─── Base Options ─────────────────────────────────────────────────────────────
// Shared options applied to every rate limiter instance.

const baseOptions = {
  // Send standard RateLimit-* headers (RFC 6585 compliant)
  standardHeaders: true,
  // Disable the deprecated X-RateLimit-* headers
  legacyHeaders: false,
  // Use the custom JSON handler above
  handler: rateLimitResponseHandler,
  // Skip rate limiting entirely in test environment
  // This allows unit/integration tests to run without hitting limits
  skip: () => process.env.NODE_ENV === 'test',
  // Key is always req.ip by default — some limiters override this (see below)
  keyGenerator: (req) => req.ip
};

// ─── Auth Limiter ─────────────────────────────────────────────────────────────
/**
 * authLimiter — Applied to POST /auth/register and POST /auth/login.
 *
 * 10 attempts per 15 minutes per IP.
 * Reasoning: A legitimate user will not attempt login 10+ times in 15 minutes.
 * At 10 attempts/15min, an attacker trying a 8-char lowercase password space
 * would take millions of years to brute-force a single account.
 *
 * Applied in: auth.routes.js
 */
const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.AUTH.WINDOW_MS,        // 15 minutes
  max: RATE_LIMITS.AUTH.MAX,                    // 10 attempts
  message: 'Too many login attempts from this IP. Please try again in 15 minutes.'
});

// ─── Forgot Password Limiter ──────────────────────────────────────────────────
/**
 * forgotPasswordLimiter — Applied to POST /auth/forgot-password.
 *
 * 3 requests per hour per IP.
 * Prevents: email enumeration, SMTP abuse, spam.
 * Note: The endpoint always returns 200 regardless of whether the email exists
 *       (to prevent enumeration), so this limiter is the only real protection.
 *
 * Applied in: auth.routes.js
 */
const forgotPasswordLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.FORGOT_PASSWORD.WINDOW_MS,  // 1 hour
  max: RATE_LIMITS.FORGOT_PASSWORD.MAX,             // 3 requests
  message: 'Too many password reset requests. Please try again in 1 hour.'
});

// ─── Resend Verification Limiter ──────────────────────────────────────────────
/**
 * resendVerificationLimiter — Applied to POST /auth/resend-verification.
 *
 * 3 requests per hour per IP.
 *
 * Applied in: auth.routes.js
 */
const resendVerificationLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.RESEND_VERIFICATION.WINDOW_MS,
  max: RATE_LIMITS.RESEND_VERIFICATION.MAX,
  message: 'Too many verification email requests. Please try again in 1 hour.'
});

// ─── General API Limiter ──────────────────────────────────────────────────────
/**
 * apiLimiter — Applied globally to all /api/* routes in app.js.
 *
 * 100 requests per minute per IP.
 * Baseline protection against scraping and DoS.
 * More permissive than auth limits since most API usage is legitimate browsing.
 *
 * Applied in: app.js (globally on /api prefix)
 */
const apiLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.API_GENERAL.WINDOW_MS,  // 1 minute
  max: RATE_LIMITS.API_GENERAL.MAX,             // 100 requests
  message: 'Too many requests from this IP. Please slow down.'
});

// ─── Upload Limiter ───────────────────────────────────────────────────────────
/**
 * uploadLimiter — Applied to all file upload endpoints.
 *
 * 20 uploads per hour per IP.
 * Prevents Cloudinary storage abuse and excessive server RAM usage
 * (all uploads go through memoryStorage before Cloudinary transfer).
 *
 * Applied in: users.routes.js (avatar), posts.routes.js (post images)
 */
const uploadLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.UPLOAD.WINDOW_MS,  // 1 hour
  max: RATE_LIMITS.UPLOAD.MAX,             // 20 uploads
  message: 'Upload limit reached. You can upload a maximum of 20 files per hour.'
});

// ─── Post Create Limiter ─────────────────────────────────────────────────────
/**
 * postCreateLimiter — Applied to POST /posts.
 *
 * 5 posts per hour per USER (not per IP).
 * Using user ID as the rate limit key means this limit follows the user
 * across IP changes (e.g. switching from WiFi to mobile data).
 *
 * Falls back to IP if user is not authenticated (shouldn't happen since
 * the route requires auth, but this is a safety fallback).
 *
 * Applied in: posts.routes.js
 */
const postCreateLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.POST_CREATE.WINDOW_MS,  // 1 hour
  max: RATE_LIMITS.POST_CREATE.MAX,             // 5 posts
  keyGenerator: (req) => {
    // req.user is attached by auth.middleware.js which runs before this
    return req.user ? `post_create:user:${req.user.id}` : `post_create:ip:${req.ip}`;
  },
  message: 'You can create a maximum of 5 posts per hour. Please try again later.'
});

// ─── Booking Request Limiter ──────────────────────────────────────────────────
/**
 * bookingLimiter — Applied to POST /bookings.
 *
 * 10 booking requests per hour per USER.
 * Prevents spam-booking all available posts.
 * Per-user key same reasoning as postCreateLimiter.
 *
 * Applied in: bookings.routes.js
 */
const bookingLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.BOOKING_REQUEST.WINDOW_MS,
  max: RATE_LIMITS.BOOKING_REQUEST.MAX,
  keyGenerator: (req) => {
    return req.user ? `booking:user:${req.user.id}` : `booking:ip:${req.ip}`;
  },
  message: 'You can send a maximum of 10 booking requests per hour.'
});

module.exports = {
  authLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
  apiLimiter,
  uploadLimiter,
  postCreateLimiter,
  bookingLimiter
};