'use strict';

const crypto = require('crypto');

// ─── Token Generation ─────────────────────────────────────────────────────────

/**
 * generateSecureToken — Creates a cryptographically secure random token.
 *
 * Used for email verification links and password reset links.
 * The token is stored in plaintext in the database (email_verifications,
 * password_resets tables) because it is short-lived and the recipient
 * receives it only via email — no persistent session risk.
 *
 * Default 32 bytes → 64 hexadecimal characters.
 * This is sufficient entropy to make brute-force guessing infeasible.
 *
 * @param {number} [bytes=32] - Number of random bytes (output is 2× this in hex)
 * @returns {string} Hex-encoded random token
 */
function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * getTokenExpiry — Calculates an expiry timestamp `hours` from now.
 *
 * Used when inserting a new token row to set the `expires_at` column.
 * Returns a native Date object which pg serialises correctly to TIMESTAMPTZ.
 *
 * @param {number} hours - Number of hours until the token expires
 * @returns {Date} Expiry timestamp
 */
function getTokenExpiry(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

module.exports = { generateSecureToken, getTokenExpiry };
