'use strict';

const axios = require('axios');
const { calculateDistance, buildHaversineSQL } = require('../../utils/calculateDistance');
const ApiError = require('../../utils/ApiError');

// ─── Nominatim Configuration ──────────────────────────────────────────────────
// Nominatim requires a descriptive User-Agent and limits to 1 request/second.
// For production with higher volume, use a self-hosted Nominatim or switch to
// Google Maps Geocoding API (paid).

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const NOMINATIM_HEADERS = {
  'User-Agent': 'GoodsGo/1.0 (logistics marketplace India; contact@goodsgo.in)',
  'Accept-Language': 'en'
};
const NOMINATIM_TIMEOUT_MS = 8000;

// ─── Static City Fallback ─────────────────────────────────────────────────────
// Used when Nominatim is unavailable or rate-limited.
// Covers the major logistics hubs in India.
const INDIAN_CITY_COORDS = {
  'mumbai':      { lat: 19.0760, lng: 72.8777, city: 'Mumbai',      state: 'Maharashtra' },
  'delhi':       { lat: 28.6139, lng: 77.2090, city: 'Delhi',        state: 'Delhi' },
  'new delhi':   { lat: 28.6139, lng: 77.2090, city: 'New Delhi',    state: 'Delhi' },
  'bangalore':   { lat: 12.9716, lng: 77.5946, city: 'Bangalore',    state: 'Karnataka' },
  'bengaluru':   { lat: 12.9716, lng: 77.5946, city: 'Bengaluru',    state: 'Karnataka' },
  'hyderabad':   { lat: 17.3850, lng: 78.4867, city: 'Hyderabad',    state: 'Telangana' },
  'ahmedabad':   { lat: 23.0225, lng: 72.5714, city: 'Ahmedabad',    state: 'Gujarat' },
  'chennai':     { lat: 13.0827, lng: 80.2707, city: 'Chennai',      state: 'Tamil Nadu' },
  'kolkata':     { lat: 22.5726, lng: 88.3639, city: 'Kolkata',      state: 'West Bengal' },
  'surat':       { lat: 21.1702, lng: 72.8311, city: 'Surat',        state: 'Gujarat' },
  'pune':        { lat: 18.5204, lng: 73.8567, city: 'Pune',         state: 'Maharashtra' },
  'jaipur':      { lat: 26.9124, lng: 75.7873, city: 'Jaipur',       state: 'Rajasthan' },
  'lucknow':     { lat: 26.8467, lng: 80.9462, city: 'Lucknow',      state: 'Uttar Pradesh' },
  'kanpur':      { lat: 26.4499, lng: 80.3319, city: 'Kanpur',       state: 'Uttar Pradesh' },
  'nagpur':      { lat: 21.1458, lng: 79.0882, city: 'Nagpur',       state: 'Maharashtra' },
  'indore':      { lat: 22.7196, lng: 75.8577, city: 'Indore',       state: 'Madhya Pradesh' },
  'bhopal':      { lat: 23.2599, lng: 77.4126, city: 'Bhopal',       state: 'Madhya Pradesh' },
  'patna':       { lat: 25.5941, lng: 85.1376, city: 'Patna',        state: 'Bihar' },
  'ludhiana':    { lat: 30.9010, lng: 75.8573, city: 'Ludhiana',     state: 'Punjab' },
  'agra':        { lat: 27.1767, lng: 78.0081, city: 'Agra',         state: 'Uttar Pradesh' },
  'kochi':       { lat: 9.9312,  lng: 76.2673, city: 'Kochi',        state: 'Kerala' },
  'chandigarh':  { lat: 30.7333, lng: 76.7794, city: 'Chandigarh',   state: 'Chandigarh' },
  'coimbatore':  { lat: 11.0168, lng: 76.9558, city: 'Coimbatore',   state: 'Tamil Nadu' },
  'vadodara':    { lat: 22.3072, lng: 73.1812, city: 'Vadodara',     state: 'Gujarat' },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185, city: 'Visakhapatnam', state: 'Andhra Pradesh' }
};

// ─── geocodeAddress ───────────────────────────────────────────────────────────

/**
 * geocodeAddress — Converts a text address into lat/lng coordinates.
 *
 * Strategy:
 * 1. Check static city fallback map (instant, no API call)
 * 2. Call Nominatim API
 * 3. Return null on failure (caller decides whether to block or continue)
 *
 * @param {string} address - Free-text address (e.g. "Andheri West, Mumbai")
 * @returns {Promise<{
 *   lat: number,
 *   lng: number,
 *   formattedAddress: string,
 *   city: string|null,
 *   state: string|null
 * }|null>}
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') return null;

  // 1. Check static fallback
  const normalised = address.toLowerCase().trim();
  for (const [key, data] of Object.entries(INDIAN_CITY_COORDS)) {
    if (normalised === key || normalised.startsWith(key)) {
      return {
        lat:              data.lat,
        lng:              data.lng,
        formattedAddress: address,
        city:             data.city,
        state:            data.state
      };
    }
  }

  // 2. Call Nominatim
  try {
    const response = await axios.get(`${NOMINATIM_BASE}/search`, {
      params: {
        q:              address,
        format:         'json',
        limit:          1,
        countrycodes:   'in',       // Restrict to India for MVP
        addressdetails: 1
      },
      headers: NOMINATIM_HEADERS,
      timeout: NOMINATIM_TIMEOUT_MS
    });

    const results = response.data;
    if (!results || results.length === 0) return null;

    const result  = results[0];
    const addr    = result.address || {};

    return {
      lat:              parseFloat(result.lat),
      lng:              parseFloat(result.lon),
      formattedAddress: result.display_name,
      city:             addr.city || addr.town || addr.village || null,
      state:            addr.state || null
    };
  } catch (err) {
    console.warn('[Location] geocodeAddress failed:', err.message);
    return null;
  }
}

// ─── reverseGeocode ───────────────────────────────────────────────────────────

/**
 * reverseGeocode — Converts lat/lng into a human-readable address.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{
 *   formattedAddress: string,
 *   city: string|null,
 *   state: string|null
 * }|null>}
 */
async function reverseGeocode(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  try {
    const response = await axios.get(`${NOMINATIM_BASE}/reverse`, {
      params: {
        lat,
        lon:            lng,
        format:         'json',
        addressdetails: 1
      },
      headers: NOMINATIM_HEADERS,
      timeout: NOMINATIM_TIMEOUT_MS
    });

    const result = response.data;
    if (!result || result.error) return null;

    const addr = result.address || {};

    return {
      formattedAddress: result.display_name,
      city:             addr.city || addr.town || addr.village || null,
      state:            addr.state || null
    };
  } catch (err) {
    console.warn('[Location] reverseGeocode failed:', err.message);
    return null;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,   // Re-exported for convenience
  buildHaversineSQL    // Re-exported so posts.service imports from one place
};