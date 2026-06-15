'use strict';

const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');

// ─── PostgreSQL Error Code Mapping ────────────────────────────────────────────
// pg throws errors with a `code` property — 5-character PostgreSQL error codes.
// We map the most common ones to HTTP responses so database errors surface
// as clean API errors rather than 500s.
// Full list: https://www.postgresql.org/docs/current/errcodes-appendix.html

const PG_ERROR_MAP = {
  // Class 22 — Data Exception
  '22001': { status: 400, message: 'A value exceeds the maximum allowed length.' },
  '22P02': { status: 400, message: 'Invalid ID format. Please use a valid UUID.' },
  '22003': { status: 400, message: 'A numeric value is out of the allowed range.' },

  // Class 23 — Integrity Constraint Violation
  '23502': { status: 400, message: 'A required field is missing a value.' },
  '23503': { status: 422, message: 'This action references a record that does not exist.' },
  '23505': { status: 409, message: 'A record with this value already exists.' },
  '23514': { status: 400, message: 'A value violates a check constraint.' },

  // Class 57 — Operator Intervention
  '57014': { status: 408, message: 'The database query was cancelled due to timeout.' }
};

// ─── Multer Error Code Mapping ────────────────────────────────────────────────

const MULTER_ERROR_MESSAGES = {
  LIMIT_FILE_SIZE:        'File is too large. Maximum allowed size is 5MB.',
  LIMIT_FILE_COUNT:       'Too many files uploaded at once.',
  LIMIT_UNEXPECTED_FILE:  'An unexpected file field was received.',
  LIMIT_PART_COUNT:       'Too many form parts in the upload.',
  LIMIT_FIELD_KEY:        'A form field name is too long.',
  LIMIT_FIELD_VALUE:      'A form field value is too long.',
  LIMIT_FIELD_COUNT:      'Too many form fields in the request.'
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extracts a meaningful conflict message from a PostgreSQL unique violation.
 * pg populates err.detail with: 'Key (column_name)=(value) already exists.'
 *
 * @param {Error} err - pg error with code '23505'
 * @returns {string} Human-readable conflict message
 */
function extractUniqueViolationMessage(err) {
  if (err.detail) {
    const match = err.detail.match(/Key \((.+?)\)=/);
    if (match) {
      // Convert snake_case column to readable label: "user_email" → "user email"
      const field = match[1].replace(/_/g, ' ');
      return `A record with this ${field} already exists.`;
    }
  }
  return 'A record with this value already exists.';
}

/**
 * Determines if an error originated from the pg (node-postgres) library.
 * pg errors have a 5-character alphanumeric `code` property.
 *
 * @param {Error} err
 * @returns {boolean}
 */
function isPostgresError(err) {
  return (
    err.code &&
    typeof err.code === 'string' &&
    /^[0-9A-Z]{5}$/.test(err.code) &&
    err.severity !== undefined // pg errors always have severity
  );
}

/**
 * Logs an error to the console.
 * In production, replace console.error with your APM/monitoring service
 * (e.g. Sentry, Datadog, New Relic).
 *
 * @param {Error} err
 * @param {import('express').Request} req
 */
function logError(err, req) {
  const timestamp = new Date().toISOString();
  const context = `[${timestamp}] ${req.method} ${req.originalUrl}`;

  if (err.isOperational) {
    // Operational errors: known, expected — warn level only
    console.warn(`${context} → ${err.statusCode} "${err.message}"`);
  } else {
    // Programmer errors: unexpected — full stack trace at error level
    console.error(`${context} → UNEXPECTED ERROR`);
    console.error(err.stack || err.message);
    // TODO: Send to monitoring service (Sentry.captureException(err))
  }
}

// ─── Global Error Handler ──────────────────────────────────────────────────────

/**
 * errorHandler — Global Express error-handling middleware.
 *
 * Must be registered as the LAST app.use() call in app.js.
 * Express identifies error-handling middleware by its 4-parameter signature.
 * Called when any route/middleware calls next(err) or throws inside asyncHandler.
 *
 * Response contract (matches ApiError shape):
 *   {
 *     "success": false,
 *     "message": "Human-readable error message",
 *     "code": "MACHINE_READABLE_CODE",
 *     "errors": [{ "field": "email", "message": "..." }]  ← validation only
 *   }
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next - Required even if unused (4-param signature)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Never log in test environment
  if (process.env.NODE_ENV !== 'test') {
    logError(err, req);
  }

  // ── 1. ApiError (our own operational errors) ──────────────────────────────
  // These are intentionally thrown throughout the codebase.
  if (err instanceof ApiError) {
    const response = {
      success: false,
      message: err.message,
      code: err.code
    };
    if (err.errors && err.errors.length > 0) {
      response.errors = err.errors;
    }
    return res.status(err.statusCode).json(response);
  }

  // ── 2. JWT Errors (from jsonwebtoken library) ─────────────────────────────
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired. Please log in again.',
      code: ERROR_CODES.TOKEN_EXPIRED
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token. Please log in again.',
      code: ERROR_CODES.TOKEN_INVALID
    });
  }

  if (err.name === 'NotBeforeError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is not yet active.',
      code: ERROR_CODES.TOKEN_INVALID
    });
  }

  // ── 3. PostgreSQL Errors (from pg library) ────────────────────────────────
  if (isPostgresError(err)) {
    const mapping = PG_ERROR_MAP[err.code];
    if (mapping) {
      let message = mapping.message;

      // Extract a more specific message for unique violations
      if (err.code === '23505') {
        message = extractUniqueViolationMessage(err);
      }

      return res.status(mapping.status).json({
        success: false,
        message,
        code: err.code === '23505'
          ? ERROR_CODES.CONFLICT
          : ERROR_CODES.VALIDATION_ERROR
      });
    }

    // Unmapped PostgreSQL error — treat as internal
    console.error(`[DB] Unmapped PostgreSQL error code: ${err.code}`, err.message);
    return res.status(500).json({
      success: false,
      message: 'A database error occurred. Please try again.',
      code: ERROR_CODES.INTERNAL_ERROR
    });
  }

  // ── 4. Multer Errors (from multer library / upload.middleware.js) ─────────
  // Note: upload.middleware.js wraps multer and converts most errors to ApiError.
  // This handles any that slip through.
  if (err.constructor && err.constructor.name === 'MulterError') {
    const message = MULTER_ERROR_MESSAGES[err.code] || `Upload error: ${err.message}`;
    return res.status(400).json({
      success: false,
      message,
      code: ERROR_CODES.VALIDATION_ERROR
    });
  }

  // ── 5. JSON Body Parse Error (malformed JSON from client) ─────────────────
  // express.json() calls next(err) with a SyntaxError when the body is invalid JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format in request body. Please check your request.',
      code: ERROR_CODES.VALIDATION_ERROR
    });
  }

  // ── 6. Request Payload Too Large ──────────────────────────────────────────
  // Thrown by express.json({ limit: '10kb' }) when body exceeds limit
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body exceeds the size limit.',
      code: ERROR_CODES.VALIDATION_ERROR
    });
  }

  // ── 7. CORS Error ─────────────────────────────────────────────────────────
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'Cross-origin request blocked.',
      code: ERROR_CODES.AUTHORIZATION_FAILED
    });
  }

  // ── 8. Catch-all: Unexpected / Programmer Errors ──────────────────────────
  // At this point, we have an error we did not anticipate.
  // NEVER expose error internals (stack trace, SQL, file paths) in production.
  const isProduction = process.env.NODE_ENV === 'production';

  return res.status(500).json({
    success: false,
    message: isProduction
      ? 'Something went wrong on our end. Please try again later.'
      : (err.message || 'Internal server error'),
    code: ERROR_CODES.INTERNAL_ERROR,
    // Only include stack in development for easier debugging
    ...((!isProduction && err.stack) && { stack: err.stack.split('\n').slice(0, 5) })
  });
};

module.exports = errorHandler;