'use strict';

const express       = require('express');
const { query }     = require('../../config/database');
const ApiResponse   = require('../../utils/ApiResponse');
const asyncHandler  = require('../../utils/asyncHandler');

const router = express.Router();

// Simple in-memory cache — reference data changes rarely
// Invalidated on server restart; acceptable for MVP
let _cachedOptions = null;
let _cacheSetAt    = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/v1/config/options
 * Returns all active vehicle types and goods categories.
 * Used by the frontend to populate form dropdowns for post creation.
 * No authentication required — this data is publicly available.
 */
router.get(
  '/options',
  asyncHandler(async (req, res) => {
    const now = Date.now();

    // Serve from cache if valid
    if (_cachedOptions && _cacheSetAt && now - _cacheSetAt < CACHE_TTL_MS) {
      return res.status(200).json(
        new ApiResponse(200, 'Configuration options retrieved.', _cachedOptions)
      );
    }

    // Fetch from database
    const [vehicleResult, categoryResult] = await Promise.all([
      query(
        `SELECT name, label
         FROM vehicle_types
         WHERE is_active = TRUE
         ORDER BY display_order ASC, label ASC`
      ),
      query(
        `SELECT name, label
         FROM goods_categories
         WHERE is_active = TRUE
         ORDER BY display_order ASC, label ASC`
      )
    ]);

    _cachedOptions = {
      vehicleTypes:     vehicleResult.rows,
      goodsCategories:  categoryResult.rows
    };
    _cacheSetAt = now;

    res.status(200).json(
      new ApiResponse(200, 'Configuration options retrieved.', _cachedOptions)
    );
  })
);

module.exports = router;