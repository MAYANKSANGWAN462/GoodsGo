'use strict';

const { query, getClient }    = require('../../config/database');
const { uploadPostImage, deleteImage } = require('../../utils/uploadImage');
const { buildHaversineSQL }   = require('../../utils/calculateDistance');
const ApiError                = require('../../utils/ApiError');
const {
  POST_TYPES,
  POST_STATUS,
  ALLOWED_POST_SORT_COLUMNS,
  SORT_ORDERS
}                              = require('../../utils/constants');

// ─── Settings helpers ─────────────────────────────────────────────────────────

async function getPlatformSetting(key, defaultValue) {
  try {
    const result = await query(
      'SELECT value, value_type FROM platform_settings WHERE key = $1',
      [key]
    );
    if (result.rows.length === 0) return defaultValue;
    const { value, value_type } = result.rows[0];
    if (value_type === 'number') return parseFloat(value);
    if (value_type === 'boolean') return value === 'true';
    return value;
  } catch {
    return defaultValue;
  }
}

// ─── Response formatter ───────────────────────────────────────────────────────

function formatPost(row, requestingUserId = null) {
  return {
    id:                   row.id,
    postType:             row.post_type,
    status:               row.status,
    description:          row.description || null,
    viewCount:            row.view_count || 0,

    origin: {
      address: row.origin_address,
      city:    row.origin_city    || null,
      state:   row.origin_state   || null,
      lat:     parseFloat(row.origin_lat),
      lng:     parseFloat(row.origin_lng)
    },

    destination: row.destination_address ? {
      address: row.destination_address,
      city:    row.destination_city    || null,
      state:   row.destination_state   || null,
      lat:     row.destination_lat ? parseFloat(row.destination_lat) : null,
      lng:     row.destination_lng ? parseFloat(row.destination_lng) : null
    } : null,

    vehicle: {
      type:              row.vehicle_type          || null,
      capacityKg:        row.vehicle_capacity_kg   ? parseFloat(row.vehicle_capacity_kg)   : null,
      remainingCapacityKg: row.remaining_capacity_kg ? parseFloat(row.remaining_capacity_kg) : null
    },

    goods: row.post_type === POST_TYPES.NEED_TRANSPORT ? {
      type:       row.goods_type     || null,
      category:   row.goods_category || null,
      weightKg:   row.goods_weight_kg ? parseFloat(row.goods_weight_kg) : null,
      lengthCm:   row.goods_length_cm ? parseFloat(row.goods_length_cm) : null,
      widthCm:    row.goods_width_cm  ? parseFloat(row.goods_width_cm)  : null,
      heightCm:   row.goods_height_cm ? parseFloat(row.goods_height_cm) : null,
      isFragile:  row.is_fragile || false
    } : null,

    pricing: {
      budgetMin:        row.budget_min        ? parseFloat(row.budget_min)        : null,
      budgetMax:        row.budget_max        ? parseFloat(row.budget_max)        : null,
      priceExpectation: row.price_expectation ? parseFloat(row.price_expectation) : null
    },

    availabilityDate: row.availability_date,
    expiresAt:        row.expires_at || null,

    images: Array.isArray(row.images) ? row.images.filter(Boolean) : [],

    owner: {
      id:                 row.owner_id,
      fullName:           row.owner_full_name,
      profileImageUrl:    row.owner_profile_image_url || null,
      isIdentityVerified: row.owner_is_identity_verified || false,
      rating:             parseFloat(row.owner_rating) || 0,
      totalReviews:       row.owner_total_reviews || 0
    },

    isOwner:   requestingUserId ? row.owner_id === requestingUserId : false,
    isSaved:   row.is_saved   || false,

    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ─── Base SELECT fragment ─────────────────────────────────────────────────────
// Used in both getFeed and getPostById to ensure consistent shape.

const POST_SELECT = `
  p.*,
  u.id            AS owner_id,
  u.full_name     AS owner_full_name,
  u.profile_image_url AS owner_profile_image_url,
  u.is_identity_verified AS owner_is_identity_verified,
  u.rating        AS owner_rating,
  u.total_reviews AS owner_total_reviews,
  COALESCE(
    json_agg(pi.image_url ORDER BY pi.display_order ASC)
    FILTER (WHERE pi.id IS NOT NULL),
    '[]'
  ) AS images
`;

// ─── getFeed ──────────────────────────────────────────────────────────────────

async function getFeed(filters = {}, requestingUserId = null) {
  const {
    post_type, vehicle_type, goods_category,
    origin_city, destination_city,
    date_from, date_to,
    min_price, max_price,
    lat, lng, radius_km = 50,
    sort_by = 'created_at', sort_order = 'desc',
    page = 1, limit = 20,
    q
  } = filters;

  const whereClauses = [
    "p.status = 'active'",
    'p.deleted_at IS NULL'
  ];
  const params = [];
  let   idx    = 1;

  // post_type — comma-separated or single
  if (post_type) {
    const types = post_type.split(',').map((t) => t.trim()).filter(Boolean);
    const validTypes = types.filter((t) => Object.values(POST_TYPES).includes(t));
    if (validTypes.length > 0) {
      whereClauses.push(`p.post_type = ANY($${idx++}::post_type_enum[])`);
      params.push(validTypes);
    }
  }

  // vehicle_type — comma-separated
  if (vehicle_type) {
    const types = vehicle_type.split(',').map((t) => t.trim()).filter(Boolean);
    if (types.length > 0) {
      whereClauses.push(`p.vehicle_type = ANY($${idx++}::varchar[])`);
      params.push(types);
    }
  }

  if (goods_category) {
    whereClauses.push(`p.goods_category = $${idx++}`);
    params.push(goods_category);
  }

  if (origin_city) {
    whereClauses.push(`p.origin_city ILIKE $${idx++}`);
    params.push(`%${origin_city}%`);
  }

  if (destination_city) {
    whereClauses.push(`p.destination_city ILIKE $${idx++}`);
    params.push(`%${destination_city}%`);
  }

  if (date_from) {
    whereClauses.push(`p.availability_date >= $${idx++}`);
    params.push(date_from);
  }

  if (date_to) {
    whereClauses.push(`p.availability_date <= $${idx++}`);
    params.push(date_to);
  }

  if (min_price) {
    whereClauses.push(
      `(p.price_expectation >= $${idx++} OR p.budget_min >= $${idx++})`
    );
    params.push(min_price, min_price);
    idx++; // already incremented twice above — fix counter
    idx = params.length + 1;
  }

  if (max_price) {
    whereClauses.push(
      `(p.price_expectation <= $${idx++} OR p.budget_max <= $${idx++})`
    );
    params.push(max_price, max_price);
    idx = params.length + 1;
  }

  // Full-text search on description
  if (q) {
    whereClauses.push(
      `to_tsvector('english', COALESCE(p.description, '')) @@ plainto_tsquery('english', $${idx++})`
    );
    params.push(q);
  }

  // Geo radius filter using haversine SQL fragment
  if (lat !== undefined && lng !== undefined) {
    const { sql: haversineSql, params: haversineParams } = buildHaversineSQL(
      lat, lng, radius_km, idx
    );
    whereClauses.push(haversineSql);
    params.push(...haversineParams);
    idx = params.length + 1;
  }

  // Whitelisted sort column — never from raw user input
  const safeSort   = ALLOWED_POST_SORT_COLUMNS.includes(sort_by) ? sort_by : 'created_at';
  const safeOrder  = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const offset     = (page - 1) * limit;

  // Saved indicator — LEFT JOIN only when user is authenticated
  const savedJoin = requestingUserId
    ? `LEFT JOIN saved_posts sp
         ON sp.post_id = p.id AND sp.user_id = $${idx++}`
    : '';
  if (requestingUserId) params.push(requestingUserId);

  const savedSelect = requestingUserId ? ', (sp.id IS NOT NULL) AS is_saved' : ', FALSE AS is_saved';

  const whereSQL = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  // COUNT query for pagination
  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM posts p
     ${whereSQL}`,
    params.slice(0, requestingUserId ? params.length - 1 : params.length)
    // Re-slice to exclude the saved_posts userId param from count query
  );

  // Re-build params for the count query (without the saved JOIN param)
  const countParams = requestingUserId ? params.slice(0, -1) : params;
  const countResult2 = await query(
    `SELECT COUNT(*) AS total FROM posts p ${whereSQL}`,
    countParams
  );

  const total = parseInt(countResult2.rows[0].total, 10);

  // Main data query
  const dataParams = [...params, limit, offset];
  const limitIdx   = params.length + 1;
  const offsetIdx  = params.length + 2;

  const dataResult = await query(
    `SELECT ${POST_SELECT} ${savedSelect}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN post_images pi ON pi.post_id = p.id
     ${savedJoin}
     ${whereSQL}
     GROUP BY p.id, u.id ${requestingUserId ? ', sp.id' : ''}
     ORDER BY p.${safeSort} ${safeOrder}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  );

  const posts = dataResult.rows.map((row) => formatPost(row, requestingUserId));
  const totalPages = Math.ceil(total / limit);

  return {
    posts,
    meta: {
      total,
      page:            parseInt(page, 10),
      limit:           parseInt(limit, 10),
      totalPages,
      hasNextPage:     page < totalPages,
      hasPreviousPage: page > 1
    }
  };
}

// ─── getPostById ──────────────────────────────────────────────────────────────

async function getPostById(postId, requestingUserId = null) {
  // Increment view_count atomically before fetching
  await query(
    `UPDATE posts SET view_count = view_count + 1
     WHERE id = $1 AND deleted_at IS NULL`,
    [postId]
  );

  const savedJoin = requestingUserId
    ? `LEFT JOIN saved_posts sp ON sp.post_id = p.id AND sp.user_id = $2`
    : '';
  const savedSelect = requestingUserId ? ', (sp.id IS NOT NULL) AS is_saved' : ', FALSE AS is_saved';
  const params = requestingUserId ? [postId, requestingUserId] : [postId];

  const result = await query(
    `SELECT ${POST_SELECT} ${savedSelect}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN post_images pi ON pi.post_id = p.id
     ${savedJoin}
     WHERE p.id = $1 AND p.deleted_at IS NULL
     GROUP BY p.id, u.id ${requestingUserId ? ', sp.id' : ''}`,
    params
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('Post');
  }

  return formatPost(result.rows[0], requestingUserId);
}

// ─── createPost ───────────────────────────────────────────────────────────────

async function createPost(userId, data, files = []) {
  // Check active post limit
  const maxPosts = await getPlatformSetting('max_active_posts_per_user', 10);
  const countResult = await query(
    `SELECT COUNT(*) AS total FROM posts
     WHERE user_id = $1 AND status IN ('active','inactive') AND deleted_at IS NULL`,
    [userId]
  );

  if (parseInt(countResult.rows[0].total, 10) >= maxPosts) {
    throw new ApiError(
      422,
      `You can have a maximum of ${maxPosts} active posts at a time. ` +
      'Please delete or complete an existing post before creating a new one.',
      null,
      'MAX_POSTS_REACHED'
    );
  }

  // Calculate expiry
  const expiryDays = await getPlatformSetting('post_expiry_days', 30);
  const expiresAt  = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO posts (
        user_id, post_type, description,
        origin_address, origin_city, origin_state, origin_lat, origin_lng,
        destination_address, destination_city, destination_state, destination_lat, destination_lng,
        vehicle_type, vehicle_capacity_kg, remaining_capacity_kg,
        goods_type, goods_category, goods_weight_kg,
        goods_length_cm, goods_width_cm, goods_height_cm, is_fragile,
        budget_min, budget_max, price_expectation,
        availability_date, expires_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
      )
      RETURNING id`,
      [
        userId,
        data.post_type,
        data.description             || null,
        data.origin_address,
        data.origin_city             || null,
        data.origin_state            || null,
        data.origin_lat,
        data.origin_lng,
        data.destination_address     || null,
        data.destination_city        || null,
        data.destination_state       || null,
        data.destination_lat         || null,
        data.destination_lng         || null,
        data.vehicle_type            || null,
        data.vehicle_capacity_kg     || null,
        data.remaining_capacity_kg   || null,
        data.goods_type              || null,
        data.goods_category          || null,
        data.goods_weight_kg         || null,
        data.goods_length_cm         || null,
        data.goods_width_cm          || null,
        data.goods_height_cm         || null,
        data.is_fragile              || false,
        data.budget_min              || null,
        data.budget_max              || null,
        data.price_expectation       || null,
        data.availability_date,
        expiresAt
      ]
    );

    const postId = insertResult.rows[0].id;

    // Upload images if provided
    if (files && files.length > 0) {
      const maxImages = await getPlatformSetting('max_images_per_post', 5);
      const imagesToUpload = files.slice(0, maxImages);

      for (let i = 0; i < imagesToUpload.length; i++) {
        const file     = imagesToUpload[i];
        const uploaded = await uploadPostImage(file.buffer, file.mimetype);
        await client.query(
          `INSERT INTO post_images (post_id, image_url, cloudinary_public_id, display_order)
           VALUES ($1, $2, $3, $4)`,
          [postId, uploaded.secureUrl, uploaded.publicId, i]
        );
      }
    }

    await client.query('COMMIT');
    return getPostById(postId, userId);

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── updatePost ───────────────────────────────────────────────────────────────

async function updatePost(postId, userId, data, newFiles = []) {
  // Verify ownership and status
  const existing = await query(
    'SELECT id, user_id, status FROM posts WHERE id = $1 AND deleted_at IS NULL',
    [postId]
  );

  if (existing.rows.length === 0) throw ApiError.notFound('Post');

  const post = existing.rows[0];

  if (post.user_id !== userId) {
    throw ApiError.forbidden('You do not have permission to edit this post.');
  }

  if ([POST_STATUS.BOOKED, POST_STATUS.COMPLETED].includes(post.status)) {
    throw new ApiError(
      422,
      'This post cannot be edited because it has an active booking.',
      null,
      'POST_NOT_EDITABLE'
    );
  }

  // Build SET clause dynamically — only include provided fields
  const ALLOWED_COLUMNS = [
    'description', 'availability_date',
    'origin_address', 'origin_city', 'origin_state', 'origin_lat', 'origin_lng',
    'destination_address', 'destination_city', 'destination_state', 'destination_lat', 'destination_lng',
    'vehicle_type', 'vehicle_capacity_kg', 'remaining_capacity_kg',
    'goods_type', 'goods_category', 'goods_weight_kg',
    'goods_length_cm', 'goods_width_cm', 'goods_height_cm', 'is_fragile',
    'budget_min', 'budget_max', 'price_expectation'
  ];

  const setClauses = [];
  const values     = [];
  let   idx        = 1;

  for (const col of ALLOWED_COLUMNS) {
    if (data[col] !== undefined) {
      setClauses.push(`${col} = $${idx++}`);
      values.push(data[col] === '' ? null : data[col]);
    }
  }

  if (setClauses.length === 0 && newFiles.length === 0) {
    throw ApiError.badRequest('No fields provided for update.');
  }

  if (setClauses.length > 0) {
    values.push(postId);
    await query(
      `UPDATE posts SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    );
  }

  // Handle new image uploads
  if (newFiles.length > 0) {
    const maxImages = await getPlatformSetting('max_images_per_post', 5);

    const currentImages = await query(
      'SELECT COUNT(*) AS total FROM post_images WHERE post_id = $1',
      [postId]
    );
    const currentCount  = parseInt(currentImages.rows[0].total, 10);
    const slotsLeft     = maxImages - currentCount;

    if (slotsLeft > 0) {
      const nextOrder = currentCount;
      const toUpload  = newFiles.slice(0, slotsLeft);

      for (let i = 0; i < toUpload.length; i++) {
        const file     = toUpload[i];
        const uploaded = await uploadPostImage(file.buffer, file.mimetype);
        await query(
          `INSERT INTO post_images (post_id, image_url, cloudinary_public_id, display_order)
           VALUES ($1, $2, $3, $4)`,
          [postId, uploaded.secureUrl, uploaded.publicId, nextOrder + i]
        );
      }
    }
  }

  return getPostById(postId, userId);
}

// ─── deletePost ───────────────────────────────────────────────────────────────

async function deletePost(postId, userId) {
  const result = await query(
    `SELECT id, user_id, status FROM posts
     WHERE id = $1 AND deleted_at IS NULL`,
    [postId]
  );

  if (result.rows.length === 0) throw ApiError.notFound('Post');

  const post = result.rows[0];

  if (post.user_id !== userId) {
    throw ApiError.forbidden('You do not have permission to delete this post.');
  }

  if (post.status === POST_STATUS.BOOKED) {
    throw new ApiError(
      422,
      'This post cannot be deleted because it has an active booking. Cancel the booking first.',
      null,
      'POST_HAS_ACTIVE_BOOKING'
    );
  }

  await query(
    `UPDATE posts SET deleted_at = NOW(), status = 'deleted' WHERE id = $1`,
    [postId]
  );

  // Delete Cloudinary images asynchronously
  setImmediate(async () => {
    try {
      const images = await query(
        'SELECT cloudinary_public_id FROM post_images WHERE post_id = $1',
        [postId]
      );
      for (const img of images.rows) {
        if (img.cloudinary_public_id) {
          await deleteImage(img.cloudinary_public_id).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[Posts] deletePost: Cloudinary cleanup error:', err.message);
    }
  });
}

// ─── updatePostStatus ─────────────────────────────────────────────────────────

async function updatePostStatus(postId, userId, newStatus) {
  const result = await query(
    'SELECT id, user_id, status FROM posts WHERE id = $1 AND deleted_at IS NULL',
    [postId]
  );

  if (result.rows.length === 0) throw ApiError.notFound('Post');

  const post = result.rows[0];

  if (post.user_id !== userId) {
    throw ApiError.forbidden('You do not have permission to change the status of this post.');
  }

  const TOGGLEABLE = [POST_STATUS.ACTIVE, POST_STATUS.INACTIVE];
  if (!TOGGLEABLE.includes(post.status)) {
    throw new ApiError(
      422,
      `Cannot change status of a post that is currently "${post.status}".`,
      null,
      'INVALID_STATUS_TRANSITION'
    );
  }

  await query(
    'UPDATE posts SET status = $1 WHERE id = $2',
    [newStatus, postId]
  );

  return { id: postId, status: newStatus };
}

// ─── toggleSavePost ───────────────────────────────────────────────────────────

async function toggleSavePost(postId, userId) {
  // Cannot save own post
  const postResult = await query(
    'SELECT id, user_id FROM posts WHERE id = $1 AND deleted_at IS NULL',
    [postId]
  );

  if (postResult.rows.length === 0) throw ApiError.notFound('Post');

  if (postResult.rows[0].user_id === userId) {
    throw new ApiError(422, 'You cannot save your own post.', null, 'CANNOT_SAVE_OWN_POST');
  }

  // Check existing save
  const existing = await query(
    'SELECT id FROM saved_posts WHERE user_id = $1 AND post_id = $2',
    [userId, postId]
  );

  if (existing.rows.length > 0) {
    // Unsave
    await query(
      'DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );
    return { saved: false };
  }

  // Save
  await query(
    'INSERT INTO saved_posts (user_id, post_id) VALUES ($1, $2)',
    [userId, postId]
  );
  return { saved: true };
}

// ─── reportPost ───────────────────────────────────────────────────────────────

async function reportPost(postId, userId, reason, description) {
  const postResult = await query(
    'SELECT id, user_id FROM posts WHERE id = $1 AND deleted_at IS NULL',
    [postId]
  );

  if (postResult.rows.length === 0) throw ApiError.notFound('Post');

  if (postResult.rows[0].user_id === userId) {
    throw new ApiError(422, 'You cannot report your own post.', null, 'CANNOT_REPORT_OWN_POST');
  }

  try {
    await query(
      `INSERT INTO reported_posts (reporter_id, post_id, reason, description)
       VALUES ($1, $2, $3, $4)`,
      [userId, postId, reason, description || null]
    );
  } catch (err) {
    // Unique constraint: user already reported this post
    if (err.code === '23505') {
      throw ApiError.conflict('You have already reported this post.');
    }
    throw err;
  }
}

// ─── getMyPosts ───────────────────────────────────────────────────────────────

async function getMyPosts(userId, { page = 1, limit = 20, status } = {}) {
  const whereClauses = ['p.user_id = $1', 'p.deleted_at IS NULL'];
  const params       = [userId];
  let   idx          = 2;

  if (status) {
    whereClauses.push(`p.status = $${idx++}`);
    params.push(status);
  }

  const offset = (page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) AS total FROM posts p WHERE ${whereClauses.join(' AND ')}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const dataResult = await query(
    `SELECT ${POST_SELECT}, FALSE AS is_saved
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN post_images pi ON pi.post_id = p.id
     WHERE ${whereClauses.join(' AND ')}
     GROUP BY p.id, u.id
     ORDER BY p.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return {
    posts: dataResult.rows.map((row) => formatPost(row, userId)),
    meta:  {
      total,
      page:            parseInt(page, 10),
      limit:           parseInt(limit, 10),
      totalPages:      Math.ceil(total / limit),
      hasNextPage:     page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    }
  };
}

// ─── getSavedPosts ────────────────────────────────────────────────────────────

async function getSavedPosts(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) AS total FROM saved_posts sp
     JOIN posts p ON p.id = sp.post_id
     WHERE sp.user_id = $1 AND p.deleted_at IS NULL`,
    [userId]
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const dataResult = await query(
    `SELECT ${POST_SELECT}, TRUE AS is_saved
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN saved_posts sp ON sp.post_id = p.id AND sp.user_id = $1
     LEFT JOIN post_images pi ON pi.post_id = p.id
     WHERE p.deleted_at IS NULL
     GROUP BY p.id, u.id, sp.created_at
     ORDER BY sp.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    posts: dataResult.rows.map((row) => formatPost(row, userId)),
    meta:  {
      total,
      page:            parseInt(page, 10),
      limit:           parseInt(limit, 10),
      totalPages:      Math.ceil(total / limit),
      hasNextPage:     page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    }
  };
}

// ─── getPostBookings (delegates to bookings.service — Block K) ───────────────
// Stub replaced now that bookings.service.js exists.
// posts.routes.js GET /:postId/bookings calls posts.controller.getPostBookings
// which calls this function, which delegates to the authoritative implementation.

async function getPostBookings(postId, userId) {
  const bookingsService = require('../bookings/bookings.service');
  return bookingsService.getPostBookings(postId, userId);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getFeed,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  updatePostStatus,
  toggleSavePost,
  reportPost,
  getMyPosts,
  getSavedPosts,
  getPostBookings
};