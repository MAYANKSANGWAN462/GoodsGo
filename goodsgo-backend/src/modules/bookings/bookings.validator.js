'use strict';

const Joi = require('joi');

// ─── Create Booking Schema ────────────────────────────────────────────────────
// Sent by the user who wants to book a post.
// agreed_price is optional at request time — it can be negotiated on acceptance.

const createBookingSchema = Joi.object({
  post_id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid':  'post_id must be a valid UUID',
      'any.required': 'post_id is required'
    }),

  pickup_address: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('', null),

  destination_address: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('', null),

  scheduled_date: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.base': 'scheduled_date must be a valid date (YYYY-MM-DD)'
    }),

  goods_description: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('', null),

  special_instructions: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('', null)

}).options({ stripUnknown: true });

// ─── Accept Booking Schema ────────────────────────────────────────────────────
// Post owner accepts the request and confirms the final agreed price.

const acceptBookingSchema = Joi.object({
  agreed_price: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'agreed_price must be a positive number',
      'any.required':    'agreed_price is required to accept a booking'
    }),

  pickup_address: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('', null),

  destination_address: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('', null),

  scheduled_date: Joi.date()
    .iso()
    .optional()
    .allow(null),

  special_instructions: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('', null)

}).options({ stripUnknown: true });

// ─── Reject Booking Schema ────────────────────────────────────────────────────

const rejectBookingSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Rejection reason cannot exceed 500 characters'
    })
}).options({ stripUnknown: true });

// ─── Cancel Booking Schema ────────────────────────────────────────────────────
// Used by both parties to cancel an accepted booking.

const cancelBookingSchema = Joi.object({
  reason: Joi.string()
    .min(5)
    .max(500)
    .trim()
    .required()
    .messages({
      'string.min':   'Cancellation reason must be at least 5 characters',
      'string.max':   'Cancellation reason cannot exceed 500 characters',
      'any.required': 'A reason is required to cancel a booking'
    })
}).options({ stripUnknown: true });

// ─── Dispute Booking Schema ───────────────────────────────────────────────────

const disputeBookingSchema = Joi.object({
  reason: Joi.string()
    .min(10)
    .max(200)
    .trim()
    .required()
    .messages({
      'string.min':   'Dispute reason must be at least 10 characters',
      'any.required': 'A reason is required to raise a dispute'
    }),

  description: Joi.string()
    .min(20)
    .max(2000)
    .trim()
    .required()
    .messages({
      'string.min':   'Please provide a detailed description (at least 20 characters)',
      'any.required': 'A description is required to raise a dispute'
    })

}).options({ stripUnknown: true });

// ─── Booking List Filter Schema ───────────────────────────────────────────────
// Used for GET /bookings — filter by role and status.

const bookingFilterSchema = Joi.object({
  role:   Joi.string().valid('requester', 'owner').optional(),
  status: Joi.string().optional(),  // comma-separated booking statuses
  page:   Joi.number().integer().min(1).default(1).optional(),
  limit:  Joi.number().integer().min(1).max(50).default(20).optional()
}).options({ stripUnknown: true });

// ─── Booking ID Param Schema ──────────────────────────────────────────────────

const bookingIdParamSchema = Joi.object({
  bookingId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid':  'Invalid booking ID format',
      'any.required': 'Booking ID is required'
    })
});

module.exports = {
  createBookingSchema,
  acceptBookingSchema,
  rejectBookingSchema,
  cancelBookingSchema,
  disputeBookingSchema,
  bookingFilterSchema,
  bookingIdParamSchema
};