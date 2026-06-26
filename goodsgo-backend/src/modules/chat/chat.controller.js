'use strict';

const asyncHandler  = require('../../utils/asyncHandler');
const ApiResponse   = require('../../utils/ApiResponse');
const { HTTP_STATUS } = require('../../utils/constants');
const chatService   = require('./chat.service');

// ─── getMyConversations ───────────────────────────────────────────────────────

/**
 * GET /api/v1/chat
 * GET /api/v1/users/me/conversations
 *
 * Returns paginated conversations for the authenticated user.
 */
const getMyConversations = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const { conversations, meta } = await chatService.getMyConversations(
    req.user.id,
    page,
    limit
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      'Conversations retrieved successfully.',
      { conversations },
      meta
    )
  );
});

// ─── getConversationById ──────────────────────────────────────────────────────

/**
 * GET /api/v1/chat/:conversationId
 *
 * Returns a single conversation with participant profiles.
 * Returns 404 if the user is not a participant.
 */
const getConversationById = asyncHandler(async (req, res) => {
  const conversation = await chatService.getConversationById(
    req.params.conversationId,
    req.user.id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      'Conversation retrieved successfully.',
      { conversation }
    )
  );
});

// ─── getMessages ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/chat/:conversationId/messages
 *
 * Returns paginated message history, newest-first.
 * Returns 404 if the user is not a participant.
 */
const getMessages = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const { messages, meta } = await chatService.getMessages(
    req.params.conversationId,
    req.user.id,
    page,
    limit
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      'Messages retrieved successfully.',
      { messages },
      meta
    )
  );
});

// ─── sendMessage ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/chat/:conversationId/messages
 *
 * Sends a text message. Also emits a new_message socket event so connected
 * clients receive the message without polling.
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const message = await chatService.sendMessage(
    req.params.conversationId,
    req.user.id,
    content
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      'Message sent successfully.',
      { message }
    )
  );
});

// ─── sendImageMessage ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/chat/:conversationId/messages/image
 *
 * Uploads an image to Cloudinary and sends it as an image message.
 * Expects multipart/form-data with field name "image".
 * Also emits a new_message socket event.
 */
const sendImageMessage = asyncHandler(async (req, res) => {
  const message = await chatService.sendImageMessage(
    req.params.conversationId,
    req.user.id,
    req.file.buffer,
    req.file.mimetype
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      'Image message sent successfully.',
      { message }
    )
  );
});

module.exports = {
  getMyConversations,
  getConversationById,
  getMessages,
  sendMessage,
  sendImageMessage
};
