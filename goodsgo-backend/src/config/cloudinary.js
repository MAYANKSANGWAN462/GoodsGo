'use strict';

const { v2: cloudinary } = require('cloudinary');

// ─── Configure Cloudinary ─────────────────────────────────────────────────────
// Reads credentials from environment variables.
// All three values are required — the SDK will silently fail on upload
// if any are missing, so we validate and warn at config time.

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  // Warn rather than exit — the server can still start and serve non-upload routes.
  // Any upload attempt will fail with a clear error from uploadImage.js.
  console.warn(
    '[Cloudinary] WARNING: One or more Cloudinary credentials are missing ' +
    '(CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). ' +
    'Image upload and deletion will fail until these are configured.'
  );
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true // Always use HTTPS for all generated URLs
});

// Confirm configuration in development (without printing secrets)
if (process.env.NODE_ENV === 'development' && CLOUD_NAME) {
  console.log(`[Cloudinary] Configured — cloud_name: "${CLOUD_NAME}"`);
}

// ─── Export the configured v2 instance ───────────────────────────────────────
// All callers use this same instance. No other file should call cloudinary.config().
// Usage:
//   const cloudinary = require('../config/cloudinary');
//   cloudinary.uploader.upload_stream(...);
//   cloudinary.uploader.destroy(publicId);
//   cloudinary.url(publicId, { sign_url: true });

module.exports = cloudinary;