'use strict';

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { randomUUID } = crypto;

// ─── Token Generation ─────────────────────────────────────────────────────────

/**
 * generateAccessToken — Issues a short-lived JWT for authenticating API requests.
 *
 * Signed with JWT_SECRET (user tokens only).
 * Payload includes role: 'user' so auth.middleware.js can reject admin tokens
 * presented to user endpoints, providing belt-and-suspenders role separation
 * beyond the cryptographic secret separation.
 *
 * @param {{ id: string }} user - User object with at minimum an `id` property
 * @returns {string} Signed JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

/**
 * generateRefreshToken — Issues a long-lived JWT stored as a hashed cookie.
 *
 * Signed with JWT_REFRESH_SECRET (separate from access token secret).
 * The plaintext token is stored as an httpOnly cookie; its SHA-256 hash
 * is stored in the refresh_tokens table. The plaintext is never persisted.
 *
 * @param {{ id: string }} user
 * @returns {string} Signed JWT refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, role: 'user', jti: randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

/**
 * generateAdminToken — Issues a short-lived JWT for admin authentication.
 *
 * Signed with JWT_ADMIN_SECRET — cryptographically distinct from user tokens.
 * A user JWT cannot be used on admin routes because verifyAdminToken() would
 * fail signature verification outright (not just an authorization check).
 *
 * @param {{ id: string, role: string }} admin - Admin user with id and role
 * @returns {string} Signed JWT admin access token
 */
function generateAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, role: admin.role },
    process.env.JWT_ADMIN_SECRET,
    { expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h' }
  );
}

// ─── Token Verification ───────────────────────────────────────────────────────

/**
 * verifyAccessToken — Verifies a user access token's signature and expiry.
 *
 * Throws JsonWebTokenError or TokenExpiredError on failure — both are caught
 * by the global error handler and mapped to 401 responses.
 *
 * @param {string} token - JWT access token from Authorization header
 * @returns {Object} Decoded payload { id, role, iat, exp }
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * verifyRefreshToken — Verifies a user refresh token's signature and expiry.
 *
 * @param {string} token - JWT refresh token from httpOnly cookie
 * @returns {Object} Decoded payload { id, role, iat, exp }
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

/**
 * verifyAdminToken — Verifies an admin token's signature and expiry.
 *
 * Uses a separate secret so admin tokens cannot be forged with the user secret.
 *
 * @param {string} token - JWT admin token from Authorization header
 * @returns {Object} Decoded payload { id, role, iat, exp }
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyAdminToken(token) {
  return jwt.verify(token, process.env.JWT_ADMIN_SECRET);
}

// ─── Token Hashing ────────────────────────────────────────────────────────────

/**
 * hashToken — Produces a SHA-256 hash of a token for secure database storage.
 *
 * Refresh tokens are stored only as SHA-256 hashes in the refresh_tokens table.
 * A database breach therefore cannot directly replay the tokens — the attacker
 * would need to find the preimage of the hash (computationally infeasible).
 *
 * @param {string} token - Plaintext token (JWT string)
 * @returns {string} Hex-encoded SHA-256 hash
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Expiry Helpers ───────────────────────────────────────────────────────────

/**
 * getRefreshTokenExpiry — Returns a Date matching JWT_REFRESH_EXPIRES_IN from now.
 *
 * Used when inserting into refresh_tokens.expires_at to provide a DB-level
 * expiry check as a belt-and-suspenders alongside the JWT's own exp claim.
 *
 * Parses the same shorthand formats jsonwebtoken accepts: Nd (days) or Nw (weeks).
 * Falls back to 7 days if the env var is absent or unparseable.
 *
 * @returns {Date}
 */
function getRefreshTokenExpiry() {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const match = raw.match(/^(\d+)([dw])$/i);
  let days = 7;
  if (match) {
    const n = parseInt(match[1], 10);
    days = match[2].toLowerCase() === 'w' ? n * 7 : n;
  } else {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) days = n;
  }
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateAdminToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyAdminToken,
  hashToken,
  getRefreshTokenExpiry
};
