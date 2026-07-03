'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// config.service.js — Cached platform_settings reads (Phase 8, performance).
//
// Consolidates the getSetting()/getPlatformSetting() helpers previously
// duplicated across posts/bookings/payments/reviews services (documented
// tech debt — PROJECT_CONTEXT.md Section 32) into a single implementation
// with an in-memory TTL cache.
//
// Why: every createPost/acceptBooking/etc. issued 1–3 sequential SELECTs
// against platform_settings — a table that changes only via the admin panel.
// Caching removes those round trips from every mutating request.
//
// Invalidation strategy (two layers):
//   1. TTL: entries expire after 60s, so even an un-invalidated change
//      propagates within a minute.
//   2. Explicit: admin.service.updatePlatformSetting() calls
//      invalidatePlatformSettingsCache() after a successful UPDATE.
//
// NOTE: In-memory cache assumes the single-server-process architecture
// (CLAUDE.md Section 15) — same assumption as config.routes.js's options
// cache and the in-memory rate limiter. Needs a shared store before
// horizontal scaling.
// ─────────────────────────────────────────────────────────────────────────────

const { query } = require('../../config/database');

const CACHE_TTL_MS = 60_000;

/** @type {Map<string, { value: *, expiresAt: number }>} */
const cache = new Map();

/**
 * getPlatformSetting — Reads a single typed value from platform_settings,
 * served from an in-memory cache (60s TTL) after the first read.
 *
 * Parsing matches the previously duplicated helpers: 'number' → parseFloat,
 * 'boolean' → strict 'true' comparison, anything else returned as the raw
 * string. Falls back to `defaultValue` if the key is absent or the query fails.
 *
 * @param {string} key          - Setting key (see PLATFORM_SETTINGS in constants.js)
 * @param {*}      defaultValue - Fallback if the key is absent or the query fails
 * @returns {Promise<*>} Parsed setting value or the fallback
 */
async function getPlatformSetting(key, defaultValue) {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const result = await query(
      'SELECT value, value_type FROM platform_settings WHERE key = $1',
      [key]
    );
    if (result.rows.length === 0) return defaultValue;

    const { value, value_type } = result.rows[0];
    let parsed = value;
    if (value_type === 'number') parsed = parseFloat(value);
    else if (value_type === 'boolean') parsed = value === 'true';

    cache.set(key, { value: parsed, expiresAt: Date.now() + CACHE_TTL_MS });
    return parsed;
  } catch {
    // Deliberate: settings reads must never break the calling operation.
    return defaultValue;
  }
}

/**
 * invalidatePlatformSettingsCache — Drops all cached settings so the next
 * read hits the database. Called by the admin module after a setting update.
 *
 * @returns {void}
 */
function invalidatePlatformSettingsCache() {
  cache.clear();
}

module.exports = { getPlatformSetting, invalidatePlatformSettingsCache };
