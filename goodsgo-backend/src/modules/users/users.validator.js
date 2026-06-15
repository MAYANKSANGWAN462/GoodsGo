'use strict';

const Joi = require('joi');

// ─── Update Profile Schema ─────────────────────────────────────────────────────
// All fields are optional — user sends only the fields they want to change.
// .min(1) on the object ensures at least one field is present in the request.
// Empty strings for bio/city/state are accepted and stored as NULL (clearing the field).

const updateProfileSchema = Joi.object({
  full_name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .pattern(/^[a-zA-Z\s\-'.]+$/, 'valid name characters')
    .optional()
    .messages({
      'string.min':          'Full name must be at least 2 characters',
      'string.max':          'Full name cannot exceed 100 characters',
      'string.pattern.name': 'Full name may only contain letters, spaces, hyphens, and apostrophes'
    }),

  bio: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('')      // empty string clears the bio
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    }),

  city: Joi.string()
    .max(100)
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.max': 'City cannot exceed 100 characters'
    }),

  state: Joi.string()
    .max(100)
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.max': 'State cannot exceed 100 characters'
    }),

  phone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .optional()
    .allow('', null)  // empty string or null clears the phone
    .messages({
      'string.pattern.base': 'Phone number must be 10–15 digits with an optional + prefix'
    })

}).min(1).messages({
  'object.min': 'At least one field must be provided to update your profile'
});

// ─── Change Password Schema ───────────────────────────────────────────────────
// current_password is validated at max(128) only — no complexity requirements
// on the current password (it was valid when set; complexity rules may have changed).
// new_password enforces full complexity rules to encourage strong passwords.
// The "must be different" check happens in the service layer (requires bcrypt).

const changePasswordSchema = Joi.object({
  current_password: Joi.string()
    .max(128)
    .required()
    .messages({
      'string.max':   'Password cannot exceed 128 characters',
      'any.required': 'Current password is required'
    }),

  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/, 'at least one uppercase letter')
    .pattern(/[0-9]/, 'at least one number')
    .required()
    .messages({
      'string.min':          'New password must be at least 8 characters',
      'string.max':          'New password cannot exceed 128 characters',
      'string.pattern.name': 'New password must contain {#name}',
      'any.required':        'New password is required'
    })
});

// ─── User ID Param Schema ─────────────────────────────────────────────────────
// Validates the /:userId URL parameter on GET /users/:userId.
// Applied with validate(userIdParamSchema, 'params').

const userIdParamSchema = Joi.object({
  userId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid':  'Invalid user ID format. Please provide a valid UUID.',
      'any.required': 'User ID is required'
    })
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  userIdParamSchema
};