'use strict';

const express = require('express');

const { authenticate, requireEmailVerified } = require('../../middleware/auth.middleware');
const { validate }                           = require('../../middleware/validate.middleware');
const { bookingLimiter }                     = require('../../middleware/rateLimiter.middleware');
const bookingsController                     = require('./bookings.controller');
const {
  createBookingSchema,
  acceptBookingSchema,
  rejectBookingSchema,
  cancelBookingSchema,
  disputeBookingSchema,
  bookingFilterSchema,
  bookingIdParamSchema
}                                            = require('./bookings.validator');

const router = express.Router();

// ─── Collection Routes ────────────────────────────────────────────────────────

/**
 * POST /api/v1/bookings
 * Send a booking request. Rate limited: 10/hour per user.
 * Requires email verification.
 */
router.post(
  '/',
  authenticate,
  requireEmailVerified,
  bookingLimiter,
  validate(createBookingSchema),
  bookingsController.createBooking
);

/**
 * GET /api/v1/bookings
 * List own bookings.
 * Query: role=requester|owner, status=pending|..., page, limit
 */
router.get(
  '/',
  authenticate,
  validate(bookingFilterSchema, 'query'),
  bookingsController.getBookings
);

// ─── Individual Booking Routes ────────────────────────────────────────────────

/**
 * GET /api/v1/bookings/:bookingId
 * Single booking detail. Only requester or post owner can access.
 */
router.get(
  '/:bookingId',
  authenticate,
  validate(bookingIdParamSchema, 'params'),
  bookingsController.getBookingById
);

/**
 * PUT /api/v1/bookings/:bookingId/accept
 * Post owner accepts. Creates conversation. Sets agreed_price.
 * Auto-rejects all other pending bookings for the same post.
 */
router.put(
  '/:bookingId/accept',
  authenticate,
  validate(bookingIdParamSchema, 'params'),
  validate(acceptBookingSchema),
  bookingsController.acceptBooking
);

/**
 * PUT /api/v1/bookings/:bookingId/reject
 * Post owner rejects a pending request.
 */
router.put(
  '/:bookingId/reject',
  authenticate,
  validate(bookingIdParamSchema, 'params'),
  validate(rejectBookingSchema),
  bookingsController.rejectBooking
);

/**
 * PUT /api/v1/bookings/:bookingId/withdraw
 * Requester withdraws their own pending request.
 * No body required.
 */
router.put(
  '/:bookingId/withdraw',
  authenticate,
  validate(bookingIdParamSchema, 'params'),
  bookingsController.withdrawBooking
);

/**
 * PUT /api/v1/bookings/:bookingId/cancel
 * Either party cancels an accepted or in-progress booking.
 * Increments cancellation_count on the user who cancels.
 */
router.put(
  '/:bookingId/cancel',
  authenticate,
  validate(bookingIdParamSchema, 'params'),
  validate(cancelBookingSchema),
  bookingsController.cancelBooking
);

/**
 * PUT /api/v1/bookings/:bookingId/mark-in-progress
 * Post owner marks pickup confirmed / delivery underway.
 * No body required.
 */
router.put(
  '/:bookingId/mark-in-progress',
  authenticate,
  validate(bookingIdParamSchema, 'params'),
  bookingsController.markInProgress
);

/**
 * PUT /api/v1/bookings/:bookingId/complete
 * Post owner marks delivery complete.
 * Triggers: conversation archived, post status → completed,
 *           payment auto-release timer set, review window opened.
 */
router.put(
  '/:bookingId/complete',
  authenticate,
  validate(bookingIdParamSchema, 'params'),
  bookingsController.completeBooking
);

/**
 * PUT /api/v1/bookings/:bookingId/dispute
 * Either party raises a formal dispute.
 * Only allowed when booking is in_progress or completed.
 */
router.put(
  '/:bookingId/dispute',
  authenticate,
  validate(bookingIdParamSchema, 'params'),
  validate(disputeBookingSchema),
  bookingsController.raiseDispute
);

/**
 * GET /api/v1/bookings/:bookingId/history
 * Full status transition history. Only parties can access.
 */
router.get(
  '/:bookingId/history',
  authenticate,
  validate(bookingIdParamSchema, 'params'),
  bookingsController.getBookingHistory
);

module.exports = router;