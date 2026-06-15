'use strict';

const locationService = require('./location.service');
const ApiResponse     = require('../../utils/ApiResponse');
const ApiError        = require('../../utils/ApiError');
const asyncHandler    = require('../../utils/asyncHandler');

/**
 * GET /api/v1/location/geocode?address=<text>
 * Converts a free-text address into lat/lng coordinates.
 * Returns 404 if the address cannot be resolved.
 */
const geocode = asyncHandler(async (req, res) => {
  const address = req.query.address;

  if (!address || address.trim().length < 3) {
    throw ApiError.badRequest(
      'Query parameter "address" is required and must be at least 3 characters.'
    );
  }

  const result = await locationService.geocodeAddress(address.trim());

  if (!result) {
    throw ApiError.notFound(
      `Could not find coordinates for "${address}". ` +
      'Please try a more specific address or enter coordinates manually.'
    );
  }

  res.status(200).json(
    new ApiResponse(200, 'Address geocoded successfully.', result)
  );
});

/**
 * GET /api/v1/location/reverse-geocode?lat=<number>&lng=<number>
 * Converts lat/lng coordinates into a human-readable address.
 */
const reverseGeocode = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (isNaN(lat) || isNaN(lng)) {
    throw ApiError.badRequest(
      'Query parameters "lat" and "lng" are required and must be valid numbers.'
    );
  }

  if (lat < -90 || lat > 90) {
    throw ApiError.badRequest('Latitude must be between -90 and 90.');
  }

  if (lng < -180 || lng > 180) {
    throw ApiError.badRequest('Longitude must be between -180 and 180.');
  }

  const result = await locationService.reverseGeocode(lat, lng);

  if (!result) {
    throw ApiError.notFound(
      'Could not find an address for the provided coordinates.'
    );
  }

  res.status(200).json(
    new ApiResponse(200, 'Coordinates reverse-geocoded successfully.', result)
  );
});

module.exports = { geocode, reverseGeocode };