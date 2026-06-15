'use strict';

const postsService = require('./posts.service');
const ApiResponse  = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * GET /api/v1/posts
 * Marketplace feed — all 3 post types, all filters.
 */
const getFeed = asyncHandler(async (req, res) => {
  const { posts, meta } = await postsService.getFeed(
    req.query,
    req.user ? req.user.id : null
  );

  res.status(200).json(
    new ApiResponse(200, 'Posts retrieved successfully.', posts, meta)
  );
});

/**
 * GET /api/v1/posts/search?q=<text>
 * Full-text search on post descriptions and city names.
 * Re-uses getFeed with the q param — search is a feed filter.
 */
const searchPosts = asyncHandler(async (req, res) => {
  if (!req.query.q || req.query.q.trim().length < 2) {
    return res.status(200).json(
      new ApiResponse(200, 'Search results.', [], { total: 0, page: 1, limit: 20, totalPages: 0 })
    );
  }

  const { posts, meta } = await postsService.getFeed(
    req.query,
    req.user ? req.user.id : null
  );

  res.status(200).json(
    new ApiResponse(200, 'Search results retrieved.', posts, meta)
  );
});

/**
 * GET /api/v1/posts/nearby?lat=<n>&lng=<n>&radius_km=<n>
 * Posts near a geographic coordinate.
 * Re-uses getFeed — nearby is a feed filter with lat/lng/radius.
 */
const getNearbyPosts = asyncHandler(async (req, res) => {
  const { posts, meta } = await postsService.getFeed(
    req.query,
    req.user ? req.user.id : null
  );

  res.status(200).json(
    new ApiResponse(200, 'Nearby posts retrieved.', posts, meta)
  );
});

/**
 * GET /api/v1/posts/:postId
 * Single post detail. Increments view_count.
 */
const getPostById = asyncHandler(async (req, res) => {
  const post = await postsService.getPostById(
    req.params.postId,
    req.user ? req.user.id : null
  );

  res.status(200).json(
    new ApiResponse(200, 'Post retrieved successfully.', post)
  );
});

/**
 * POST /api/v1/posts
 * Create a new post. req.files from uploadPostImages middleware.
 */
const createPost = asyncHandler(async (req, res) => {
  const post = await postsService.createPost(
    req.user.id,
    req.body,
    req.files || []
  );

  res.status(201).json(
    new ApiResponse(201, 'Post created successfully.', post)
  );
});

/**
 * PUT /api/v1/posts/:postId
 * Update own post. Images in req.files are added; existing images kept.
 */
const updatePost = asyncHandler(async (req, res) => {
  const post = await postsService.updatePost(
    req.params.postId,
    req.user.id,
    req.body,
    req.files || []
  );

  res.status(200).json(
    new ApiResponse(200, 'Post updated successfully.', post)
  );
});

/**
 * DELETE /api/v1/posts/:postId
 * Soft delete own post.
 */
const deletePost = asyncHandler(async (req, res) => {
  await postsService.deletePost(req.params.postId, req.user.id);

  res.status(200).json(
    new ApiResponse(200, 'Post deleted successfully.')
  );
});

/**
 * PUT /api/v1/posts/:postId/status
 * Toggle own post status between active and inactive.
 */
const updatePostStatus = asyncHandler(async (req, res) => {
  const result = await postsService.updatePostStatus(
    req.params.postId,
    req.user.id,
    req.body.status
  );

  res.status(200).json(
    new ApiResponse(200, `Post status updated to "${result.status}".`, result)
  );
});

/**
 * POST /api/v1/posts/:postId/save
 * Toggle save/unsave a post.
 */
const toggleSavePost = asyncHandler(async (req, res) => {
  const result = await postsService.toggleSavePost(
    req.params.postId,
    req.user.id
  );

  const message = result.saved
    ? 'Post saved to your list.'
    : 'Post removed from your saved list.';

  res.status(200).json(
    new ApiResponse(200, message, result)
  );
});

/**
 * POST /api/v1/posts/:postId/report
 * Report a post for review.
 */
const reportPost = asyncHandler(async (req, res) => {
  await postsService.reportPost(
    req.params.postId,
    req.user.id,
    req.body.reason,
    req.body.description
  );

  res.status(201).json(
    new ApiResponse(201, 'Post reported. Our team will review it shortly.')
  );
});

/**
 * GET /api/v1/posts/:postId/bookings
 * Get booking requests for a post (post owner only).
 * Full implementation activated in Block K.
 */
const getPostBookings = asyncHandler(async (req, res) => {
  const result = await postsService.getPostBookings(
    req.params.postId,
    req.user.id
  );

  res.status(200).json(
    new ApiResponse(200, 'Booking requests retrieved.', result.bookings, result.meta)
  );
});

/**
 * GET /api/v1/users/me/posts (mounted via users.routes in Block F)
 * Own posts — available from this block onward.
 */
const getMyPosts = asyncHandler(async (req, res) => {
  const { posts, meta } = await postsService.getMyPosts(
    req.user.id,
    req.query
  );

  res.status(200).json(
    new ApiResponse(200, 'Your posts retrieved successfully.', posts, meta)
  );
});

/**
 * GET /api/v1/users/me/saved-posts (mounted via users.routes in Block F)
 */
const getSavedPosts = asyncHandler(async (req, res) => {
  const { posts, meta } = await postsService.getSavedPosts(
    req.user.id,
    req.query
  );

  res.status(200).json(
    new ApiResponse(200, 'Saved posts retrieved successfully.', posts, meta)
  );
});

module.exports = {
  getFeed,
  searchPosts,
  getNearbyPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  updatePostStatus,
  toggleSavePost,
  reportPost,
  getPostBookings,
  getMyPosts,
  getSavedPosts
};