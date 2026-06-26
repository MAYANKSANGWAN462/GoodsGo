'use strict';

const Joi = require('joi');
const {
  DISPUTE_STATUS,
  REPORT_STATUS,
  REPORT_REASONS,
  POST_STATUS,
  POST_TYPES
} = require('../../utils/constants');

// ─── User Management Schemas ──────────────────────────────────────────────────

/**
 * @type {import('joi').Schema}
 * GET /admin/users — filter + pagination
 */
const listUsersSchema = Joi.object({
  q:                  Joi.string().trim().max(100).optional(),
  is_active:          Joi.boolean().optional(),
  is_email_verified:  Joi.boolean().optional(),
  page:               Joi.number().integer().min(1).default(1),
  limit:              Joi.number().integer().min(1).max(100).default(20)
}).options({ stripUnknown: true });

/**
 * @type {import('joi').Schema}
 * Routes with /:userId param
 */
const adminUserIdParamSchema = Joi.object({
  userId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid':  'Invalid user ID format in URL',
      'any.required': 'User ID is required'
    })
});

/**
 * @type {import('joi').Schema}
 * PUT /admin/users/:userId/suspend — body
 */
const suspendUserSchema = Joi.object({
  reason: Joi.string()
    .min(10)
    .max(500)
    .trim()
    .required()
    .messages({
      'string.min':   'Suspension reason must be at least 10 characters',
      'string.max':   'Suspension reason cannot exceed 500 characters',
      'any.required': 'A reason is required to suspend a user'
    })
}).options({ stripUnknown: true });

// ─── Post Moderation Schemas ──────────────────────────────────────────────────

/**
 * @type {import('joi').Schema}
 * GET /admin/posts — filter + pagination
 */
const listPostsAdminSchema = Joi.object({
  status:   Joi.string().valid(...Object.values(POST_STATUS)).optional(),
  type:     Joi.string().valid(...Object.values(POST_TYPES)).optional(),
  reported: Joi.boolean().optional(),
  page:     Joi.number().integer().min(1).default(1),
  limit:    Joi.number().integer().min(1).max(100).default(20)
}).options({ stripUnknown: true });

/**
 * @type {import('joi').Schema}
 * Routes with /:postId param
 */
const adminPostIdParamSchema = Joi.object({
  postId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid':  'Invalid post ID format in URL',
      'any.required': 'Post ID is required'
    })
});

// ─── Report Schemas ───────────────────────────────────────────────────────────

/**
 * @type {import('joi').Schema}
 * GET /admin/reports — filter + pagination
 */
const listReportsSchema = Joi.object({
  status: Joi.string().valid(...Object.values(REPORT_STATUS)).optional(),
  reason: Joi.string().valid(...Object.values(REPORT_REASONS)).optional(),
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20)
}).options({ stripUnknown: true });

/**
 * @type {import('joi').Schema}
 * Routes with /:reportId param
 */
const adminReportIdParamSchema = Joi.object({
  reportId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid':  'Invalid report ID format in URL',
      'any.required': 'Report ID is required'
    })
});

/**
 * @type {import('joi').Schema}
 * PUT /admin/reports/:reportId/resolve — body
 */
const resolveReportSchema = Joi.object({
  admin_notes: Joi.string()
    .min(10)
    .max(1000)
    .trim()
    .required()
    .messages({
      'string.min':   'Admin notes must be at least 10 characters',
      'string.max':   'Admin notes cannot exceed 1000 characters',
      'any.required': 'Admin notes are required when resolving a report'
    })
}).options({ stripUnknown: true });

/**
 * @type {import('joi').Schema}
 * PUT /admin/reports/:reportId/dismiss — body (notes optional)
 */
const dismissReportSchema = Joi.object({
  admin_notes: Joi.string()
    .max(1000)
    .trim()
    .optional()
    .allow('', null)
}).options({ stripUnknown: true });

// ─── Dispute Schemas ──────────────────────────────────────────────────────────

/**
 * @type {import('joi').Schema}
 * GET /admin/disputes — filter + pagination
 */
const listDisputesSchema = Joi.object({
  status: Joi.string().valid(...Object.values(DISPUTE_STATUS)).optional(),
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20)
}).options({ stripUnknown: true });

/**
 * @type {import('joi').Schema}
 * Routes with /:disputeId param
 */
const adminDisputeIdParamSchema = Joi.object({
  disputeId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid':  'Invalid dispute ID format in URL',
      'any.required': 'Dispute ID is required'
    })
});

/**
 * @type {import('joi').Schema}
 * PUT /admin/disputes/:disputeId/resolve — body
 * 'open' is intentionally excluded — setting a dispute back to open via
 * this endpoint is not permitted; use the under_review status to start review.
 */
const resolveDisputeSchema = Joi.object({
  status: Joi.string()
    .valid(
      DISPUTE_STATUS.UNDER_REVIEW,
      DISPUTE_STATUS.RESOLVED_FOR_CUSTOMER,
      DISPUTE_STATUS.RESOLVED_FOR_TRANSPORTER,
      DISPUTE_STATUS.RESOLVED_PARTIAL
    )
    .required()
    .messages({
      'any.only':     'Status must be one of: under_review, resolved_for_customer, resolved_for_transporter, resolved_partial',
      'any.required': 'Resolution status is required'
    }),
  admin_notes: Joi.string()
    .min(10)
    .max(2000)
    .trim()
    .required()
    .messages({
      'string.min':   'Admin notes must be at least 10 characters',
      'any.required': 'Admin notes are required when resolving a dispute'
    })
}).options({ stripUnknown: true });

// ─── Payment Schemas ──────────────────────────────────────────────────────────

/**
 * @type {import('joi').Schema}
 * Routes with /:bookingId param (payment admin actions)
 */
const adminBookingIdParamSchema = Joi.object({
  bookingId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid':  'Invalid booking ID format in URL',
      'any.required': 'Booking ID is required'
    })
});

/**
 * @type {import('joi').Schema}
 * POST /admin/payments/:bookingId/refund — body
 */
const refundPaymentSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Refund amount must be a positive number',
      'any.required':    'Refund amount is required'
    }),
  reason: Joi.string()
    .min(10)
    .max(500)
    .trim()
    .required()
    .messages({
      'string.min':   'Refund reason must be at least 10 characters',
      'any.required': 'Refund reason is required'
    })
}).options({ stripUnknown: true });

// ─── Platform Settings Schemas ────────────────────────────────────────────────

/**
 * @type {import('joi').Schema}
 * Routes with /:key param
 */
const settingKeyParamSchema = Joi.object({
  key: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({ 'any.required': 'Setting key is required' })
});

/**
 * @type {import('joi').Schema}
 * PUT /admin/settings/:key — body
 * Value is always stored as text in platform_settings; type coercion is
 * validated in admin.service.updatePlatformSetting() against value_type.
 */
const updateSettingSchema = Joi.object({
  value: Joi.string()
    .min(1)
    .max(1000)
    .trim()
    .required()
    .messages({
      'any.required': 'Setting value is required',
      'string.empty': 'Setting value cannot be empty'
    })
}).options({ stripUnknown: true });

module.exports = {
  listUsersSchema,
  adminUserIdParamSchema,
  suspendUserSchema,
  listPostsAdminSchema,
  adminPostIdParamSchema,
  listReportsSchema,
  adminReportIdParamSchema,
  resolveReportSchema,
  dismissReportSchema,
  listDisputesSchema,
  adminDisputeIdParamSchema,
  resolveDisputeSchema,
  adminBookingIdParamSchema,
  refundPaymentSchema,
  settingKeyParamSchema,
  updateSettingSchema
};
