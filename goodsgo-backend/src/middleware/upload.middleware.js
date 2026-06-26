'use strict';

const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { UPLOAD_LIMITS } = require('../utils/constants');

// ─── File Filter ──────────────────────────────────────────────────────────────

/**
 * imageFileFilter — Validates MIME type before Multer buffers the file.
 *
 * This is the first line of defence against invalid file uploads.
 * Multer calls this function synchronously for each file. If we call
 * callback(error), Multer stops processing and the error flows to our
 * wrapMulter error handler.
 *
 * Second line of defence (magic bytes) is in uploadImage.js (A-16).
 * Two independent checks at different layers prevents disguised files.
 *
 * @param {import('express').Request} req
 * @param {Express.Multer.File} file - Multer file object (buffer not yet filled)
 * @param {Function} callback - callback(error | null, acceptFile: boolean)
 */
const imageFileFilter = (req, file, callback) => {
  if (UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true); // Accept
  } else {
    // Pass an ApiError — wrapMulter will forward it to next(err)
    callback(
      ApiError.badRequest(
        `Invalid file type "${file.mimetype}". ` +
        `Only JPEG, PNG, and WebP images are accepted.`
      ),
      false // Reject
    );
  }
};

// ─── Base Multer Instance ─────────────────────────────────────────────────────

/**
 * Base Multer configuration shared across all upload handlers.
 *
 * memoryStorage: Files are buffered in RAM as Buffer objects.
 * They are NEVER written to disk — this is critical because:
 *   1. The server has limited disk space
 *   2. We stream the buffer directly to Cloudinary (no disk intermediate)
 *   3. Avoids file cleanup logic and orphaned temp files
 *
 * limits.fileSize: Enforced per-file BEFORE the full file is buffered.
 * Multer rejects the file as soon as it would exceed the limit.
 *
 * limits.files: Maximum number of files per request (applies to array/fields uploads).
 */
const multerBase = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES,  // 5MB per file
    files: UPLOAD_LIMITS.MAX_POST_IMAGES,          // Max 5 files per request
    fields: 20,                                    // Max 20 non-file fields
    parts: 30                                      // Max 30 total parts
  },
  fileFilter: imageFileFilter
});

// ─── Multer Error Wrapper ─────────────────────────────────────────────────────

/**
 * wrapMulter — Wraps any Multer middleware to correctly forward errors.
 *
 * Problem:
 *   By default, Multer calls next(err) with its own MulterError instances.
 *   These are NOT instanceof ApiError, so without this wrapper they'd fall
 *   through to the catch-all in errorHandler.middleware.js as 500 errors
 *   rather than the correct 400 errors.
 *
 * Solution:
 *   Run the multer middleware manually. Intercept its callback.
 *   Convert MulterError to ApiError. Forward ApiError from fileFilter unchanged.
 *   Forward any other errors to the global handler.
 *
 * @param {Function} multerMiddleware - A configured multer single/array/fields call
 * @returns {import('express').RequestHandler}
 */
function wrapMulter(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return next(); // No error — proceed to route handler

      // ── ApiError from fileFilter ──────────────────────────────────────────
      // Our imageFileFilter passes an ApiError when MIME type is wrong.
      if (err instanceof ApiError) {
        return next(err);
      }

      // ── MulterError — convert to ApiError ─────────────────────────────────
      if (err instanceof multer.MulterError) {
        const maxMB = UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES / (1024 * 1024);

        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return next(ApiError.badRequest(
              `File too large. Maximum allowed size is ${maxMB}MB per file.`
            ));

          case 'LIMIT_FILE_COUNT':
            return next(ApiError.badRequest(
              `Too many files. Maximum ${UPLOAD_LIMITS.MAX_POST_IMAGES} images are allowed per upload.`
            ));

          case 'LIMIT_UNEXPECTED_FILE':
            return next(ApiError.badRequest(
              `Unexpected file field "${err.field}". ` +
              `Please use the correct field name for this endpoint.`
            ));

          case 'LIMIT_PART_COUNT':
            return next(ApiError.badRequest(
              'Too many form parts in the upload request.'
            ));

          case 'LIMIT_FIELD_KEY':
            return next(ApiError.badRequest('A form field name is too long.'));

          case 'LIMIT_FIELD_VALUE':
            return next(ApiError.badRequest('A form field value is too long.'));

          case 'LIMIT_FIELD_COUNT':
            return next(ApiError.badRequest('Too many form fields in the request.'));

          default:
            return next(ApiError.badRequest(`File upload error: ${err.message}`));
        }
      }

      // ── Any other error — forward to global handler ────────────────────────
      next(err);
    });
  };
}

// ─── Named Upload Handlers ────────────────────────────────────────────────────
// Each handler is a wrapped Multer middleware configured for a specific use case.
// Use by name in route files — never call multer directly in routes.

/**
 * uploadAvatar — Single image upload for user profile avatar.
 *
 * Field name in multipart form: "avatar"
 * After this middleware: req.file contains the uploaded file buffer
 *
 * Used in:
 *   PUT /api/v1/users/me/avatar   (users.routes.js — Block G)
 */
const uploadAvatar = wrapMulter(multerBase.single('avatar'));

/**
 * uploadPostImages — Multiple image upload for post listings.
 *
 * Field name in multipart form: "images"
 * Maximum files: UPLOAD_LIMITS.MAX_POST_IMAGES (5)
 * After this middleware: req.files is an array of file objects
 *
 * Used in:
 *   POST /api/v1/posts            (posts.routes.js — Block H)
 *   PUT  /api/v1/posts/:postId    (posts.routes.js — Block H)
 */
const uploadPostImages = wrapMulter(
  multerBase.array('images', UPLOAD_LIMITS.MAX_POST_IMAGES)
);

/**
 * uploadSingleImage — Single image upload for chat image messages.
 *
 * Field name in multipart form: "image"
 * After this middleware: req.file contains the uploaded file buffer
 *
 * Used in:
 *   POST /api/v1/chat/:conversationId/messages/image  (chat.routes.js — Block L)
 */
const uploadSingleImage = wrapMulter(multerBase.single('image'));

/**
 * uploadDocument — Single image upload for identity verification (single-side).
 *
 * Field name in multipart form: "document"
 * After this middleware: req.file contains the uploaded file buffer
 *
 * Used in:
 *   POST /api/v1/users/me/verification/submit  (users.routes.js — Block G)
 */
const uploadDocument = wrapMulter(multerBase.single('document'));

/**
 * uploadDocumentFields — Multi-field KYC document upload (front, back, selfie).
 *
 * Field names in multipart form: "front", "back", "selfie"
 * After this middleware: req.files is an object keyed by field name:
 *   { front: [FileObject], back: [FileObject], selfie: [FileObject] }
 *
 * All three fields are optional individually — use requireFile() to enforce.
 *
 * Used in:
 *   POST /api/v1/users/me/verification/submit  (users.routes.js — Block G)
 */
const uploadDocumentFields = wrapMulter(
  multerBase.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
  ])
);

// ─── Post-Upload Guards ───────────────────────────────────────────────────────

/**
 * requireFile — Validates that at least one file was uploaded.
 *
 * Place AFTER an upload middleware to enforce file presence.
 * Multer does NOT error when no file is uploaded — it simply sets
 * req.file to undefined. This guard provides the error.
 *
 * @param {string} [fieldName] - Optional specific field name to check.
 *   If omitted, checks req.file (single) or any file in req.files (array/fields).
 * @returns {import('express').RequestHandler}
 *
 * Usage:
 *   router.post('/me/avatar',
 *     authenticate,
 *     uploadAvatar,
 *     requireFile('avatar'),   // Ensures a file was provided
 *     asyncHandler(userController.uploadAvatar)
 *   );
 *
 *   router.post('/posts',
 *     authenticate,
 *     uploadPostImages,
 *     // No requireFile here — post images are optional
 *     asyncHandler(postController.createPost)
 *   );
 */
const requireFile = (fieldName) => (req, res, next) => {
  let hasFile = false;

  if (fieldName) {
    // Check for a specific named field
    if (req.file && req.file.fieldname === fieldName) {
      hasFile = true;
    } else if (req.files) {
      if (Array.isArray(req.files)) {
        hasFile = req.files.some((f) => f.fieldname === fieldName);
      } else {
        // req.files is an object keyed by field name (from .fields())
        hasFile = Array.isArray(req.files[fieldName]) && req.files[fieldName].length > 0;
      }
    }
  } else {
    // Check for any file at all
    if (req.file) {
      hasFile = true;
    } else if (req.files) {
      if (Array.isArray(req.files)) {
        hasFile = req.files.length > 0;
      } else {
        hasFile = Object.keys(req.files).some(
          (key) => Array.isArray(req.files[key]) && req.files[key].length > 0
        );
      }
    }
  }

  if (!hasFile) {
    return next(
      ApiError.badRequest(
        fieldName
          ? `No file uploaded. Please provide a file for the "${fieldName}" field.`
          : 'No file uploaded. Please select a file and try again.'
      )
    );
  }

  next();
};

module.exports = {
  uploadAvatar,
  uploadPostImages,
  uploadSingleImage,
  uploadDocument,
  uploadDocumentFields,
  requireFile
};