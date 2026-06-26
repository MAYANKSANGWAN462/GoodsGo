'use strict';

// ─── asyncHandler ─────────────────────────────────────────────────────────────

/**
 * asyncHandler — Wraps an async Express route handler to catch rejected promises.
 *
 * Express 4.x does not natively catch errors from async middleware — if an
 * async handler throws or returns a rejected Promise, the request hangs forever
 * instead of being forwarded to the error handler. This wrapper fixes that.
 *
 * Every async controller function MUST be wrapped with asyncHandler.
 * Without this wrapper, an `await` that rejects will silently swallow the error
 * and the client will receive a timeout rather than an error response.
 *
 * Usage:
 *   const createPost = asyncHandler(async (req, res) => {
 *     const post = await postsService.createPost(req.user.id, req.body);
 *     res.status(201).json(new ApiResponse(201, 'Post created.', post));
 *   });
 *
 * @param {Function} fn - Async route handler: (req, res, next) => Promise<void>
 * @returns {Function} Express middleware that forwards rejections to next(err)
 */
function asyncHandler(fn) {
  return function asyncMiddleware(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
