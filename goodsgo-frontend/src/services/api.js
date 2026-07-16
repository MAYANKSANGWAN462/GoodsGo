import axios from 'axios';
import useAuthStore from '../stores/useAuthStore';
import useAdminStore from '../stores/useAdminStore';

// In local dev VITE_API_URL is empty so all requests go through the Vite
// proxy (same origin). In production set VITE_API_URL to the deployed
// backend URL and requests go directly.
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

// ── Shared response unwrapper ───────────────────────────────────────────────

/**
 * Normalise a successful Axios response.
 * The backend always returns { success, message, data?, meta? }.
 */
function unwrapResponse(response) {
  return { data: response.data.data ?? null, meta: response.data.meta ?? null };
}

/**
 * Normalise an error into the standard shape consumed by all service callers.
 * @returns {{ message, errors, code, status }}
 */
function buildError(axiosError) {
  const res = axiosError.response;
  if (res) {
    return {
      message: res.data?.message || 'Something went wrong.',
      errors: res.data?.errors || null,
      code: res.data?.code || null,
      status: res.status,
    };
  }
  return {
    message: axiosError.message || 'Network error.',
    errors: null,
    code: 'NETWORK_ERROR',
    status: 0,
  };
}

// ── User Axios instance ─────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Attach access token from Zustand store on every request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag to prevent concurrent refresh loops.
let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh-token') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue the request until refresh completes.
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Silent token refresh — browser sends httpOnly refresh cookie automatically.
        const res = await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        const refreshData = res.data?.data;
        if (!refreshData?.accessToken || !refreshData?.user) {
          throw new Error('Malformed refresh response');
        }
        const { accessToken, user } = refreshData;
        useAuthStore.getState().setAuth(user, accessToken);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        // Only hard-redirect if not already on /login — prevents reload loops.
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(buildError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(buildError(error));
  }
);

// ── Admin Axios instance ────────────────────────────────────────────────────

export const adminApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

adminApi.interceptors.request.use((config) => {
  const token = useAdminStore.getState().adminToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from the admin login attempt itself means wrong credentials —
    // let the login form show the error. Only expired/invalid sessions on
    // other admin endpoints should force a redirect, and never redirect
    // when already on /admin/login (prevents reload loops).
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/admin/login') &&
      !window.location.pathname.startsWith('/admin/login')
    ) {
      useAdminStore.getState().clearAdminAuth();
      window.location.href = '/admin/login';
    }
    return Promise.reject(buildError(error));
  }
);

// ── Re-export helpers used by service files ─────────────────────────────────

export { unwrapResponse, buildError };
