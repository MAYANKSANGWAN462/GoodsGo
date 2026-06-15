'use strict';

const Joi = require('joi');
const {
  POST_TYPES,
  VEHICLE_TYPES,
  GOODS_CATEGORIES,
  REPORT_REASONS,
  ALLOWED_POST_SORT_COLUMNS,
  POST_STATUS
} = require('../../utils/constants');

// ─── Shared field definitions ─────────────────────────────────────────────────

const latField = (label = 'Latitude') =>
  Joi.number().min(-90).max(90).required()
    .messages({ 'number.base': `${label} must be a number between -90 and 90` });

const lngField = (label = 'Longitude') =>
  Joi.number().min(-180).max(180).required()
    .messages({ 'number.base': `${label} must be a number between -180 and 180` });

const latFieldOpt = () =>
  Joi.number().min(-90).max(90).optional().allow(null);

const lngFieldOpt = () =>
  Joi.number().min(-180).max(180).optional().allow(null);

const positiveNumber = (label) =>
  Joi.number().positive().required()
    .messages({ 'number.positive': `${label} must be a positive number` });

const positiveNumberOpt = () =>
  Joi.number().positive().optional().allow(null);

// ─── Create Post Schema ───────────────────────────────────────────────────────
// All three post types are handled by a single schema using Joi .when() conditions.
// post_type drives which fields are required vs forbidden vs optional.

const createPostSchema = Joi.object({

  // ── Discriminator ────────────────────────────────────────────────────────────
  post_type: Joi.string()
    .valid(...Object.values(POST_TYPES))
    .required()
    .messages({
      'any.only':    `post_type must be one of: ${Object.values(POST_TYPES).join(', ')}`,
      'any.required': 'post_type is required'
    }),

  // ── Common fields ─────────────────────────────────────────────────────────────
  description: Joi.string().max(1000).trim().optional().allow('').messages({
    'string.max': 'Description cannot exceed 1000 characters'
  }),

  // availability_date: must be today or future — date-string in YYYY-MM-DD format
  availability_date: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base':    'availability_date must be a valid date (YYYY-MM-DD)',
      'any.required': 'availability_date is required'
    }),

  // ── Origin location (required for all post types) ─────────────────────────────
  origin_address: Joi.string().min(5).max(500).trim().required()
    .messages({ 'any.required': 'Origin address is required' }),
  origin_city:  Joi.string().max(100).trim().optional().allow('', null),
  origin_state: Joi.string().max(100).trim().optional().allow('', null),
  origin_lat:   latField('Origin latitude'),
  origin_lng:   lngField('Origin longitude'),

  // ── Destination location ──────────────────────────────────────────────────────
  // Required for: need_transport (delivery destination), return_journey (home base)
  // Optional for: vehicle_available (intended direction — may be flexible)
  destination_address: Joi.string().max(500).trim()
    .when('post_type', {
      switch: [
        { is: POST_TYPES.VEHICLE_AVAILABLE, then: Joi.optional().allow('', null) },
        { is: POST_TYPES.NEED_TRANSPORT,    then: Joi.required() },
        { is: POST_TYPES.RETURN_JOURNEY,    then: Joi.required() }
      ]
    })
    .messages({ 'any.required': 'Destination address is required for this post type' }),

  destination_city:  Joi.string().max(100).trim().optional().allow('', null),
  destination_state: Joi.string().max(100).trim().optional().allow('', null),
  destination_lat:   latFieldOpt(),
  destination_lng:   lngFieldOpt(),

  // ── Vehicle fields ─────────────────────────────────────────────────────────────
  vehicle_type: Joi.string().valid(...VEHICLE_TYPES)
    .when('post_type', {
      is:        POST_TYPES.NEED_TRANSPORT,
      then:      Joi.required(),
      otherwise: Joi.required()  // required for all types
    })
    .messages({
      'any.only':    `vehicle_type must be one of: ${VEHICLE_TYPES.join(', ')}`,
      'any.required': 'vehicle_type is required'
    }),

  // Full capacity — required for vehicle_available
  vehicle_capacity_kg: Joi.number().positive()
    .when('post_type', {
      is:        POST_TYPES.VEHICLE_AVAILABLE,
      then:      Joi.required(),
      otherwise: Joi.optional().allow(null)
    })
    .messages({ 'any.required': 'vehicle_capacity_kg is required for Vehicle Available posts' }),

  // Remaining capacity — required for return_journey
  remaining_capacity_kg: Joi.number().positive()
    .when('post_type', {
      is:        POST_TYPES.RETURN_JOURNEY,
      then:      Joi.required(),
      otherwise: Joi.optional().allow(null)
    })
    .messages({ 'any.required': 'remaining_capacity_kg is required for Return Journey posts' }),

  // ── Goods fields (need_transport only) ────────────────────────────────────────
  goods_type: Joi.string().max(100).trim()
    .when('post_type', {
      is:        POST_TYPES.NEED_TRANSPORT,
      then:      Joi.required(),
      otherwise: Joi.optional().allow('', null)
    }),

  goods_category: Joi.string().valid(...GOODS_CATEGORIES)
    .when('post_type', {
      is:        POST_TYPES.NEED_TRANSPORT,
      then:      Joi.required(),
      otherwise: Joi.optional().allow(null)
    })
    .messages({
      'any.only': `goods_category must be one of: ${GOODS_CATEGORIES.join(', ')}`
    }),

  goods_weight_kg: Joi.number().positive()
    .when('post_type', {
      is:        POST_TYPES.NEED_TRANSPORT,
      then:      Joi.required(),
      otherwise: Joi.optional().allow(null)
    }),

  goods_length_cm: positiveNumberOpt(),
  goods_width_cm:  positiveNumberOpt(),
  goods_height_cm: positiveNumberOpt(),

  is_fragile: Joi.boolean().default(false).optional(),

  // ── Pricing ────────────────────────────────────────────────────────────────────
  // Budget range — required for need_transport
  budget_min: Joi.number().positive()
    .when('post_type', {
      is:        POST_TYPES.NEED_TRANSPORT,
      then:      Joi.required(),
      otherwise: Joi.optional().allow(null)
    }),

  budget_max: Joi.number().positive()
    .when('budget_min', {
      is:       Joi.exist(),
      then:     Joi.number().min(Joi.ref('budget_min')).optional(),
      otherwise: Joi.optional().allow(null)
    })
    .messages({ 'number.min': 'budget_max must be greater than or equal to budget_min' }),

  // Price expectation — for vehicle_available and return_journey
  price_expectation: Joi.number().positive()
    .when('post_type', {
      is:        POST_TYPES.NEED_TRANSPORT,
      then:      Joi.optional().allow(null),
      otherwise: Joi.optional().allow(null)
    })

}).options({ stripUnknown: true });

// ─── Update Post Schema ───────────────────────────────────────────────────────
// All fields optional — PATCH semantics on PUT.
// post_type cannot be changed after creation.
// Validation is looser; service layer enforces ownership and status rules.

const updatePostSchema = Joi.object({
  description:           Joi.string().max(1000).trim().optional().allow(''),
  availability_date:     Joi.date().iso().optional(),
  origin_address:        Joi.string().min(5).max(500).trim().optional(),
  origin_city:           Joi.string().max(100).trim().optional().allow('', null),
  origin_state:          Joi.string().max(100).trim().optional().allow('', null),
  origin_lat:            latFieldOpt(),
  origin_lng:            lngFieldOpt(),
  destination_address:   Joi.string().max(500).trim().optional().allow('', null),
  destination_city:      Joi.string().max(100).trim().optional().allow('', null),
  destination_state:     Joi.string().max(100).trim().optional().allow('', null),
  destination_lat:       latFieldOpt(),
  destination_lng:       lngFieldOpt(),
  vehicle_type:          Joi.string().valid(...VEHICLE_TYPES).optional(),
  vehicle_capacity_kg:   positiveNumberOpt(),
  remaining_capacity_kg: positiveNumberOpt(),
  goods_type:            Joi.string().max(100).trim().optional().allow('', null),
  goods_category:        Joi.string().valid(...GOODS_CATEGORIES).optional().allow(null),
  goods_weight_kg:       positiveNumberOpt(),
  goods_length_cm:       positiveNumberOpt(),
  goods_width_cm:        positiveNumberOpt(),
  goods_height_cm:       positiveNumberOpt(),
  is_fragile:            Joi.boolean().optional(),
  budget_min:            Joi.number().positive().optional().allow(null),
  budget_max:            Joi.number().positive().optional().allow(null),
  price_expectation:     Joi.number().positive().optional().allow(null)
}).min(1).options({ stripUnknown: true }).messages({
  'object.min': 'At least one field must be provided to update the post'
});

// ─── Post Filter / Feed Schema ────────────────────────────────────────────────

const postFilterSchema = Joi.object({
  post_type:        Joi.string().optional(),       // comma-separated: need_transport,vehicle_available
  vehicle_type:     Joi.string().optional(),       // comma-separated
  goods_category:   Joi.string().valid(...GOODS_CATEGORIES).optional(),
  origin_city:      Joi.string().max(100).trim().optional(),
  destination_city: Joi.string().max(100).trim().optional(),
  date_from:        Joi.date().iso().optional(),
  date_to:          Joi.date().iso().optional(),
  min_price:        Joi.number().positive().optional(),
  max_price:        Joi.number().positive().optional(),
  lat:              Joi.number().min(-90).max(90).optional(),
  lng:              Joi.number().min(-180).max(180).optional(),
  radius_km:        Joi.number().positive().max(500).default(50).optional(),
  sort_by:          Joi.string().valid(...ALLOWED_POST_SORT_COLUMNS).default('created_at').optional(),
  sort_order:       Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc').optional(),
  page:             Joi.number().integer().min(1).default(1).optional(),
  limit:            Joi.number().integer().min(1).max(50).default(20).optional(),
  q:                Joi.string().max(200).trim().optional()  // full-text search
}).options({ stripUnknown: true });

// ─── Report Post Schema ───────────────────────────────────────────────────────

const reportPostSchema = Joi.object({
  reason: Joi.string()
    .valid(...Object.values(REPORT_REASONS))
    .required()
    .messages({
      'any.only':    `reason must be one of: ${Object.values(REPORT_REASONS).join(', ')}`,
      'any.required': 'reason is required'
    }),
  description: Joi.string().max(500).trim().optional().allow('')
}).options({ stripUnknown: true });

// ─── Post Status Schema ───────────────────────────────────────────────────────

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(POST_STATUS.ACTIVE, POST_STATUS.INACTIVE)
    .required()
    .messages({
      'any.only':    'status must be either "active" or "inactive"',
      'any.required': 'status is required'
    })
});

// ─── Post ID Param Schema ─────────────────────────────────────────────────────

const postIdParamSchema = Joi.object({
  postId: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
    'string.guid':  'Invalid post ID format',
    'any.required': 'Post ID is required'
  })
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  postFilterSchema,
  reportPostSchema,
  updateStatusSchema,
  postIdParamSchema
};