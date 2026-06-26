'use strict';

const express = require('express');

const { authenticate, optionalAuth }    = require('../../middleware/auth.middleware');
const { validate }                      = require('../../middleware/validate.middleware');
const { uploadLimiter }                 = require('../../middleware/rateLimiter.middleware');
const {
  uploadAvatar: uploadAvatarMiddleware,
  requireFile
}                                        = require('../../middleware/upload.middleware');
const usersController                   = require('./users.controller');
const {
  updateProfileSchema,
  changePasswordSchema,
  userIdParamSchema
}                                        = require('./users.validator');

const router = express.Router();

// ─── Own Profile Routes ───────────────────────────────────────────────────────

/**
 * GET /api/v1/users/me
 * Returns the full profile of the authenticated user.
 * Includes email, phone, and all account metadata.
 */
router.get(
  '/me',
  authenticate,
  usersController.getMe
);

/**
 * PUT /api/v1/users/me
 * Updates one or more profile fields.
 * Accepted fields: full_name, bio, city, state, phone.
 * Email is not updatable here (requires a separate verification flow).
 * At least one field must be present in the request body.
 */
router.put(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  usersController.updateMe
);

/**
 * PUT /api/v1/users/me/password
 * Changes the authenticated user's password.
 * Requires current_password for verification.
 * Revokes all active refresh tokens on success (forces logout on other devices).
 */
router.put(
  '/me/password',
  authenticate,
  validate(changePasswordSchema),
  usersController.changePassword
);

/**
 * POST /api/v1/users/me/avatar
 * Uploads or replaces the authenticated user's profile image.
 * Expects multipart/form-data with field name: "avatar"
 * Accepted types: JPEG, PNG, WebP. Maximum size: 5MB.
 * Rate limited: 20 uploads per hour per IP.
 */
router.post(
  '/me/avatar',
  authenticate,
  uploadLimiter,
  uploadAvatarMiddleware,
  requireFile('avatar'),
  usersController.uploadAvatar
);

/**
 * DELETE /api/v1/users/me/avatar
 * Removes the authenticated user's profile image.
 * Deletes from both the database and Cloudinary.
 * Returns 400 if no image exists to remove.
 */
router.delete(
  '/me/avatar',
  authenticate,
  usersController.removeAvatar
);

/**
 * DELETE /api/v1/users/me
 * Soft-deletes the authenticated user's account.
 * Also: revokes all sessions, sets active posts to 'inactive'.
 * Historical data (bookings, payments, reviews) is retained for integrity.
 * Cannot be undone from the API — requires admin intervention to restore.
 */
router.delete(
  '/me',
  authenticate,
  usersController.deactivateAccount
);

// ─── Sub-resource routes — Posts Module (now available) ──────────────────────

const postsController = require('../posts/posts.controller');

/**
 * GET /api/v1/users/me/posts
 * Returns the authenticated user's own posts.
 * Supports: status, page, limit query params.
 */
router.get(
  '/me/posts',
  authenticate,
  postsController.getMyPosts
);

/**
 * GET /api/v1/users/me/saved-posts
 * Returns posts the authenticated user has saved.
 * Supports: page, limit query params.
 */
router.get(
  '/me/saved-posts',
  authenticate,
  postsController.getSavedPosts
);

// ─── Sub-resource routes — Bookings Module (now available) ───────────────────

const bookingsController = require('../bookings/bookings.controller');

/**
 * GET /api/v1/users/me/bookings
 * Returns all bookings for the authenticated user (as requester and post owner).
 * Supports: role=requester|owner, status=..., page, limit
 */
router.get(
  '/me/bookings',
  authenticate,
  bookingsController.getMyBookings
);

// ─── Sub-resource routes — Notifications Module (now available) ──────────────

const notificationsRouter = require('../notifications/notifications.routes');

/**
 * GET  /api/v1/users/me/notifications
 * PUT  /api/v1/users/me/notifications/read-all
 * PUT  /api/v1/users/me/notifications/:id/read
 * Full route definitions and middleware chains live in notifications.routes.js.
 */
router.use('/me/notifications', notificationsRouter);

// ─── Sub-resource routes — Chat Module (now available) ───────────────────────

const chatController = require('../chat/chat.controller');

/**
 * GET /api/v1/users/me/conversations
 * Returns paginated conversations for the authenticated user.
 * Mirrors GET /api/v1/chat for clients that navigate from the user profile context.
 * Supports: page, limit query params.
 */
router.get(
  '/me/conversations',
  authenticate,
  chatController.getMyConversations
);

// ─── Sub-resource routes — Reviews Module (now available) ────────────────────

const reviewsController = require('../reviews/reviews.controller');

/**
 * GET /api/v1/users/me/reviews
 * Returns paginated reviews the authenticated user has written.
 * Supports: page, limit query params.
 */
router.get(
  '/me/reviews',
  authenticate,
  reviewsController.getMyReviews
);

// ─── Public Profile Route ─────────────────────────────────────────────────────

/**
 * GET /api/v1/users/:userId
 * Returns the public profile of any active, non-deleted user.
 * Accessible to both authenticated and unauthenticated users (optionalAuth).
 * Returns 404 for suspended or deactivated accounts (prevents existence disclosure).
 * userId must be a valid UUID v4.
 */
router.get(
  '/:userId',
  optionalAuth,
  validate(userIdParamSchema, 'params'),
  usersController.getPublicProfile
);

module.exports = router;