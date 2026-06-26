'use strict';

// ─── ApiResponse ──────────────────────────────────────────────────────────────

/**
 * ApiResponse — Standard success response shape for the GoodsGo API.
 *
 * Every successful controller response must use this class so the envelope
 * format is consistent: { success, statusCode, message, data?, meta? }.
 *
 * The frontend Axios interceptor is designed to unwrap this envelope once,
 * rather than having each call site parse it ad hoc.
 *
 * Usage:
 *   res.status(200).json(new ApiResponse(200, 'Retrieved successfully.', data));
 *   res.status(201).json(new ApiResponse(201, 'Created.', newRecord));
 *   res.status(200).json(new ApiResponse(200, 'Retrieved.', items, paginationMeta));
 *
 * @param {number} statusCode - HTTP status code (mirrored in body for client convenience)
 * @param {string} message    - Human-readable success message
 * @param {*}      [data]     - Response payload (object, array, or primitive)
 * @param {Object} [meta]     - Pagination or additional metadata
 */
class ApiResponse {
  constructor(statusCode, message, data = undefined, meta = undefined) {
    this.success    = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message    = message;

    if (data !== undefined) this.data = data;
    if (meta !== undefined) this.meta = meta;
  }
}

module.exports = ApiResponse;
