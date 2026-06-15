'use strict';

const express = require('express');

const { authenticate, optionalAuth, requireEmailVerified } = require('../../middleware/auth.middleware');
const { validate, validateAll }      = require('../../middleware/validate.middleware');
const { uploadLimiter, postCreateLimiter } = require('../../middleware/rateLimiter.middleware');
const { uploadPostImages }           = require('../../middleware/upload.middleware');
const postsController                = require('./posts.controller');
const {
  createPostSchema,
  updatePostSchema,
  postFilterSchema,
  reportPostSchema,
  updateStatusSchema,
  postIdParamSchema
}                                    = require('./posts.validator');

const router = express.Router();

// ─── SPECIFIC routes before /:postId ─────────────────────────────────────────
// Express matches routes in order. /search and /nearby must be declared
// BEFORE /:postId, otherwise Express will treat "search" as a postId value.

/**
 * GET /api/v1/posts
 * Marketplace feed — all active posts, all 3 types.
 * Supports: post_type, vehicle_type, goods_category, origin_city,
 *           destination_city, date_from, date_to, min_price, max_price,
 *           lat, lng, radius_km, sort_by, sort_order, page, limit, q
 */
router.get(
  '/',
  optionalAuth,
  validate(postFilterSchema, 'query'),
  postsController.getFeed
);

/**
 * POST /api/v1/posts
 * Create a new post.
 * Accepts multipart/form-data: JSON fields + optional "images" files.
 * Rate limited: 5 posts per hour per user.
 */
router.post(
  '/',
  authenticate,
  requireEmailVerified,
  postCreateLimiter,
  uploadLimiter,
  uploadPostImages,            // parses multipart, populates req.files
  validate(createPostSchema),  // validates req.body (Joi strips unknown)
  postsController.createPost
);

/**
 * GET /api/v1/posts/search?q=<text>
 * Full-text search on post descriptions and city names.
 */
router.get(
  '/search',
  optionalAuth,
  validate(postFilterSchema, 'query'),
  postsController.searchPosts
);

/**
 * GET /api/v1/posts/nearby?lat=<n>&lng=<n>&radius_km=<n>
 * Posts within a geographic radius of the provided coordinates.
 */
router.get(
  '/nearby',
  optionalAuth,
  validate(postFilterSchema, 'query'),
  postsController.getNearbyPosts
);

// ─── /:postId routes ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/posts/:postId
 * Single post detail. Increments view_count. Unauthenticated access allowed.
 */
router.get(
  '/:postId',
  optionalAuth,
  validate(postIdParamSchema, 'params'),
  postsController.getPostById
);

/**
 * PUT /api/v1/posts/:postId
 * Update an existing post. Owner only.
 * Accepts multipart/form-data: updated fields + optional new images.
 */
router.put(
  '/:postId',
  authenticate,
  requireEmailVerified,
  uploadLimiter,
  uploadPostImages,
  validate(postIdParamSchema, 'params'),
  validate(updatePostSchema),
  postsController.updatePost
);

/**
 * DELETE /api/v1/posts/:postId
 * Soft-delete a post. Owner only.
 * Cannot delete a post with an active (accepted/in-progress) booking.
 */
router.delete(
  '/:postId',
  authenticate,
  validate(postIdParamSchema, 'params'),
  postsController.deletePost
);

/**
 * PUT /api/v1/posts/:postId/status
 * Toggle status between "active" and "inactive". Owner only.
 * Cannot change status of booked/completed/expired posts.
 */
router.put(
  '/:postId/status',
  authenticate,
  validate(postIdParamSchema, 'params'),
  validate(updateStatusSchema),
  postsController.updatePostStatus
);

/**
 * POST /api/v1/posts/:postId/save
 * Save or unsave a post (toggle). Authenticated users only.
 * Cannot save own post.
 */
router.post(
  '/:postId/save',
  authenticate,
  validate(postIdParamSchema, 'params'),
  postsController.toggleSavePost
);

/**
 * POST /api/v1/posts/:postId/report
 * Report a post for moderation review. Authenticated users only.
 * One report per user per post (DB unique constraint).
 */
router.post(
  '/:postId/report',
  authenticate,
  validate(postIdParamSchema, 'params'),
  validate(reportPostSchema),
  postsController.reportPost
);

/**
 * GET /api/v1/posts/:postId/bookings
 * List all booking requests for this post. Post owner only.
 * Stub: returns empty list until Block K (Bookings Module) is complete.
 */
router.get(
  '/:postId/bookings',
  authenticate,
  validate(postIdParamSchema, 'params'),
  postsController.getPostBookings
);

module.exports = router;