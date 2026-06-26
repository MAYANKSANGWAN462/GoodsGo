import { api, unwrapResponse } from './api';

/**
 * Fetch application reference data (vehicle types, goods categories).
 * Called once at app startup; cached with staleTime: Infinity via React Query.
 * @returns {Promise<{ vehicleTypes: Array, goodsCategories: Array }>}
 */
export async function getConfigOptions() {
  const res = await api.get('/config/options');
  return unwrapResponse(res).data;
}
