'use strict';

const Joi = require('joi');

// ─── Route Parameter Schemas ──────────────────────────────────────────────────

/**
 * conversationIdParamSchema — Validates :conversationId route param.
 *
 * Defined inline (not via commonSchemas.uuidParam) because the parameter
 * name differs from the project-wide default ":id" — see PROJECT_CONTEXT.md
 * Section 32 (inline per-module param schemas pattern).
 */
const conversationIdParamSchema = Joi.object({
  conversationId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Invalid conversation ID format. Please use a valid UUID.',
      'any.required': 'Conversation ID is required.'
    })
});

// ─── Request Body Schemas ─────────────────────────────────────────────────────

/**
 * sendMessageSchema — Validates the body for POST .../messages (text messages only).
 * Image messages have no body schema — their only input is req.file.
 */
const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required()
    .messages({
      'string.empty': 'Message content cannot be empty.',
      'string.min':   'Message content cannot be empty.',
      'string.max':   'Message content cannot exceed 2000 characters.',
      'any.required': 'Message content is required.'
    })
});

// ─── Query Schemas ────────────────────────────────────────────────────────────

/**
 * listMessagesQuerySchema — Validates page/limit for GET .../messages.
 * Max limit of 50 keeps response payloads manageable.
 */
const listMessagesQuerySchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1)
    .messages({ 'number.min': 'Page must be at least 1.' }),
  limit: Joi.number().integer().min(1).max(50).default(20)
    .messages({
      'number.min': 'Limit must be at least 1.',
      'number.max': 'Limit cannot exceed 50.'
    })
});

/**
 * listConversationsQuerySchema — Validates page/limit for GET /api/v1/chat.
 * Max limit of 20 — users typically have few active conversations.
 */
const listConversationsQuerySchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1)
    .messages({ 'number.min': 'Page must be at least 1.' }),
  limit: Joi.number().integer().min(1).max(20).default(10)
    .messages({
      'number.min': 'Limit must be at least 1.',
      'number.max': 'Limit cannot exceed 20.'
    })
});

module.exports = {
  conversationIdParamSchema,
  sendMessageSchema,
  listMessagesQuerySchema,
  listConversationsQuerySchema
};
