'use strict';

const express = require('express');

const { authenticate, optionalAuth } = require('../../middleware/auth.middleware');
const { validate }                   = require('../../middleware/validate.middleware');
const reviewsController              = require('./reviews.controller');
const {
  createReviewSchema,
  reviewIdParamSchema,
  bookingIdParamSchema,
  userIdParamSchema,
  listReviewsQuerySchema
}                                    = require('./reviews.validator');

const router = express.Router();

// ─── Create Review ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/reviews
 * Submits a review for a completed booking.
 * Body: { bookingId, rating (1-5), comment (optional), reviewRole }
 */
router.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  reviewsController.createReview
);

// ─── Get Reviews for a Booking ────────────────────────────────────────────────
// Declared BEFORE /:reviewId — prevents Express from capturing the literal
// segment "bookings" as a reviewId UUID parameter.

/**
 * GET /api/v1/reviews/bookings/:bookingId
 * Returns both reviews (0–2) for a specific booking. Parties to the booking only.
 */
router.get(
  '/bookings/:bookingId',
  authenticate,
  validate(bookingIdParamSchema, 'params'),
  reviewsController.getBookingReviews
);

// ─── Get Public Reviews for a User ───────────────────────────────────────────
// Declared BEFORE /:reviewId — prevents Express from capturing the literal
// segment "users" as a reviewId UUID parameter.

/**
 * GET /api/v1/reviews/users/:userId
 * Returns paginated visible reviews written about a user.
 * Accessible to both authenticated and unauthenticated clients.
 * Query: page, limit
 */
router.get(
  '/users/:userId',
  optionalAuth,
  validate(userIdParamSchema, 'params'),
  validate(listReviewsQuerySchema, 'query'),
  reviewsController.getUserReviews
);

// ─── Delete Review ────────────────────────────────────────────────────────────
// Must be declared after /bookings/:id and /users/:id so those literal paths
// take priority over this wildcard param route.

/**
 * DELETE /api/v1/reviews/:reviewId
 * Deletes the authenticated user's own review within the configured edit window.
 */
router.delete(
  '/:reviewId',
  authenticate,
  validate(reviewIdParamSchema, 'params'),
  reviewsController.deleteReview
);

module.exports = router;
