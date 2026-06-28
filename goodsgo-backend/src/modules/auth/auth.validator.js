'use strict';

const Joi = require('joi');

// ─── Shared Password Rules ─────────────────────────────────────────────────────
// Defined once so registerSchema and resetPasswordSchema always use the same rules.
// max(128): prevents bcrypt DoS — bcrypt cost is proportional to input length.
// The pattern requires at least one uppercase and one digit, enforced at Joi level
// so the frontend and backend both give the same error message.

const PASSWORD_RULES = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, 'at least one uppercase letter')
  .pattern(/[0-9]/, 'at least one number')
  .required()
  .messages({
    'string.min':          'Password must be at least 8 characters',
    'string.max':          'Password cannot exceed 128 characters',
    'string.pattern.name': 'Password must contain {#name}',
    'any.required':        'Password is required'
  });

// ─── Registration Schema ──────────────────────────────────────────────────────

const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email':    'Must be a valid email address',
      'string.max':      'Email cannot exceed 255 characters',
      'any.required':    'Email is required'
    }),

  password: PASSWORD_RULES,

  full_name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .pattern(/^[a-zA-Z\s\-'.]+$/, 'valid name characters')
    .required()
    .messages({
      'string.min':          'Full name must be at least 2 characters',
      'string.max':          'Full name cannot exceed 100 characters',
      'string.pattern.name': 'Full name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required':        'Full name is required'
    }),

  phone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be 10–15 digits (optional country code with +)'
    })
});

// ─── Login Schema ─────────────────────────────────────────────────────────────

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    }),

  // On login we only check max(128) — no complexity requirements.
  // Complexity requirements on login would reveal whether account exists.
  password: Joi.string()
    .max(128)
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// ─── Forgot Password Schema ───────────────────────────────────────────────────

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    })
});

// ─── Reset Password Schema ────────────────────────────────────────────────────

const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .length(64)
    .hex()
    .required()
    .messages({
      'string.length': 'Invalid reset token',
      'string.hex':    'Invalid reset token format',
      'any.required':  'Reset token is required'
    }),

  password: PASSWORD_RULES
});

// ─── Verify Email Schema (query string) ──────────────────────────────────────

const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .length(64)
    .hex()
    .required()
    .messages({
      'string.length': 'Invalid verification token',
      'string.hex':    'Invalid verification token format',
      'any.required':  'Verification token is required'
    })
});

// ─── Resend Verification Schema ───────────────────────────────────────────────

const resendVerificationSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    })
});

// ─── Admin Login Schema ───────────────────────────────────────────────────────
// Same shape as loginSchema — email + password with max-only constraint.
// Intentionally identical so the same validation logic applies.

const adminLoginSchema = loginSchema;

module.exports = {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
};