'use strict';

const { ERROR_CODES, HTTP_STATUS } = require('./constants');

// ─── Default Code Map ─────────────────────────────────────────────────────────
const STATUS_CODE_MAP = {
  [HTTP_STATUS.BAD_REQUEST]:       ERROR_CODES.VALIDATION_ERROR,
  [HTTP_STATUS.UNAUTHORIZED]:      ERROR_CODES.AUTHENTICATION_FAILED,
  [HTTP_STATUS.FORBIDDEN]:         ERROR_CODES.AUTHORIZATION_FAILED,
  [HTTP_STATUS.NOT_FOUND]:         ERROR_CODES.NOT_FOUND,
  [HTTP_STATUS.CONFLICT]:          ERROR_CODES.CONFLICT,
  [HTTP_STATUS.UNPROCESSABLE]:     ERROR_CODES.BUSINESS_RULE_VIOLATION,
  [HTTP_STATUS.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMIT_EXCEEDED,
  [HTTP_STATUS.INTERNAL_SERVER]:   ERROR_CODES.INTERNAL_ERROR
};

// ─── ApiError ─────────────────────────────────────────────────────────────────

/**
 * ApiError — The single error class used throughout GoodsGo.
 *
 * All application errors thrown in service/controller code must be ApiError
 * instances or created via the factory methods below.
 * The global error handler (errorHandler.middleware.js) inspects `isOperational`
 * to decide whether to leak details to the client.
 *
 * @param {number} statusCode - HTTP status code
 * @param {string} message    - Human-readable error message
 * @param {Array}  [errors]   - Field-level validation errors [{field, message}]
 * @param {string} [code]     - Machine-readable error code
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = null, code = null) {
    super(message);
    this.name          = 'ApiError';
    this.statusCode    = statusCode;
    this.message       = message;
    this.errors        = errors || null;
    this.code          = code || STATUS_CODE_MAP[statusCode] || ERROR_CODES.INTERNAL_ERROR;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // ─── Factory Methods ─────────────────────────────────────────────────────────

  /**
   * @param {string} [resource='Resource']
   * @returns {ApiError}
   */
  static notFound(resource = 'Resource') {
    return new ApiError(
      HTTP_STATUS.NOT_FOUND,
      `${resource} not found.`,
      null,
      ERROR_CODES.NOT_FOUND
    );
  }

  /**
   * @param {string} [message]
   * @returns {ApiError}
   */
  static unauthorized(message = 'Authentication required. Please log in.') {
    return new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      message,
      null,
      ERROR_CODES.AUTHENTICATION_FAILED
    );
  }

  /**
   * @param {string} [message]
   * @returns {ApiError}
   */
  static forbidden(message = 'You do not have permission to perform this action.') {
    return new ApiError(
      HTTP_STATUS.FORBIDDEN,
      message,
      null,
      ERROR_CODES.AUTHORIZATION_FAILED
    );
  }

  /**
   * @param {string} [message]
   * @returns {ApiError}
   */
  static badRequest(message = 'Invalid request.') {
    return new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      message,
      null,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  /**
   * @param {string} [message]
   * @returns {ApiError}
   */
  static conflict(message = 'A conflict occurred with an existing record.') {
    return new ApiError(
      HTTP_STATUS.CONFLICT,
      message,
      null,
      ERROR_CODES.CONFLICT
    );
  }

  /**
   * businessRule — 422 for business-rule violations (well-formed request, wrong state).
   * @param {string} message
   * @param {string} [code]
   * @returns {ApiError}
   */
  static businessRule(message, code = ERROR_CODES.BUSINESS_RULE_VIOLATION) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE, message, null, code);
  }

  /**
   * @returns {ApiError} 429 Too Many Requests
   */
  static rateLimitExceeded() {
    return new ApiError(
      HTTP_STATUS.TOO_MANY_REQUESTS,
      'Too many requests. Please wait before trying again.',
      null,
      ERROR_CODES.RATE_LIMIT_EXCEEDED
    );
  }

  /**
   * tokenExpired — 401 with TOKEN_EXPIRED code.
   * Signals the client to trigger a silent token refresh.
   * @returns {ApiError}
   */
  static tokenExpired() {
    return new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Your session has expired. Please refresh your access token.',
      null,
      ERROR_CODES.TOKEN_EXPIRED
    );
  }

  /**
   * internal — 500 programmer error. Sets isOperational = false so the handler
   * returns a generic message in production and does not leak implementation details.
   * @param {string} [message]
   * @returns {ApiError}
   */
  static internal(message = 'An unexpected error occurred. Please try again later.') {
    const err = new ApiError(
      HTTP_STATUS.INTERNAL_SERVER,
      message,
      null,
      ERROR_CODES.INTERNAL_ERROR
    );
    err.isOperational = false;
    return err;
  }
}

module.exports = ApiError;
