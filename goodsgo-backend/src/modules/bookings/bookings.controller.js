'use strict';

const bookingsService = require('./bookings.service');
const ApiResponse     = require('../../utils/ApiResponse');
const asyncHandler    = require('../../utils/asyncHandler');

/**
 * POST /api/v1/bookings
 * Send a booking request for a post.
 */
const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingsService.createBooking(req.user.id, req.body);
  res.status(201).json(
    new ApiResponse(201, 'Booking request sent successfully.', booking)
  );
});

/**
 * GET /api/v1/bookings
 * List own bookings (as requester and/or post owner).
 * Query: role=requester|owner, status=pending|accepted|..., page, limit
 */
const getBookings = asyncHandler(async (req, res) => {
  const { bookings, meta } = await bookingsService.getBookings(req.user.id, req.query);
  res.status(200).json(
    new ApiResponse(200, 'Bookings retrieved successfully.', bookings, meta)
  );
});

/**
 * GET /api/v1/bookings/:bookingId
 * Get a single booking. Only accessible by requester or post owner.
 */
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingsService.getBookingById(req.params.bookingId, req.user.id);
  res.status(200).json(
    new ApiResponse(200, 'Booking retrieved successfully.', booking)
  );
});

/**
 * PUT /api/v1/bookings/:bookingId/accept
 * Post owner accepts the booking request.
 * Body: { agreed_price, pickup_address?, destination_address?, scheduled_date?, special_instructions? }
 */
const acceptBooking = asyncHandler(async (req, res) => {
  const booking = await bookingsService.acceptBooking(
    req.params.bookingId,
    req.user.id,
    req.body
  );
  res.status(200).json(
    new ApiResponse(200, 'Booking accepted successfully. A conversation has been created.', booking)
  );
});

/**
 * PUT /api/v1/bookings/:bookingId/reject
 * Post owner rejects the booking request.
 * Body: { reason? }
 */
const rejectBooking = asyncHandler(async (req, res) => {
  await bookingsService.rejectBooking(
    req.params.bookingId,
    req.user.id,
    req.body.reason || null
  );
  res.status(200).json(
    new ApiResponse(200, 'Booking request rejected.')
  );
});

/**
 * PUT /api/v1/bookings/:bookingId/withdraw
 * Requester withdraws their own pending booking request.
 * No body required.
 */
const withdrawBooking = asyncHandler(async (req, res) => {
  await bookingsService.withdrawBooking(req.params.bookingId, req.user.id);
  res.status(200).json(
    new ApiResponse(200, 'Booking request withdrawn successfully.')
  );
});

/**
 * PUT /api/v1/bookings/:bookingId/cancel
 * Either party cancels an accepted or in-progress booking.
 * Body: { reason } (required)
 */
const cancelBooking = asyncHandler(async (req, res) => {
  await bookingsService.cancelBooking(
    req.params.bookingId,
    req.user.id,
    req.body.reason
  );
  res.status(200).json(
    new ApiResponse(200, 'Booking cancelled successfully.')
  );
});

/**
 * PUT /api/v1/bookings/:bookingId/mark-in-progress
 * Post owner marks goods as picked up / delivery underway.
 * No body required.
 */
const markInProgress = asyncHandler(async (req, res) => {
  await bookingsService.markInProgress(req.params.bookingId, req.user.id);
  res.status(200).json(
    new ApiResponse(200, 'Booking marked as in progress.')
  );
});

/**
 * PUT /api/v1/bookings/:bookingId/complete
 * Post owner marks the delivery as complete.
 * Triggers review window and payment auto-release timer.
 * No body required.
 */
const completeBooking = asyncHandler(async (req, res) => {
  await bookingsService.completeBooking(req.params.bookingId, req.user.id);
  res.status(200).json(
    new ApiResponse(200, 'Booking marked as completed. You can now leave a review.')
  );
});

/**
 * PUT /api/v1/bookings/:bookingId/dispute
 * Either party raises a formal dispute on an in-progress or completed booking.
 * Body: { reason, description }
 */
const raiseDispute = asyncHandler(async (req, res) => {
  await bookingsService.raiseDispute(
    req.params.bookingId,
    req.user.id,
    req.body.reason,
    req.body.description
  );
  res.status(200).json(
    new ApiResponse(200, 'Dispute raised successfully. Our team will review it shortly.')
  );
});

/**
 * GET /api/v1/bookings/:bookingId/history
 * Full status transition history for a booking.
 * Only accessible by requester or post owner.
 */
const getBookingHistory = asyncHandler(async (req, res) => {
  const history = await bookingsService.getBookingHistory(
    req.params.bookingId,
    req.user.id
  );
  res.status(200).json(
    new ApiResponse(200, 'Booking history retrieved.', history)
  );
});

/**
 * GET /api/v1/posts/:postId/bookings
 * All booking requests for a specific post. Post owner only.
 * Replaces the stub in posts.controller.js.
 * Also used as GET /api/v1/users/me/bookings via users.routes.js.
 */
const getPostBookings = asyncHandler(async (req, res) => {
  const { bookings, meta } = await bookingsService.getPostBookings(
    req.params.postId,
    req.user.id,
    req.query
  );
  res.status(200).json(
    new ApiResponse(200, 'Booking requests retrieved.', bookings, meta)
  );
});

/**
 * GET /api/v1/users/me/bookings
 * Mounted via users.routes.js — same as GET /bookings but scoped to current user.
 */
const getMyBookings = asyncHandler(async (req, res) => {
  const { bookings, meta } = await bookingsService.getBookings(req.user.id, req.query);
  res.status(200).json(
    new ApiResponse(200, 'Your bookings retrieved successfully.', bookings, meta)
  );
});

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  withdrawBooking,
  cancelBooking,
  markInProgress,
  completeBooking,
  raiseDispute,
  getBookingHistory,
  getPostBookings,
  getMyBookings
};