'use strict';

const asyncHandler          = require('../../utils/asyncHandler');
const ApiResponse           = require('../../utils/ApiResponse');
const { HTTP_STATUS }       = require('../../utils/constants');
const notificationsService  = require('./notifications.service');

/**
 * list — GET /api/v1/users/me/notifications
 *
 * Returns the authenticated user's notifications, paginated, newest-first.
 * Meta includes unreadCount for rendering the unread badge.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
const list = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const { notifications, meta } = await notificationsService.listNotifications(
    req.user.id,
    page,
    limit
  );

  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, 'Notifications retrieved', notifications, meta));
});

/**
 * markAllRead — PUT /api/v1/users/me/notifications/read-all
 *
 * Marks all of the authenticated user's unread notifications as read.
 * Idempotent: returns updatedCount 0 if there were no unread notifications.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationsService.markAllRead(req.user.id);

  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, 'All notifications marked as read', result));
});

/**
 * markOneRead — PUT /api/v1/users/me/notifications/:id/read
 *
 * Marks a single notification as read.
 * Idempotent: returns the notification unchanged if it was already read.
 * Returns 404 if the notification does not exist or belongs to another user.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
const markOneRead = asyncHandler(async (req, res) => {
  const notification = await notificationsService.markOneRead(req.user.id, req.params.id);

  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, 'Notification marked as read', notification));
});

module.exports = { list, markAllRead, markOneRead };
