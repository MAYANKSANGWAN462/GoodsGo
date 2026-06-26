'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371; // WGS-84 mean Earth radius

// ─── calculateDistance ────────────────────────────────────────────────────────

/**
 * calculateDistance — Computes the great-circle distance between two points
 * using the Haversine formula.
 *
 * Accurate to within ~0.5% for distances under 1000km — sufficient for the
 * logistics marketplace's use case of finding nearby posts.
 *
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lng1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lng2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in kilometres
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// ─── buildHaversineSQL ────────────────────────────────────────────────────────

/**
 * buildHaversineSQL — Generates a parameterized SQL fragment that filters rows
 * within a radius of the given coordinates using the Haversine formula.
 *
 * Why not PostGIS?
 *   PostGIS availability on Neon.tech free tier was not independently verified.
 *   At the current expected data volume (tens of thousands of posts), a full
 *   trigonometric scan is acceptable. This should be revisited once post volume
 *   approaches hundreds of thousands — see PROJECT_CONTEXT.md Section 26.
 *
 * Security note: `latCol` and `lngCol` are column names interpolated directly
 * into the SQL string. They MUST come from a hardcoded constant in the calling
 * code — NEVER from user input. This function does not accept column names
 * from untrusted sources.
 *
 * @param {number} lat       - Centre latitude (degrees)
 * @param {number} lng       - Centre longitude (degrees)
 * @param {number} radiusKm  - Search radius in kilometres
 * @param {number} latIdx    - Parameter index for latitude ($N)
 * @param {number} lngIdx    - Parameter index for longitude ($N+1)
 * @param {string} latCol    - Column name for latitude (e.g. 'origin_lat') — MUST be hardcoded
 * @param {string} lngCol    - Column name for longitude (e.g. 'origin_lng') — MUST be hardcoded
 * @returns {{ sql: string, params: number[] }} SQL WHERE fragment and its bound parameters
 *
 * Usage in posts.service.js:
 *   const { sql, params } = buildHaversineSQL(lat, lng, radius_km, idx, idx+1, 'origin_lat', 'origin_lng');
 *   whereClauses.push(sql);
 *   queryParams.push(...params);
 *   idx += 2;
 */
function buildHaversineSQL(lat, lng, radiusKm, latIdx, lngIdx, latCol, lngCol) {
  const sql = `
    (
      ${EARTH_RADIUS_KM} * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS(${latCol} - $${latIdx}) / 2), 2) +
          COS(RADIANS($${latIdx})) * COS(RADIANS(${latCol})) *
          POWER(SIN(RADIANS(${lngCol} - $${lngIdx}) / 2), 2)
        )
      )
    ) <= ${radiusKm}
  `;

  return { sql: sql.trim(), params: [lat, lng] };
}

module.exports = { calculateDistance, buildHaversineSQL };
