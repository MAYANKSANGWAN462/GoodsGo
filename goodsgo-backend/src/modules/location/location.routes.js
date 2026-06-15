'use strict';

const express            = require('express');
const locationController = require('./location.controller');

const router = express.Router();

/**
 * GET /api/v1/location/geocode?address=<text>
 * No authentication required — location lookup is a public utility.
 */
router.get('/geocode', locationController.geocode);

/**
 * GET /api/v1/location/reverse-geocode?lat=<number>&lng=<number>
 * No authentication required.
 */
router.get('/reverse-geocode', locationController.reverseGeocode);

module.exports = router;