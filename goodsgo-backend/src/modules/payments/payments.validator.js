'use strict';

const Joi = require('joi');

// ─── Initiate Payment ─────────────────────────────────────────────────────────

/**
 * Schema for POST /api/v1/payments/initiate
 * Creates a Razorpay order for the given booking. Only the requester
 * (customer) of an accepted booking may initiate payment.
 */
const initiatePaymentSchema = Joi.object({
  bookingId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Booking ID must be a valid UUID.',
      'any.required': 'Booking ID is required.'
    })
});

// ─── Verify Payment ───────────────────────────────────────────────────────────

/**
 * Schema for POST /api/v1/payments/verify
 * Verifies the Razorpay payment signature returned by the checkout widget
 * and marks the payment as completed in the database.
 *
 * Razorpay signature = HMAC-SHA256(`${orderId}|${paymentId}`, key_secret)
 */
const verifyPaymentSchema = Joi.object({
  bookingId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Booking ID must be a valid UUID.',
      'any.required': 'Booking ID is required.'
    }),

  orderId: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      'any.required': 'Razorpay order ID is required.',
      'string.empty': 'Razorpay order ID cannot be empty.'
    }),

  paymentId: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      'any.required': 'Razorpay payment ID is required.',
      'string.empty': 'Razorpay payment ID cannot be empty.'
    }),

  signature: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      'any.required': 'Razorpay signature is required.',
      'string.empty': 'Razorpay signature cannot be empty.'
    })
});

module.exports = {
  initiatePaymentSchema,
  verifyPaymentSchema
};
