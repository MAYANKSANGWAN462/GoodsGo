'use strict';

const Joi = require('joi');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES, PAGINATION } = require('../utils/constants');

// ─── Error Formatting ─────────────────────────────────────────────────────────

/**
 * formatJoiErrors — Transforms Joi's internal error format into the
 * field-level array expected by the ApiError response schema.
 *
 * Joi detail example:
 *   { message: '"email" must be a valid email address', path: ['email'], type: 'string.email' }
 *
 * Output:
 *   { field: 'email', message: 'Must be a valid email address' }
 *
 * @param {import('joi').ValidationError} joiError
 * @returns {Array<{ field: string, message: string }>}
 */
function formatJoiErrors(joiError) {
  return joiError.details.map((detail) => {
    // Flatten nested path array: ['address', 'city'] → 'address.city'
    const field = detail.path.length > 0 ? detail.path.join('.') : 'value';

    // Clean up Joi's quotes around field names for better UX
    // '"email" must be ...' → 'Must be ...'
    const message = detail.message
      .replace(/^"[^"]*"\s*/i, '')  // Remove leading "fieldname" prefix
      .replace(/"/g, '')             // Remove any remaining quotes
      .trim();

    // Capitalise first letter
    const cleanMessage = message.charAt(0).toUpperCase() + message.slice(1);

    return { field, message: cleanMessage };
  });
}

// ─── Validation Middleware Factory ────────────────────────────────────────────

/**
 * validate — Creates an Express middleware from a Joi schema.
 *
 * Behaviour:
 * - abortEarly: false → collect ALL errors in one pass (not just the first)
 * - stripUnknown: true → remove fields not defined in schema (mass assignment protection)
 * - convert: true → coerce compatible types (string '20' → number 20, 'true' → boolean)
 * - Replaces req[property] with the validated + coerced + stripped value
 *
 * @param {import('joi').Schema} schema - Joi schema object
 * @param {'body'|'query'|'params'} [property='body'] - Which part of req to validate
 * @returns {import('express').RequestHandler}
 *
 * Usage:
 *   const { validate } = require('../../middleware/validate.middleware');
 *   const { registerSchema } = require('./auth.validator');
 *
 *   router.post('/register',
 *     authLimiter,
 *     validate(registerSchema),          // validates req.body
 *     asyncHandler(authController.register)
 *   );
 *
 *   router.get('/posts',
 *     validate(filterSchema, 'query'),   // validates req.query
 *     asyncHandler(postController.getAll)
 *   );
 *
 *   router.get('/posts/:postId',
 *     validate(uuidParamSchema, 'params'),
 *     asyncHandler(postController.getOne)
 *   );
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const target = req[property];

    const { error, value } = schema.validate(target, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = formatJoiErrors(error);
      return next(
        new ApiError(
          400,
          'Validation failed. Please check your input and try again.',
          errors,
          ERROR_CODES.VALIDATION_ERROR
        )
      );
    }

    // Replace with the validated, sanitised, coerced value
    // This is safe to mutate: Express creates a new request object per request
    req[property] = value;
    next();
  };
};

/**
 * validateAll — Validates multiple req properties simultaneously.
 * Collects errors from all properties before failing.
 *
 * @param {Object.<'body'|'query'|'params', import('joi').Schema>} schemas
 * @returns {import('express').RequestHandler}
 *
 * Usage:
 *   router.get('/posts',
 *     validateAll({
 *       query: postFilterSchema   // validate filters
 *     }),
 *     asyncHandler(postController.getAll)
 *   );
 */
const validateAll = (schemas) => {
  return (req, res, next) => {
    const allErrors = [];

    for (const [property, schema] of Object.entries(schemas)) {
      const { error, value } = schema.validate(req[property] || {}, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        // Prefix errors with property name for clarity: 'query.page', 'body.email'
        const errors = formatJoiErrors(error).map((e) => ({
          ...e,
          field: property !== 'body' ? `${property}.${e.field}` : e.field
        }));
        allErrors.push(...errors);
      } else {
        req[property] = value;
      }
    }

    if (allErrors.length > 0) {
      return next(
        new ApiError(
          400,
          'Validation failed. Please check your input and try again.',
          allErrors,
          ERROR_CODES.VALIDATION_ERROR
        )
      );
    }

    next();
  };
};

// ─── Shared Reusable Schemas ──────────────────────────────────────────────────
// Import these in individual module validators to maintain consistency.
// Using the same UUID schema everywhere means one change fixes all validators.

const commonSchemas = {
  /**
   * UUID v4 validation — required.
   * Used for all primary key fields in request bodies.
   */
  uuid: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Must be a valid ID (UUID format)',
      'any.required': 'ID is required'
    }),

  /**
   * UUID v4 validation — optional.
   */
  uuidOptional: Joi.string()
    .uuid({ version: 'uuidv4' })
    .optional()
    .messages({
      'string.guid': 'Must be a valid ID (UUID format)'
    }),

  /**
   * Route parameter schema: /:id
   * Use with validate(uuidParam, 'params') on any single-resource route.
   */
  uuidParam: Joi.object({
    id: Joi.string()
      .uuid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid ID format in URL. Please use a valid UUID.',
        'any.required': 'Resource ID is required.'
      })
  }),

  /**
   * Pagination query parameters.
   * Allow unknown() so other query params can coexist.
   * Applied with validate(pagination, 'query') or combined in validateAll.
   */
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(PAGINATION.DEFAULT_PAGE)
      .messages({ 'number.min': 'Page must be at least 1' }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(PAGINATION.MAX_LIMIT)
      .default(PAGINATION.DEFAULT_LIMIT)
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': `Limit cannot exceed ${PAGINATION.MAX_LIMIT}`
      })
  }).unknown(true), // Allow other query params alongside pagination

  /**
   * Sort options — combined with other query schemas.
   */
  sort: Joi.object({
    sort_by: Joi.string().optional(),
    sort_order: Joi.string()
      .valid('asc', 'desc', 'ASC', 'DESC')
      .default('desc')
      .optional()
  }).unknown(true),

  /**
   * Latitude / longitude — used in location-based post queries.
   */
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required()
      .messages({ 'number.base': 'Latitude must be a number between -90 and 90' }),
    lng: Joi.number().min(-180).max(180).required()
      .messages({ 'number.base': 'Longitude must be a number between -180 and 180' }),
    radius_km: Joi.number().min(1).max(500).default(50)
      .messages({ 'number.max': 'Search radius cannot exceed 500km' })
  }).unknown(true)
};

module.exports = { validate, validateAll, commonSchemas };