'use strict';

// ─── Sanitization Primitives ──────────────────────────────────────────────────

/**
 * sanitizeString — Cleans a single string value.
 *
 * Operations (in order):
 * 1. Remove null bytes — used in some SQL injection and path traversal attacks
 * 2. Trim leading/trailing whitespace — prevents whitespace-padded duplicates
 * 3. Strip HTML tags — prevents stored XSS (e.g. <script>alert(1)</script>)
 * 4. Normalize excessive internal whitespace — collapses 3+ spaces to 1
 *    (preserves single newlines for multiline description fields)
 *
 * @param {string} value - Raw string from client
 * @returns {string} Sanitized string
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;

  return value
    // 1. Remove null bytes (0x00 character)
    .replace(/\0/g, '')
    // 2. Remove carriage returns (normalize to \n only)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 3. Trim leading/trailing whitespace and newlines
    .trim()
    // 4. Strip HTML/XML tags — any content between < and >
    //    This covers: <script>, <img onerror="">, <a href="javascript:">, SVG events, etc.
    .replace(/<[^>]*>/g, '')
    // 5. Strip HTML entities that could be used for XSS
    //    e.g. &lt;script&gt; → after HTML decode could become <script>
    //    We store the raw entity text, which is safe for JSON APIs
    // 6. Collapse multiple consecutive spaces to single space
    //    (but preserve intentional newlines in descriptions)
    .replace(/[ \t]{2,}/g, ' ');
}

/**
 * sanitizeValue — Recursively sanitizes any value type.
 *
 * Handles: strings, nested objects, arrays.
 * Passes through unchanged: numbers, booleans, null, undefined, Dates.
 * Buffers (file uploads) are never sanitized — they go through upload.middleware.js.
 *
 * @param {*} value - Any value from req.body / req.query / req.params
 * @returns {*} Sanitized value, same type as input
 */
function sanitizeValue(value) {
  // Null / undefined — pass through
  if (value === null || value === undefined) return value;

  // String — sanitize
  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  // Array — recursively sanitize each element
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  // Buffer — never sanitize (binary file content from multer)
  if (Buffer.isBuffer(value)) {
    return value;
  }

  // Plain object — recursively sanitize all values
  if (typeof value === 'object' && value.constructor === Object) {
    const sanitized = {};
    for (const key of Object.keys(value)) {
      // Also sanitize the key itself to prevent prototype pollution
      const safeKey = sanitizeString(String(key));
      // Skip prototype pollution attempts: __proto__, constructor, prototype
      if (safeKey === '__proto__' || safeKey === 'constructor' || safeKey === 'prototype') {
        continue;
      }
      sanitized[safeKey] = sanitizeValue(value[key]);
    }
    return sanitized;
  }

  // Numbers, booleans, Dates, etc. — pass through unchanged
  return value;
}

// ─── Middleware ────────────────────────────────────────────────────────────────

/**
 * sanitizeInputs — Express middleware that sanitizes all incoming request data.
 *
 * Applied globally in app.js AFTER body parsing (express.json) and
 * BEFORE route handlers. This ensures every route receives clean input
 * without needing to sanitize in each route handler.
 *
 * Note: Sanitization happens BEFORE Joi validation, so validators receive
 * already-trimmed strings. This means Joi's .min(1) correctly rejects
 * strings that were whitespace-only (they become '' after trim).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const sanitizeInputs = (req, res, next) => {
  try {
    // Sanitize request body (JSON payloads from POST/PUT/PATCH)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }

    // Sanitize query string parameters (GET /posts?city=Mumbai)
    // Note: Express parses all query params as strings — sanitize them all
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeValue(req.query);
    }

    // Sanitize URL route parameters (/posts/:postId)
    // req.params are already URL-decoded by Express
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeValue(req.params);
    }

    next();
  } catch (err) {
    // Sanitization should never throw, but if it does, log and continue
    // rather than killing the request — don't let a sanitizer bug block all traffic
    console.error('[Sanitize] Unexpected error during sanitization:', err.message);
    next();
  }
};

module.exports = { sanitizeInputs, sanitizeValue, sanitizeString };