'use strict';

const { query, getClient }          = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');
const { generateAccessToken, generateRefreshToken, generateAdminToken, verifyRefreshToken, hashToken, getRefreshTokenExpiry } = require('../../utils/generateTokens');
const { generateSecureToken, getTokenExpiry } = require('../../utils/generateOTP');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
} = require('../../utils/sendEmail');
const ApiError = require('../../utils/ApiError');
const { emitToUser }    = require('../../config/socket');
const { SOCKET_EVENTS } = require('../../utils/constants');

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

/**
 * REFRESH TOKEN EXPIRY in milliseconds — must match JWT_REFRESH_EXPIRES_IN.
 * Used as the cookie maxAge so the cookie and JWT expire at the same time.
 */
const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * setRefreshTokenCookie — Sets the refresh token as an httpOnly cookie.
 *
 * Security properties:
 *   httpOnly: true  → JavaScript cannot read this cookie (prevents XSS token theft)
 *   secure: true    → Only sent over HTTPS in production
 *   sameSite: strict → Not sent on cross-origin requests (CSRF protection)
 *   path: /api/v1/auth → Cookie only sent to auth endpoints (limits exposure surface)
 *
 * @param {import('express').Response} res
 * @param {string} token - Plaintext refresh JWT
 */
function setRefreshTokenCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    path:     '/api/v1/auth'
  });
}

/**
 * clearRefreshTokenCookie — Removes the refresh token cookie.
 * Must use the same options as setRefreshTokenCookie (except maxAge).
 *
 * @param {import('express').Response} res
 */
function clearRefreshTokenCookie(res) {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/api/v1/auth'
  });
}

/**
 * getRefreshTokenFromRequest — Parses the refresh token from the Cookie header.
 *
 * Why manual parsing instead of cookie-parser middleware?
 *   Avoids adding a new npm dependency just for cookie reading.
 *   The logic is simple, secure, and transparent.
 *
 * @param {import('express').Request} req
 * @returns {string|null} Token value or null if not present
 */
function getRefreshTokenFromRequest(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const name  = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    if (name === 'refresh_token') {
      try {
        return decodeURIComponent(value);
      } catch {
        return null;
      }
    }
  }
  return null;
}

// ─── register ─────────────────────────────────────────────────────────────────

/**
 * register — Creates a new user account and sends a verification email.
 *
 * Security:
 *   - Returns the same 201 whether the email is new or a duplicate (to prevent
 *     enumeration)... actually NO — we DO tell the user the email is taken because
 *     the user who is registering with that email needs to know to log in instead.
 *     This is acceptable UX tradeoff; the attacker already has the email anyway.
 *
 * @param {{ email: string, password: string, full_name: string, phone?: string }} data
 * @returns {Promise<{ id: string, email: string, full_name: string }>}
 */
async function register({ email, password, full_name, phone }) {
  // 1. Check email uniqueness
  const existing = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    throw ApiError.conflict(
      'An account with this email address already exists. Please log in instead.'
    );
  }

  // 2. Hash password (cost = 12, ~300ms intentionally)
  const password_hash = await hashPassword(password);

  // 3. Insert user
  const result = await query(
    `INSERT INTO users (email, phone, password_hash, full_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, is_email_verified, created_at`,
    [email, phone || null, password_hash, full_name]
  );

  const user = result.rows[0];

  // 4. Send verification email — async, does not block the response
  //    setImmediate defers until after the current event loop tick completes
  setImmediate(async () => {
    try {
      const token     = generateSecureToken(32);   // 64-char hex
      const expiresAt = getTokenExpiry(1);           // 1 hour

      await query(
        `INSERT INTO email_verifications (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      await sendVerificationEmail(user.email, user.full_name, verificationUrl);
    } catch (err) {
      console.error('[Auth] register: Failed to send verification email:', err.message);
    }
  });

  return {
    id:        user.id,
    email:     user.email,
    full_name: user.full_name
  };
}

// ─── login ────────────────────────────────────────────────────────────────────

/**
 * login — Validates credentials, issues access token + refresh token cookie.
 *
 * Timing-attack prevention:
 *   bcrypt.compare() is always called, even when the user does not exist.
 *   This ensures response time is constant (~300ms) regardless of whether
 *   the email is found, preventing attackers from enumerating valid emails
 *   via response time differences.
 *
 * @param {{ email: string, password: string }} credentials
 * @param {import('express').Response} res — needed to set cookie
 * @returns {Promise<{ accessToken: string, user: Object }>}
 */
async function login({ email, password }, res) {
  // 1. Look up user
  const result = await query(
    `SELECT id, email, phone, full_name, password_hash, profile_image_url,
            is_email_verified, is_active, suspended_at, deleted_at,
            rating, total_reviews
     FROM users
     WHERE email = $1`,
    [email]
  );

  const user = result.rows[0] || null;

  // 2. Compare password — ALWAYS runs to prevent timing attacks
  //    If user not found, compare against a dummy hash (same bcrypt cost)
  const DUMMY_HASH = '$2b$12$invalidhashusedfortimingpreventiononly123456789';
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;
  const isPasswordValid = await comparePassword(password, hashToCompare);

  // 3. Evaluate result — single generic error for both "no user" and "wrong password"
  if (!user || !isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  // 4. Check account state
  if (user.deleted_at) {
    throw ApiError.unauthorized(
      'This account has been deactivated. Please contact support if you believe this is an error.'
    );
  }

  if (!user.is_active || user.suspended_at) {
    throw new ApiError(
      403,
      'Your account has been suspended. Please contact GoodsGo support.',
      null,
      'ACCOUNT_SUSPENDED'
    );
  }

  if (!user.is_email_verified) {
    throw new ApiError(
      403,
      'Please verify your email address before logging in. Check your inbox for a verification link, or request a new one.',
      null,
      'EMAIL_NOT_VERIFIED'
    );
  }

  // 5. Generate tokens
  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // 6. Store hashed refresh token in database
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshTokenExpiry();

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  // 7. Set httpOnly cookie with refresh token
  setRefreshTokenCookie(res, refreshToken);

  // 8. Update last login timestamp (fire-and-forget)
  setImmediate(() => {
    query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id])
      .catch((err) => console.error('[Auth] login: last_login_at update failed:', err.message));
  });

  return {
    accessToken,
    user: {
      id:               user.id,
      email:            user.email,
      fullName:         user.full_name,
      phone:            user.phone            || null,
      profileImageUrl:  user.profile_image_url,
      isEmailVerified:  user.is_email_verified,
      rating:           parseFloat(user.rating)  || 0,
      totalReviews:     user.total_reviews        || 0
    }
  };
}

// ─── logout ───────────────────────────────────────────────────────────────────

/**
 * logout — Revokes the refresh token and clears the cookie.
 *
 * Always succeeds — even if no cookie present or token already revoked.
 * The cookie is cleared regardless of DB operation outcome.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function logout(req, res) {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (refreshToken) {
    try {
      const tokenHash = hashToken(refreshToken);
      await query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW(), revoked_reason = 'logout'
         WHERE token_hash = $1 AND revoked_at IS NULL`,
        [tokenHash]
      );
    } catch (err) {
      // Log but continue — always clear the cookie
      console.error('[Auth] logout: Token revocation error:', err.message);
    }
  }

  clearRefreshTokenCookie(res);
}

// ─── refreshAccessToken ───────────────────────────────────────────────────────

/**
 * refreshAccessToken — Verifies refresh token, rotates it, issues new access token.
 *
 * Token Rotation:
 *   Every call revokes the old refresh token and issues a new one.
 *   This limits the useful lifetime of any stolen token to one use.
 *
 * Reuse Detection:
 *   If a revoked token is presented, ALL tokens for that user are immediately
 *   revoked — indicating the original token was stolen and the attacker used it
 *   before the legitimate user did (or vice versa).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<{ accessToken: string }>}
 */
async function refreshAccessToken(req, res) {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    throw ApiError.unauthorized(
      'No refresh token found. Please log in again.'
    );
  }

  // 1. Verify JWT signature and expiry
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    clearRefreshTokenCookie(res);
    if (err.name === 'TokenExpiredError') {
      throw ApiError.tokenExpired();
    }
    throw ApiError.unauthorized('Invalid refresh token. Please log in again.');
  }

  // 2. Hash and look up stored token
  const tokenHash = hashToken(refreshToken);
  const tokenResult = await query(
    `SELECT id, user_id, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );

  if (tokenResult.rows.length === 0) {
    clearRefreshTokenCookie(res);
    throw ApiError.unauthorized('Refresh token not found. Please log in again.');
  }

  const storedToken = tokenResult.rows[0];

  // 3. Reuse detection — if token is already revoked, revoke the entire user session
  if (storedToken.revoked_at) {
    // This means someone is replaying a previously used token — session theft indicator
    await query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW(), revoked_reason = 'reuse_detected'
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [storedToken.user_id]
    );
    clearRefreshTokenCookie(res);
    console.warn(`[Auth] SECURITY: Refresh token reuse detected for user ${storedToken.user_id}`);
    throw ApiError.unauthorized(
      'Security alert: Suspicious activity detected on your account. Please log in again.'
    );
  }

  // 4. Check DB-level expiry (belt-and-suspenders alongside JWT expiry)
  if (new Date() > new Date(storedToken.expires_at)) {
    clearRefreshTokenCookie(res);
    throw ApiError.tokenExpired();
  }

  // 5. Fetch current user state (account may have been suspended since token was issued)
  const userResult = await query(
    `SELECT id, email, phone, full_name, profile_image_url, is_email_verified,
            is_active, suspended_at, deleted_at, rating, total_reviews
     FROM users
     WHERE id = $1`,
    [storedToken.user_id]
  );

  if (userResult.rows.length === 0) {
    clearRefreshTokenCookie(res);
    throw ApiError.unauthorized('User account not found. Please log in again.');
  }

  const user = userResult.rows[0];

  if (user.deleted_at || !user.is_active || user.suspended_at) {
    clearRefreshTokenCookie(res);
    throw ApiError.unauthorized('Account is no longer active. Please contact support.');
  }

  // 6. Rotate: revoke old token, issue new token
  await query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW(), revoked_reason = 'rotation'
     WHERE id = $1`,
    [storedToken.id]
  );

  const newRefreshToken = generateRefreshToken(user);
  const newTokenHash    = hashToken(newRefreshToken);
  const newExpiresAt    = getRefreshTokenExpiry();

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, newTokenHash, newExpiresAt]
  );

  // 7. Issue new access token and rotate cookie
  const newAccessToken = generateAccessToken(user);
  setRefreshTokenCookie(res, newRefreshToken);

  return {
    accessToken: newAccessToken,
    user: {
      id:              user.id,
      email:           user.email,
      fullName:        user.full_name,
      phone:           user.phone            || null,
      profileImageUrl: user.profile_image_url,
      isEmailVerified: user.is_email_verified,
      rating:          parseFloat(user.rating) || 0,
      totalReviews:    user.total_reviews      || 0
    }
  };
}

// ─── verifyEmail ──────────────────────────────────────────────────────────────

/**
 * verifyEmail — Marks the user's email as verified using the token from the email link.
 *
 * @param {string} token - 64-char hex token from email link
 */
async function verifyEmail(token) {
  // 1. Find token record
  const result = await query(
    `SELECT id, user_id, expires_at, used_at
     FROM email_verifications
     WHERE token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    throw ApiError.badRequest(
      'Invalid verification link. Please request a new verification email.'
    );
  }

  const verification = result.rows[0];

  // 2. Already verified
  if (verification.used_at) {
    throw new ApiError(
      400,
      'This email address has already been verified. Please log in.',
      null,
      'ALREADY_VERIFIED'
    );
  }

  // 3. Expired
  if (new Date() > new Date(verification.expires_at)) {
    throw ApiError.badRequest(
      'This verification link has expired. Please request a new one from the login page.'
    );
  }

  // 4. Mark user verified and consume token — in a transaction
  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE users
       SET is_email_verified = TRUE, updated_at = NOW()
       WHERE id = $1`,
      [verification.user_id]
    );

    await client.query(
      `UPDATE email_verifications
       SET used_at = NOW()
       WHERE id = $1`,
      [verification.id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // 5. Notify the user's own socket connection so every "Verify Email" banner
  //    disappears immediately without requiring a page refresh.
  try {
    emitToUser(verification.user_id, SOCKET_EVENTS.USER_UPDATED, {
      userId:          verification.user_id,
      isEmailVerified: true
    });
  } catch (socketErr) {
    console.warn('[Auth] verifyEmail: Socket emission failed:', socketErr.message);
  }

  // 6. Send welcome email (async — does not block response)
  setImmediate(async () => {
    try {
      const userResult = await query(
        'SELECT email, full_name FROM users WHERE id = $1',
        [verification.user_id]
      );
      if (userResult.rows.length > 0) {
        const { email, full_name } = userResult.rows[0];
        await sendWelcomeEmail(email, full_name);
      }
    } catch (err) {
      console.error('[Auth] verifyEmail: Failed to send welcome email:', err.message);
    }
  });
}

// ─── forgotPassword ───────────────────────────────────────────────────────────

/**
 * forgotPassword — Sends a password reset email if the account exists.
 *
 * Anti-enumeration: Always returns immediately; all DB + email work is async.
 * The caller always receives a 200 response regardless of whether the user exists.
 *
 * @param {string} email
 */
async function forgotPassword(email) {
  // All work is deferred to prevent email enumeration via timing
  setImmediate(async () => {
    try {
      const result = await query(
        `SELECT id, full_name, is_active
         FROM users
         WHERE email = $1 AND deleted_at IS NULL`,
        [email]
      );

      // Silently do nothing if user not found or inactive
      if (result.rows.length === 0 || !result.rows[0].is_active) return;

      const user = result.rows[0];

      // Invalidate any existing unexpired reset tokens for this user
      await query(
        `UPDATE password_resets
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()`,
        [user.id]
      );

      // Issue new reset token
      const token     = generateSecureToken(32);  // 64-char hex
      const expiresAt = getTokenExpiry(1);          // 1 hour

      await query(
        `INSERT INTO password_resets (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, user.full_name, resetUrl);

    } catch (err) {
      console.error('[Auth] forgotPassword: Error:', err.message);
    }
  });
}

// ─── resetPassword ────────────────────────────────────────────────────────────

/**
 * resetPassword — Validates reset token and updates the user's password.
 *
 * Security:
 *   - Token is single-use (used_at is set on success)
 *   - ALL refresh tokens for the user are revoked, forcing re-login on all devices
 *   - Runs as a transaction to prevent partial state on DB error
 *
 * @param {string} token - 64-char hex token from reset email
 * @param {string} newPassword - New plaintext password
 */
async function resetPassword(token, newPassword) {
  // 1. Find valid, unused, unexpired token
  const result = await query(
    `SELECT id, user_id, expires_at, used_at
     FROM password_resets
     WHERE token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    throw ApiError.badRequest(
      'Invalid or expired password reset link. Please request a new one.'
    );
  }

  const resetRecord = result.rows[0];

  if (resetRecord.used_at) {
    throw ApiError.badRequest(
      'This password reset link has already been used. Please request a new one if needed.'
    );
  }

  if (new Date() > new Date(resetRecord.expires_at)) {
    throw ApiError.badRequest(
      'This password reset link has expired. Please request a new one.'
    );
  }

  // 2. Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // 3. Update in a transaction: change password, consume token, revoke all sessions
  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE users
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, resetRecord.user_id]
    );

    await client.query(
      `UPDATE password_resets
       SET used_at = NOW()
       WHERE id = $1`,
      [resetRecord.id]
    );

    // Revoke ALL active refresh tokens for this user.
    // Forces re-login on all devices after a password change.
    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW(), revoked_reason = 'password_change'
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [resetRecord.user_id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── resendVerification ───────────────────────────────────────────────────────

/**
 * resendVerification — Issues a fresh verification email.
 *
 * Anti-enumeration: Always returns immediately; all work is async.
 * Silently does nothing if user doesn't exist or is already verified.
 *
 * @param {string} email
 */
async function resendVerification(email) {
  setImmediate(async () => {
    try {
      const result = await query(
        `SELECT id, full_name, is_email_verified, is_active
         FROM users
         WHERE email = $1 AND deleted_at IS NULL`,
        [email]
      );

      if (result.rows.length === 0) return;

      const user = result.rows[0];

      // Do nothing if already verified or inactive
      if (user.is_email_verified || !user.is_active) return;

      // Invalidate all existing verification tokens for this user
      await query(
        `UPDATE email_verifications
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );

      // Issue fresh token
      const token     = generateSecureToken(32);
      const expiresAt = getTokenExpiry(1);

      await query(
        `INSERT INTO email_verifications (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      await sendVerificationEmail(email, user.full_name, verificationUrl);

    } catch (err) {
      console.error('[Auth] resendVerification: Error:', err.message);
    }
  });
}

// ─── adminLogin ───────────────────────────────────────────────────────────────

/**
 * adminLogin — Validates admin credentials and issues an admin JWT.
 *
 * Queries admin_users (not users) and signs the token with JWT_ADMIN_SECRET
 * (not JWT_SECRET). The resulting token passes authenticateAdmin middleware.
 *
 * The JWT payload uses role: 'admin' as a type discriminator so authenticateAdmin
 * can distinguish admin tokens from user tokens. The actual admin role level
 * (moderator / admin / super_admin) is resolved from the DB on every protected
 * request by authenticateAdmin's live lookup — not from the JWT payload.
 *
 * Timing-attack prevention: bcrypt.compare() always runs, even when the admin
 * account is not found, matching the same pattern as login().
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ adminToken: string, admin: Object }>}
 * @throws {ApiError} 401 on bad credentials, 403 on deactivated account
 */
async function adminLogin({ email, password }) {
  const result = await query(
    `SELECT id, email, full_name, password_hash, role, is_active
     FROM admin_users
     WHERE email = $1`,
    [email]
  );

  const admin = result.rows[0] || null;

  const DUMMY_HASH = '$2b$12$invalidhashusedfortimingpreventiononly123456789';
  const hashToCompare = admin ? admin.password_hash : DUMMY_HASH;
  const isPasswordValid = await comparePassword(password, hashToCompare);

  if (!admin || !isPasswordValid) {
    throw ApiError.unauthorized('Invalid admin credentials.');
  }

  if (!admin.is_active) {
    throw ApiError.forbidden(
      'This admin account has been deactivated. Please contact your system administrator.'
    );
  }

  // JWT role is always 'admin' so authenticateAdmin can type-discriminate.
  // The real adminRole (moderator/admin/super_admin) comes from the DB lookup
  // in authenticateAdmin on each subsequent request.
  const adminToken = generateAdminToken({ id: admin.id, role: 'admin' });

  setImmediate(() => {
    query('UPDATE admin_users SET last_login_at = NOW() WHERE id = $1', [admin.id])
      .catch((err) => console.error('[Auth] adminLogin: last_login_at update failed:', err.message));
  });

  return {
    adminToken,
    admin: {
      id:        admin.id,
      email:     admin.email,
      fullName:  admin.full_name,
      adminRole: admin.role
    }
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  register,
  login,
  adminLogin,
  logout,
  refreshAccessToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerification
};