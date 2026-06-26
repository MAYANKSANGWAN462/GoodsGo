'use strict';

const express = require('express');

const { authenticate }                           = require('../../middleware/auth.middleware');
const { validate }                               = require('../../middleware/validate.middleware');
const notificationsController                    = require('./notifications.controller');
const { listNotificationsSchema, notificationIdParamSchema } = require('./notifications.validator');

const router = express.Router();

// All notification routes require authentication.
// The router is mounted at /me/notifications in users.routes.js so every path
// here is relative to that prefix.

/**
 * GET /api/v1/users/me/notifications
 * Returns the authenticated user's notifications, paginated, newest-first.
 * Query params: page (default 1), limit (default 20, max 100).
 * Meta includes unreadCount for the notification badge.
 */
router.get(
  '/',
  authenticate,
  validate(listNotificationsSchema, 'query'),
  notificationsController.list
);

/**
 * PUT /api/v1/users/me/notifications/read-all
 * Marks every unread notification for the current user as read.
 * Idempotent — safe to call even when there are no unread notifications.
 *
 * ORDERING NOTE: This literal-path route MUST be declared before /:id/read.
 * Express matches routes in declaration order; without this ordering,
 * "read-all" would be captured as :id and fail UUID validation.
 */
router.put(
  '/read-all',
  authenticate,
  notificationsController.markAllRead
);

/**
 * PUT /api/v1/users/me/notifications/:id/read
 * Marks a single notification as read. :id must be a valid UUID v4.
 * Returns 404 if the notification does not exist or belongs to another user.
 */
router.put(
  '/:id/read',
  authenticate,
  validate(notificationIdParamSchema, 'params'),
  notificationsController.markOneRead
);

module.exports = router;
