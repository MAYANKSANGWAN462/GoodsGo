'use strict';

const usersService = require('./users.service');
const ApiResponse  = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

// ─── GET /users/me ────────────────────────────────────────────────────────────

/**
 * getMe — Returns the full profile of the authenticated user.
 * User is available on req.user (set by authenticate middleware).
 */
const getMe = asyncHandler(async (req, res) => {
  const profile = await usersService.getMyProfile(req.user.id);

  res.status(200).json(
    new ApiResponse(200, 'Profile retrieved successfully.', profile)
  );
});

// ─── PUT /users/me ────────────────────────────────────────────────────────────

/**
 * updateMe — Updates the authenticated user's profile fields.
 * req.body is validated and sanitised by validate(updateProfileSchema).
 */
const updateMe = asyncHandler(async (req, res) => {
  const updated = await usersService.updateProfile(req.user.id, req.body);

  res.status(200).json(
    new ApiResponse(200, 'Profile updated successfully.', updated)
  );
});

// ─── PUT /users/me/password ───────────────────────────────────────────────────

/**
 * changePassword — Changes the authenticated user's password.
 * req.body validated by validate(changePasswordSchema).
 * After success, all other device sessions are revoked.
 */
const changePassword = asyncHandler(async (req, res) => {
  await usersService.changePassword(
    req.user.id,
    req.body.current_password,
    req.body.new_password
  );

  res.status(200).json(
    new ApiResponse(
      200,
      'Password changed successfully. Other active sessions have been logged out.'
    )
  );
});

// ─── POST /users/me/avatar ────────────────────────────────────────────────────

/**
 * uploadAvatar — Uploads a new profile image for the authenticated user.
 * req.file is set by uploadAvatar middleware (multer memoryStorage).
 * requireFile('avatar') middleware guarantees req.file is not undefined here.
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  const result = await usersService.uploadAvatar(req.user.id, req.file);

  res.status(200).json(
    new ApiResponse(200, 'Profile image updated successfully.', result)
  );
});

// ─── DELETE /users/me/avatar ──────────────────────────────────────────────────

/**
 * removeAvatar — Deletes the authenticated user's profile image.
 */
const removeAvatar = asyncHandler(async (req, res) => {
  await usersService.removeAvatar(req.user.id);

  res.status(200).json(
    new ApiResponse(200, 'Profile image removed successfully.')
  );
});

// ─── GET /users/:userId ───────────────────────────────────────────────────────

/**
 * getPublicProfile — Returns the public profile of any active user.
 * req.params.userId is validated as UUID v4 by validate(userIdParamSchema, 'params').
 * Uses optionalAuth — req.user may be null for unauthenticated visitors.
 */
const getPublicProfile = asyncHandler(async (req, res) => {
  const profile = await usersService.getPublicProfile(req.params.userId);

  res.status(200).json(
    new ApiResponse(200, 'User profile retrieved successfully.', profile)
  );
});

// ─── DELETE /users/me ─────────────────────────────────────────────────────────

/**
 * deactivateAccount — Soft-deletes the authenticated user's account.
 * Revokes all sessions and sets active posts to inactive.
 * This action cannot be undone from the API (requires admin to restore).
 */
const deactivateAccount = asyncHandler(async (req, res) => {
  await usersService.deactivateAccount(req.user.id);

  res.status(200).json(
    new ApiResponse(
      200,
      'Your account has been deactivated. We are sorry to see you go.'
    )
  );
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getMe,
  updateMe,
  changePassword,
  uploadAvatar,
  removeAvatar,
  getPublicProfile,
  deactivateAccount
};