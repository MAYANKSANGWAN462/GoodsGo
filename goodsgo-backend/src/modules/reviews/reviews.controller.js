'use strict';

const asyncHandler   = require('../../utils/asyncHandler');
const ApiResponse    = require('../../utils/ApiResponse');
const reviewsService = require('./reviews.service');

// ─── createReview ─────────────────────────────────────────────────────────────

/**
 * createReview — POST /api/v1/reviews
 * Submits a review for a completed booking.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
const createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment, reviewRole } = req.body;

  const result = await reviewsService.createReview(
    bookingId,
    req.user.id,
    rating,
    comment,
    reviewRole
  );

  res.status(201).json(
    new ApiResponse(201, 'Review submitted successfully.', result)
  );
});

// ─── getBookingReviews ────────────────────────────────────────────────────────

/**
 * getBookingReviews — GET /api/v1/reviews/bookings/:bookingId
 * Returns both reviews (0–2) for a completed booking. Parties only.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
const getBookingReviews = asyncHandler(async (req, res) => {
  const result = await reviewsService.getBookingReviews(
    req.params.bookingId,
    req.user.id
  );

  res.status(200).json(
    new ApiResponse(200, 'Booking reviews retrieved.', result.reviews)
  );
});

// ─── getUserReviews ───────────────────────────────────────────────────────────

/**
 * getUserReviews — GET /api/v1/reviews/users/:userId
 * Returns paginated public reviews written about a user.
 * Available to both authenticated and unauthenticated clients (optionalAuth).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
const getUserReviews = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await reviewsService.getUserReviews(
    req.params.userId,
    page,
    limit
  );

  res.status(200).json(
    new ApiResponse(200, 'User reviews retrieved.', result.reviews, result.meta)
  );
});

// ─── getMyReviews ─────────────────────────────────────────────────────────────

/**
 * getMyReviews — GET /api/v1/users/me/reviews
 * Returns paginated reviews the authenticated user has written.
 * Handler is wired into users.routes.js for the /me/reviews sub-resource path.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
const getMyReviews = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await reviewsService.getMyReviews(req.user.id, page, limit);

  res.status(200).json(
    new ApiResponse(200, 'Your reviews retrieved.', result.reviews, result.meta)
  );
});

// ─── deleteReview ─────────────────────────────────────────────────────────────

/**
 * deleteReview — DELETE /api/v1/reviews/:reviewId
 * Deletes the authenticated user's own review within the edit window.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
const deleteReview = asyncHandler(async (req, res) => {
  const result = await reviewsService.deleteReview(
    req.params.reviewId,
    req.user.id
  );

  res.status(200).json(
    new ApiResponse(200, 'Review deleted successfully.', result)
  );
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createReview,
  getBookingReviews,
  getUserReviews,
  getMyReviews,
  deleteReview
};
