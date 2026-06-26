'use strict';

const { commonSchemas } = require('../../middleware/validate.middleware');

/**
 * listNotificationsSchema — Validates pagination query params for GET /me/notifications.
 * Re-uses the project-wide pagination schema so page/limit coercion behaviour is consistent.
 */
const listNotificationsSchema = commonSchemas.pagination;

/**
 * notificationIdParamSchema — Validates :id route param for single-notification mutations.
 * Re-uses the project-wide UUID param schema (Joi.object { id: uuid }).
 */
const notificationIdParamSchema = commonSchemas.uuidParam;

module.exports = {
  listNotificationsSchema,
  notificationIdParamSchema
};
