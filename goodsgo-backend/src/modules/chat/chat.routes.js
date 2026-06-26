'use strict';

const express = require('express');

const { authenticate }                          = require('../../middleware/auth.middleware');
const { validate }                              = require('../../middleware/validate.middleware');
const { uploadSingleImage, requireFile }        = require('../../middleware/upload.middleware');
const { chatMessageLimiter, uploadLimiter }     = require('../../middleware/rateLimiter.middleware');
const chatController                            = require('./chat.controller');
const {
  conversationIdParamSchema,
  sendMessageSchema,
  listMessagesQuerySchema,
  listConversationsQuerySchema
}                                               = require('./chat.validator');

const router = express.Router();

// All routes in this router require the user to be authenticated.

/**
 * GET /api/v1/chat
 * Returns all conversations for the authenticated user, ordered by last_message_at DESC.
 * Query params: page (default 1), limit (default 10, max 20).
 */
router.get(
  '/',
  authenticate,
  validate(listConversationsQuerySchema, 'query'),
  chatController.getMyConversations
);

/**
 * GET /api/v1/chat/:conversationId
 * Returns a single conversation with participant profiles and booking status.
 * Returns 404 if the conversation does not exist or the user is not a participant
 * (no existence disclosure).
 */
router.get(
  '/:conversationId',
  authenticate,
  validate(conversationIdParamSchema, 'params'),
  chatController.getConversationById
);

/**
 * POST /api/v1/chat/:conversationId/messages/image
 * Uploads an image and sends it as an image message.
 * Expects multipart/form-data with field name: "image".
 * Rate limited: chatMessageLimiter (60/min/user) + uploadLimiter (20/hr/IP).
 *
 * DECLARATION ORDER: This specific literal-path route (/messages/image) is
 * declared BEFORE the parameterised sibling (/messages) so Express does not
 * need to disambiguate — consistent with the posts.routes.js ordering rule
 * documented in CLAUDE.md Section 6 and PROJECT_CONTEXT.md Section 11.
 */
router.post(
  '/:conversationId/messages/image',
  authenticate,
  chatMessageLimiter,
  uploadLimiter,
  validate(conversationIdParamSchema, 'params'),
  uploadSingleImage,
  requireFile('image'),
  chatController.sendImageMessage
);

/**
 * GET /api/v1/chat/:conversationId/messages
 * Returns paginated message history for a conversation, ordered newest-first.
 * Returns 404 if the user is not a participant.
 * Query params: page (default 1), limit (default 20, max 50).
 */
router.get(
  '/:conversationId/messages',
  authenticate,
  validate(conversationIdParamSchema, 'params'),
  validate(listMessagesQuerySchema, 'query'),
  chatController.getMessages
);

/**
 * POST /api/v1/chat/:conversationId/messages
 * Sends a text message in a conversation.
 * Body: { content: string (max 2000 chars) }
 * Also emits a new_message Socket.io event to connected participants.
 * Rate limited: chatMessageLimiter (60/min/user).
 */
router.post(
  '/:conversationId/messages',
  authenticate,
  chatMessageLimiter,
  validate(conversationIdParamSchema, 'params'),
  validate(sendMessageSchema),
  chatController.sendMessage
);

module.exports = router;
