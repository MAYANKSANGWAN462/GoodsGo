'use strict';

const cloudinary = require('../config/cloudinary');
const { CLOUDINARY_FOLDERS, UPLOAD_LIMITS } = require('./constants');

// ─── Magic Byte Signatures ────────────────────────────────────────────────────
// Each MIME type has a characteristic byte sequence at the start of the file.
// Checking these prevents a malicious user from renaming a dangerous file to
// .jpg and bypassing Multer's fileFilter (which only checks the declared MIME type).

const MAGIC_BYTES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF]
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47]
  ],
  'image/webp': [
    // RIFF....WEBP — bytes 0-3 are RIFF, bytes 8-11 are WEBP
    null // verified via riffCheck below
  ]
};

/**
 * verifyMagicBytes — Confirms a file buffer matches its declared MIME type.
 *
 * Security: Never trust the client-declared MIME type alone. A client can
 * send a PHP shell named "image.jpg" with Content-Type: image/jpeg. Magic
 * byte inspection detects this by reading the actual file header.
 *
 * @param {Buffer} buffer   - File buffer from Multer memoryStorage
 * @param {string} mimeType - Declared MIME type from Multer (req.file.mimetype)
 * @returns {boolean} true if the buffer header matches the declared type
 */
function verifyMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length < 12) return false;

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47
    );
  }

  if (mimeType === 'image/webp') {
    // RIFF signature at bytes 0-3 and WEBP signature at bytes 8-11
    const isRiff =
      buffer[0] === 0x52 && buffer[1] === 0x49 &&
      buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp =
      buffer[8]  === 0x57 && buffer[9]  === 0x45 &&
      buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

/**
 * uploadToCloudinary — Internal helper: uploads a buffer to Cloudinary.
 *
 * Wraps the stream-based Cloudinary upload_stream in a Promise so it can
 * be awaited. Multer uses memoryStorage so all file data is already in memory.
 *
 * @param {Buffer} buffer          - File buffer
 * @param {string} folder          - Cloudinary folder path
 * @param {Object} [options={}]    - Additional Cloudinary upload options
 * @returns {Promise<Object>} Cloudinary upload result { secure_url, public_id, ... }
 */
function uploadToCloudinary(buffer, folder, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'image',
      // Strip EXIF metadata (GPS coordinates, device info) for privacy
      transformation: [{ flags: 'strip_profile' }],
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

// ─── Public Upload Functions ──────────────────────────────────────────────────

/**
 * uploadAvatar — Uploads a user profile image to Cloudinary.
 *
 * Performs double verification (MIME header check in Multer, magic-byte check here).
 * Applies avatar-specific dimension constraints and EXIF stripping.
 *
 * @param {Buffer} buffer          - Image buffer from Multer
 * @param {string} mimeType        - Declared MIME type (e.g. 'image/jpeg')
 * @param {string} [existingPublicId] - Public ID of the existing avatar to replace
 * @returns {Promise<{ url: string, publicId: string }>}
 * @throws {Error} If the file fails magic-byte verification
 */
async function uploadAvatar(buffer, mimeType, existingPublicId = null) {
  if (!verifyMagicBytes(buffer, mimeType)) {
    throw new Error('File type verification failed. Only JPEG, PNG, and WebP images are accepted.');
  }

  const options = {
    width:   UPLOAD_LIMITS.AVATAR_MAX_WIDTH,
    height:  UPLOAD_LIMITS.AVATAR_MAX_HEIGHT,
    crop:    'fill',
    gravity: 'face',
    quality: 'auto:good',
    fetch_format: 'auto'
  };

  if (existingPublicId) {
    // Overwrite the existing asset using its public_id (saves storage quota)
    options.public_id    = existingPublicId.split('/').pop();
    options.overwrite    = true;
    options.invalidate   = true;
  }

  const result = await uploadToCloudinary(buffer, CLOUDINARY_FOLDERS.AVATARS, options);

  return {
    url:      result.secure_url,
    publicId: result.public_id
  };
}

/**
 * uploadPostImage — Uploads a post image to Cloudinary.
 *
 * @param {Buffer} buffer   - Image buffer from Multer
 * @param {string} mimeType - Declared MIME type
 * @returns {Promise<{ url: string, publicId: string }>}
 * @throws {Error} If magic-byte verification fails
 */
async function uploadPostImage(buffer, mimeType) {
  if (!verifyMagicBytes(buffer, mimeType)) {
    throw new Error('File type verification failed. Only JPEG, PNG, and WebP images are accepted.');
  }

  const options = {
    width:        UPLOAD_LIMITS.POST_IMAGE_MAX_WIDTH,
    height:       UPLOAD_LIMITS.POST_IMAGE_MAX_HEIGHT,
    crop:         'limit',
    quality:      'auto:good',
    fetch_format: 'auto'
  };

  const result = await uploadToCloudinary(buffer, CLOUDINARY_FOLDERS.POSTS, options);

  return {
    url:      result.secure_url,
    publicId: result.public_id
  };
}

/**
 * uploadChatImage — Uploads an image message to Cloudinary's chat folder.
 *
 * @param {Buffer} buffer   - Image buffer from Multer
 * @param {string} mimeType - Declared MIME type
 * @returns {Promise<{ url: string, publicId: string }>}
 * @throws {Error} If magic-byte verification fails
 */
async function uploadChatImage(buffer, mimeType) {
  if (!verifyMagicBytes(buffer, mimeType)) {
    throw new Error('File type verification failed. Only JPEG, PNG, and WebP images are accepted.');
  }

  const options = {
    width:        1200,
    height:       900,
    crop:         'limit',
    quality:      'auto:good',
    fetch_format: 'auto'
  };

  const result = await uploadToCloudinary(buffer, CLOUDINARY_FOLDERS.CHAT, options);

  return {
    url:      result.secure_url,
    publicId: result.public_id
  };
}

/**
 * uploadIdentityDocument — Uploads a KYC document to Cloudinary's private folder.
 *
 * Stored in a private folder — access only via time-limited signed URLs.
 * Higher resolution allowed than post images because document text must be readable.
 *
 * @param {Buffer} buffer   - Document image buffer from Multer
 * @param {string} mimeType - Declared MIME type
 * @returns {Promise<{ url: string, publicId: string }>}
 * @throws {Error} If magic-byte verification fails
 */
async function uploadIdentityDocument(buffer, mimeType) {
  if (!verifyMagicBytes(buffer, mimeType)) {
    throw new Error('File type verification failed. Only JPEG, PNG, and WebP images are accepted.');
  }

  const options = {
    width:        2000,
    height:       2000,
    crop:         'limit',
    quality:      90,
    type:         'private',  // Private — not publicly accessible via URL
    fetch_format: 'auto'
  };

  const result = await uploadToCloudinary(buffer, CLOUDINARY_FOLDERS.KYC, options);

  return {
    url:      result.secure_url,
    publicId: result.public_id
  };
}

/**
 * deleteImage — Deletes an image from Cloudinary by its public ID.
 *
 * Used when a user removes their avatar, a post is deleted, or an image
 * is replaced. Always pass the full public_id (including folder path).
 *
 * Logs but does not throw on failure — a Cloudinary error should not abort
 * the primary DB operation (e.g. the post is still deleted even if the
 * Cloudinary cleanup fails; the orphaned image can be cleaned up later).
 *
 * @param {string} publicId - Cloudinary public ID (e.g. 'goodsgo/avatars/abc123')
 * @returns {Promise<void>}
 */
async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`[Cloudinary] deleteImage failed for "${publicId}":`, err.message);
  }
}

/**
 * generateSignedUrl — Creates a time-limited signed URL for private Cloudinary assets.
 *
 * Used by the admin module to give time-limited access to KYC document images
 * without making the documents permanently public.
 *
 * @param {string} publicId   - Cloudinary public ID of the private asset
 * @param {Object} [options]  - Cloudinary URL options (e.g. { expires_at, transformation })
 * @returns {string} Time-limited signed URL
 */
function generateSignedUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    sign_url: true,
    type:     'private',
    ...options
  });
}

module.exports = {
  uploadAvatar,
  uploadPostImage,
  uploadChatImage,
  uploadIdentityDocument,
  deleteImage,
  generateSignedUrl,
  verifyMagicBytes // Exported for use in upload.middleware.js's double-check
};
