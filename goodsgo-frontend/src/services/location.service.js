import { api, unwrapResponse } from './api';

/**
 * Geocode a free-text address or city name to lat/lng coordinates.
 * Called on address field blur during post creation/editing to silently
 * populate coordinates required by the backend.
 * @param {string} address - Address or city string (min 3 chars)
 * @returns {Promise<{ lat: number, lng: number, displayName: string } | null>}
 */
export async function geocodeAddress(address) {
  const res = await api.get('/location/geocode', { params: { address } });
  return unwrapResponse(res).data;
}

/**
 * Reverse geocode lat/lng to a human-readable address.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ displayName: string, city: string, state: string, country: string } | null>}
 */
export async function reverseGeocode(lat, lng) {
  const res = await api.get('/location/reverse-geocode', { params: { lat, lng } });
  return unwrapResponse(res).data;
}
