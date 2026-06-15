'use strict';

const { query, getClient }              = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');
const { uploadAvatar: uploadAvatarUtil, deleteImage } = require('../../utils/uploadImage');
const ApiError                          = require('../../utils/ApiError');

// ─── Response Formatters ──────────────────────────────────────────────────────

/**
 * formatOwnProfile — Full profile for the authenticated user (GET /users/me).
 * Includes email, phone, and account metadata not shown on public profiles.
 * Never includes password_hash or internal fields.
 *
 * @param {Object} row - Row from users table
 * @returns {Object} Safe user profile object
 */
function formatOwnProfile(row) {
  return {
    id:                  row.id,
    email:               row.email,
    phone:               row.phone || null,
    fullName:            row.full_name,
    profileImageUrl:     row.profile_image_url || null,
    bio:                 row.bio || null,
    city:                row.city || null,
    state:               row.state || null,
    country:             row.country,
    isEmailVerified:     row.is_email_verified,
    isPhoneVerified:     row.is_phone_verified,
    isIdentityVerified:  row.is_identity_verified,
    rating:              parseFloat(row.rating) || 0,
    totalReviews:        row.total_reviews || 0,
    cancellationCount:   row.cancellation_count || 0,
    lastLoginAt:         row.last_login_at || null,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at
  };
}

/**
 * formatPublicProfile — Public-safe profile for GET /users/:userId.
 * Omits email, phone, and sensitive timestamps.
 * Only shows information appropriate for other platform users to see.
 *
 * @param {Object} row - Row from users table
 * @returns {Object} Public user profile object
 */
function formatPublicProfile(row) {
  return {
    id:                  row.id,
    fullName:            row.full_name,
    profileImageUrl:     row.profile_image_url || null,
    bio:                 row.bio || null,
    city:                row.city || null,
    state:               row.state || null,
    country:             row.country,
    isEmailVerified:     row.is_email_verified,
    isIdentityVerified:  row.is_identity_verified,
    rating:              parseFloat(row.rating) || 0,
    totalReviews:        row.total_reviews || 0,
    cancellationCount:   row.cancellation_count || 0,
    memberSince:         row.created_at
  };
}

// ─── getMyProfile ─────────────────────────────────────────────────────────────

/**
 * getMyProfile — Returns the full profile of the authenticated user.
 *
 * @param {string} userId - UUID from req.user.id (set by auth.middleware)
 * @returns {Promise<Object>} Own profile object
 */
async function getMyProfile(userId) {
  const result = await query(
    `SELECT
       id, email, phone, full_name, profile_image_url,
       bio, city, state, country,
       is_email_verified, is_phone_verified, is_identity_verified,
       rating, total_reviews, cancellation_count,
       last_login_at, created_at, updated_at
     FROM users
     WHERE id = $1
       AND deleted_at IS NULL`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('User');
  }

  return formatOwnProfile(result.rows[0]);
}

// ─── updateProfile ────────────────────────────────────────────────────────────

/**
 * updateProfile — Updates one or more profile fields for the authenticated user.
 *
 * Only the fields present in `data` are updated (PATCH semantics on PUT).
 * Empty string values for optional fields (bio, city, state, phone) are stored as NULL.
 *
 * @param {string} userId
 * @param {{
 *   full_name?: string,
 *   bio?: string,
 *   city?: string,
 *   state?: string,
 *   phone?: string | null
 * }} data - Validated and sanitised body from validate.middleware
 * @returns {Promise<Object>} Updated profile object
 */
async function updateProfile(userId, data) {
  const setClauses = [];
  const values     = [];
  let   paramIdx   = 1;

  // Whitelist of updatable columns — prevents mass assignment
  // Note: email is intentionally excluded (requires re-verification flow)
  const ALLOWED = ['full_name', 'bio', 'city', 'state', 'phone'];

  for (const field of ALLOWED) {
    if (data[field] === undefined) continue;

    // Normalise empty string to NULL for clearable optional fields
    const value = (field !== 'full_name' && data[field] === '') ? null : data[field];
    setClauses.push(`${field} = $${paramIdx++}`);
    values.push(value);
  }

  if (setClauses.length === 0) {
    throw ApiError.badRequest('No valid fields provided for update.');
  }

  // Phone uniqueness check — only run when a non-null phone is being set
  if (data.phone && data.phone !== '') {
    const phoneCheck = await query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2 AND deleted_at IS NULL',
      [data.phone, userId]
    );
    if (phoneCheck.rows.length > 0) {
      throw ApiError.conflict(
        'This phone number is already registered to another account.'
      );
    }
  }

  values.push(userId);

  const result = await query(
    `UPDATE users
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIdx}
       AND deleted_at IS NULL
     RETURNING
       id, email, phone, full_name, profile_image_url,
       bio, city, state, country,
       is_email_verified, is_phone_verified, is_identity_verified,
       rating, total_reviews, cancellation_count,
       last_login_at, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('User');
  }

  return formatOwnProfile(result.rows[0]);
}

// ─── changePassword ───────────────────────────────────────────────────────────

/**
 * changePassword — Verifies the current password then replaces it with a new one.
 *
 * Security properties:
 *  1. Verifies current password before accepting the change.
 *  2. Rejects if the new password is identical to the current one.
 *  3. Revokes ALL active refresh tokens after the change — forces re-login
 *     on all other devices. The current device retains its access token
 *     (valid for up to 15 more minutes) then must log in with the new password.
 *  4. Uses a DB transaction: password update and token revocation are atomic.
 *
 * @param {string} userId
 * @param {string} currentPassword - Plaintext current password
 * @param {string} newPassword     - Plaintext new password
 */
async function changePassword(userId, currentPassword, newPassword) {
  // 1. Fetch current hash
  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('User');
  }

  const { password_hash } = result.rows[0];

  // 2. Verify current password
  const isCurrentValid = await comparePassword(currentPassword, password_hash);
  if (!isCurrentValid) {
    throw new ApiError(
      400,
      'Current password is incorrect.',
      null,
      'INVALID_CURRENT_PASSWORD'
    );
  }

  // 3. Reject if new password is the same as the current one
  const isSamePassword = await comparePassword(newPassword, password_hash);
  if (isSamePassword) {
    throw ApiError.badRequest(
      'New password must be different from your current password.'
    );
  }

  // 4. Hash new password
  const newHash = await hashPassword(newPassword);

  // 5. Update password and revoke all sessions atomically
  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, userId]
    );

    // Revoke all active refresh tokens — all other devices are forced to re-login
    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW(), revoked_reason = 'password_change'
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── uploadAvatar ─────────────────────────────────────────────────────────────

/**
 * uploadAvatar — Uploads a new profile image and replaces the existing one.
 *
 * Steps:
 *  1. Upload new image to Cloudinary (validates MIME + magic bytes inside util).
 *  2. Update DB with new URL and public_id.
 *  3. Delete the old Cloudinary asset asynchronously (non-blocking).
 *
 * @param {string} userId
 * @param {Express.Multer.File} file - req.file from upload.middleware (memoryStorage)
 * @returns {Promise<{ profileImageUrl: string }>}
 */
async function uploadAvatar(userId, file) {
  // 1. Fetch the existing public_id so we can delete it after the upload succeeds
  const current = await query(
    'SELECT profile_image_public_id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (current.rows.length === 0) {
    throw ApiError.notFound('User');
  }

  const oldPublicId = current.rows[0].profile_image_public_id;

  // 2. Upload to Cloudinary — applies resize, quality optimisation, EXIF strip
  const uploaded = await uploadAvatarUtil(file.buffer, file.mimetype);

  // 3. Update user record with new URL and public_id
  await query(
    `UPDATE users
     SET profile_image_url = $1, profile_image_public_id = $2
     WHERE id = $3`,
    [uploaded.secureUrl, uploaded.publicId, userId]
  );

  // 4. Delete old image from Cloudinary — async, non-blocking
  //    A failed deletion is logged but does not affect the response
  if (oldPublicId) {
    setImmediate(() => {
      deleteImage(oldPublicId).catch((err) => {
        console.error('[Users] uploadAvatar: Failed to delete old avatar:', err.message);
      });
    });
  }

  return { profileImageUrl: uploaded.secureUrl };
}

// ─── removeAvatar ─────────────────────────────────────────────────────────────

/**
 * removeAvatar — Deletes the user's profile image from both DB and Cloudinary.
 *
 * @param {string} userId
 */
async function removeAvatar(userId) {
  const result = await query(
    'SELECT profile_image_public_id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('User');
  }

  const { profile_image_public_id } = result.rows[0];

  if (!profile_image_public_id) {
    throw ApiError.badRequest('No profile image to remove.');
  }

  // Clear DB columns first
  await query(
    'UPDATE users SET profile_image_url = NULL, profile_image_public_id = NULL WHERE id = $1',
    [userId]
  );

  // Delete from Cloudinary asynchronously
  setImmediate(() => {
    deleteImage(profile_image_public_id).catch((err) => {
      console.error('[Users] removeAvatar: Cloudinary delete failed:', err.message);
    });
  });
}

// ─── getPublicProfile ─────────────────────────────────────────────────────────

/**
 * getPublicProfile — Returns the public-safe profile of any active user.
 *
 * Used by GET /users/:userId — accessible to authenticated and unauthenticated users.
 * Returns 404 for suspended or deactivated accounts (same as "not found") to
 * avoid confirming the existence of suspended accounts.
 *
 * @param {string} targetUserId - UUID from validated route params
 * @returns {Promise<Object>} Public profile object
 */
async function getPublicProfile(targetUserId) {
  const result = await query(
    `SELECT
       id, full_name, profile_image_url, bio,
       city, state, country,
       is_email_verified, is_identity_verified,
       rating, total_reviews, cancellation_count,
       created_at
     FROM users
     WHERE id = $1
       AND deleted_at IS NULL
       AND is_active = TRUE`,
    [targetUserId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('User');
  }

  return formatPublicProfile(result.rows[0]);
}

// ─── deactivateAccount ────────────────────────────────────────────────────────

/**
 * deactivateAccount — Soft-deletes the user's account and cleans up active state.
 *
 * What happens atomically in a single transaction:
 *  1. Sets users.deleted_at = NOW() and is_active = FALSE (soft delete).
 *  2. Revokes all active refresh tokens (forces logout on all devices).
 *  3. Sets all of the user's active posts to 'inactive' — prevents orphaned
 *     active posts from appearing in the marketplace after account removal.
 *     (Posts table exists from migration 006 — safe to query here.)
 *
 * The user's historical data (bookings, reviews, payments) is retained for
 * data integrity. Counterparties can still see their booking history.
 *
 * @param {string} userId
 */
async function deactivateAccount(userId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Soft-delete the user
    const userResult = await client.query(
      `UPDATE users
       SET deleted_at = NOW(), is_active = FALSE
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING id`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw ApiError.notFound('User');
    }

    // 2. Revoke all active refresh tokens
    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW(), revoked_reason = 'account_deactivated'
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    // 3. Set all active posts to inactive
    //    Posts table exists (migration 006). Safe to query directly.
    await client.query(
      `UPDATE posts
       SET status = 'inactive'
       WHERE user_id = $1
         AND status = 'active'
         AND deleted_at IS NULL`,
      [userId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getMyProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  removeAvatar,
  getPublicProfile,
  deactivateAccount
};