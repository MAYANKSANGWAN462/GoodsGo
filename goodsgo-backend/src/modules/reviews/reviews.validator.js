'use strict';

const Joi           = require('joi');
const { REVIEW_ROLES } = require('../../utils/constants');

// ─── createReviewSchema ───────────────────────────────────────────────────────
// Body schema for POST /api/v1/reviews.

const createReviewSchema = Joi.object({
  bookingId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'bookingId must be a valid UUID.',
      'any.required': 'bookingId is required.'
    }),

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base':    'Rating must be a number.',
      'number.integer': 'Rating must be a whole number.',
      'number.min':     'Rating must be at least 1.',
      'number.max':     'Rating cannot exceed 5.',
      'any.required':   'Rating is required.'
    }),

  comment: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.min': 'Comment must be at least 10 characters if provided.',
      'string.max': 'Comment cannot exceed 1000 characters.'
    }),

  reviewRole: Joi.string()
    .valid(...Object.values(REVIEW_ROLES))
    .required()
    .messages({
      'any.only':    `reviewRole must be one of: ${Object.values(REVIEW_ROLES).join(', ')}.`,
      'any.required': 'reviewRole is required.'
    })
});

// ─── reviewIdParamSchema ──────────────────────────────────────────────────────
// Params schema for DELETE /api/v1/reviews/:reviewId.

const reviewIdParamSchema = Joi.object({
  reviewId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Invalid review ID in URL. Must be a valid UUID.',
      'any.required': 'Review ID is required.'
    })
});

// ─── bookingIdParamSchema ─────────────────────────────────────────────────────
// Params schema for GET /api/v1/reviews/bookings/:bookingId.

const bookingIdParamSchema = Joi.object({
  bookingId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Invalid booking ID in URL. Must be a valid UUID.',
      'any.required': 'Booking ID is required.'
    })
});

// ─── userIdParamSchema ────────────────────────────────────────────────────────
// Params schema for GET /api/v1/reviews/users/:userId.

const userIdParamSchema = Joi.object({
  userId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Invalid user ID in URL. Must be a valid UUID.',
      'any.required': 'User ID is required.'
    })
});

// ─── listReviewsQuerySchema ───────────────────────────────────────────────────
// Query schema for paginated review list endpoints.

const listReviewsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({ 'number.min': 'Page must be at least 1.' }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1.',
      'number.max': 'Limit cannot exceed 50.'
    })
});

module.exports = {
  createReviewSchema,
  reviewIdParamSchema,
  bookingIdParamSchema,
  userIdParamSchema,
  listReviewsQuerySchema
};
