'use strict';

const express = require('express');

const { authenticate }         = require('../../middleware/auth.middleware');
const { paymentInitiateLimiter } = require('../../middleware/rateLimiter.middleware');
const { validate }             = require('../../middleware/validate.middleware');
const {
  initiatePaymentSchema,
  verifyPaymentSchema
}                              = require('./payments.validator');
const controller               = require('./payments.controller');

const router = express.Router();

// ─── POST /api/v1/payments/initiate ──────────────────────────────────────────
//
// Creates a Razorpay order for an accepted booking and returns the order
// details the frontend needs to open the checkout widget.
//
// Auth required: yes (must be the booking's requester).
// Rate limit: paymentInitiateLimiter (10/hr per user).
// Validation: initiatePaymentSchema (body).

router.post(
  '/initiate',
  authenticate,
  paymentInitiateLimiter,
  validate(initiatePaymentSchema, 'body'),
  controller.initiatePayment
);

// ─── POST /api/v1/payments/verify ────────────────────────────────────────────
//
// Verifies the Razorpay HMAC-SHA256 signature returned by the checkout widget
// after a successful payment and marks the payment record as 'completed'.
//
// Auth required: yes (must be the payer).
// Validation: verifyPaymentSchema (body).

router.post(
  '/verify',
  authenticate,
  validate(verifyPaymentSchema, 'body'),
  controller.verifyPayment
);

// ─── POST /api/v1/payments/webhook ───────────────────────────────────────────
//
// Razorpay webhook receiver. NO authentication — Razorpay is not a user.
// Authenticity is verified inside the service via HMAC-SHA256 of the raw body
// against RAZORPAY_WEBHOOK_SECRET.
//
// IMPORTANT: The raw body must be available as `req.rawBody` (Buffer) for
// signature verification. This is captured by the `verify` callback on
// `express.json()` in app.js. No Joi schema here — Razorpay's payload is
// validated via HMAC, not field-by-field Joi validation.
//
// Must always return HTTP 200 — Razorpay retries on any other status code.

router.post(
  '/webhook',
  controller.handleWebhook
);

module.exports = router;
