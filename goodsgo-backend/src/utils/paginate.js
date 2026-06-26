'use strict';

const { PAGINATION } = require('./constants');

// ─── paginate ─────────────────────────────────────────────────────────────────

/**
 * paginate — Sanitises page / limit query parameters and returns a safe offset.
 *
 * Prevents out-of-range values from reaching SQL queries:
 *   - page < 1 → clamped to 1
 *   - limit < 1 → clamped to 1
 *   - limit > maxLimit → clamped to maxLimit
 *   - non-integer / NaN → falls back to sensible defaults
 *
 * @param {number|string} page     - Requested page number (1-indexed)
 * @param {number|string} limit    - Requested page size
 * @param {number}        [maxLimit] - Upper bound for limit (default: PAGINATION.MAX_LIMIT)
 * @returns {{ safePage: number, safeLimit: number, offset: number }}
 */
function paginate(page, limit, maxLimit = PAGINATION.MAX_LIMIT) {
  const safePage  = Math.max(1, parseInt(page, 10)  || PAGINATION.DEFAULT_PAGE);
  const safeLimit = Math.min(
    maxLimit,
    Math.max(1, parseInt(limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );
  const offset = (safePage - 1) * safeLimit;

  return { safePage, safeLimit, offset };
}

/**
 * buildMeta — Constructs the standard pagination metadata object.
 *
 * @param {number} total     - Total number of records matching the query
 * @param {number} safePage  - Current page (from paginate())
 * @param {number} safeLimit - Page size (from paginate())
 * @returns {Object} Pagination meta for ApiResponse
 */
function buildMeta(total, safePage, safeLimit) {
  const totalPages = Math.ceil(total / safeLimit) || 1;
  return {
    total,
    page:            safePage,
    limit:           safeLimit,
    totalPages,
    hasNextPage:     safePage < totalPages,
    hasPreviousPage: safePage > 1
  };
}

module.exports = paginate;
module.exports.buildMeta = buildMeta;
