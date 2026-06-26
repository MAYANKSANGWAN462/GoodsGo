'use strict';

const bcrypt = require('bcryptjs');

// ─── Cost Factor ──────────────────────────────────────────────────────────────
// bcrypt cost factor of 12 results in ~300ms hash time on typical hardware.
// This is deliberately slow to defend against brute-force attacks.
// Increasing to 13 roughly doubles the time — evaluate if upgrading hardware.
// NEVER reduce below 12 — see CLAUDE.md Security Requirements.

const BCRYPT_ROUNDS = 12;

// ─── hashPassword ─────────────────────────────────────────────────────────────

/**
 * hashPassword — Hashes a plaintext password with bcrypt.
 *
 * Always call this utility instead of bcrypt directly so the cost factor
 * is controlled in one place and never accidentally varied per call site.
 *
 * Passwords are capped at 128 characters in the Joi validator to prevent a
 * bcrypt cost-DoS attack (bcrypt cost scales with input length above 72 bytes
 * for some implementations — our bcryptjs version hashes up to 72 bytes but
 * the input cap provides defence-in-depth).
 *
 * @param {string} plaintext - The user-supplied password
 * @returns {Promise<string>} bcrypt hash string (60 characters, starts with $2b$)
 * @throws {Error} If plaintext is not a non-empty string
 */
async function hashPassword(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('[hashPassword] plaintext must be a non-empty string');
  }
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

// ─── comparePassword ─────────────────────────────────────────────────────────

/**
 * comparePassword — Compares a plaintext password against a stored bcrypt hash.
 *
 * bcrypt.compare() is constant-time — it always runs the full bcrypt computation
 * regardless of whether the password is correct, preventing timing attacks.
 *
 * Returns false (never throws) if the hash is malformed or plaintext is empty.
 * Callers must NOT use the return value to distinguish between "user not found"
 * and "wrong password" in the API response — both cases must produce the same
 * error message and response time. See auth.service.js for the dummy-hash pattern.
 *
 * @param {string} plaintext - User-supplied password attempt
 * @param {string} hash      - Stored bcrypt hash from the database
 * @returns {Promise<boolean>} true if the password matches the hash
 */
async function comparePassword(plaintext, hash) {
  if (!plaintext || !hash) return false;
  return bcrypt.compare(plaintext, hash);
}

module.exports = { hashPassword, comparePassword };
