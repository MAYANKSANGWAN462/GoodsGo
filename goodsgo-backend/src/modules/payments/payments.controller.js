'use strict';

const asyncHandler    = require('../../utils/asyncHandler');
const ApiResponse     = require('../../utils/ApiResponse');
const paymentService  = require('./payments.service');

// ─── initiatePayment ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/initiate
 *
 * Creates a Razorpay order for the authenticated user's accepted booking.
 * Returns the order details the frontend needs to open the Razorpay checkout
 * widget: `{ orderId, amount, currency, key, paymentRowId }`.
 *
 * Middleware chain: authenticate → paymentInitiateLimiter → validate(initiatePaymentSchema) → here
 */
const initiatePayment = asyncHandler(async (req, res) => {
  const { bookingId }  = req.body;
  const payerId        = req.user.id;

  const orderDetails = await paymentService.initiatePayment(bookingId, payerId);

  res.status(201).json(
    new ApiResponse(201, 'Payment order created. Please complete the payment.', orderDetails)
  );
});

// ─── verifyPayment ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/verify
 *
 * Verifies the Razorpay HMAC-SHA256 payment signature returned by the
 * checkout widget and marks the payment as completed in the database.
 *
 * Middleware chain: authenticate → validate(verifyPaymentSchema) → here
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { bookingId, orderId, paymentId, signature } = req.body;
  const payerId = req.user.id;

  const payment = await paymentService.verifyPayment(
    bookingId,
    orderId,
    paymentId,
    signature,
    payerId
  );

  res.status(200).json(
    new ApiResponse(200, 'Payment verified successfully.', { payment })
  );
});

// ─── handleWebhook ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/webhook
 *
 * Receives and processes Razorpay webhook events. Must ALWAYS return HTTP 200
 * to Razorpay — if it returns any other status, Razorpay will retry delivery.
 *
 * The service's handleWebhook() never throws; all errors are caught and logged
 * internally. asyncHandler is still used here for consistency.
 *
 * Webhook signature is verified inside the service using the raw body buffer
 * captured by the `verify` callback on `express.json()` in app.js.
 *
 * Middleware chain: (no auth) → here
 */
const handleWebhook = asyncHandler(async (req, res) => {
  // req.rawBody is captured by the `verify` callback in app.js's express.json() call.
  // Falls back to re-serialised req.body if rawBody wasn't captured (degraded — signature will fail).
  const rawBody   = req.rawBody
    ? req.rawBody.toString('utf8')
    : JSON.stringify(req.body || {});

  const signature = req.headers['x-razorpay-signature'] || '';

  // Service never throws — all errors are caught and logged internally.
  await paymentService.handleWebhook(rawBody, signature);

  // Razorpay requires a 200 response to confirm delivery.
  res.status(200).json({ success: true, message: 'Webhook received.' });
});

module.exports = {
  initiatePayment,
  verifyPayment,
  handleWebhook
};
