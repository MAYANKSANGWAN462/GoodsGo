import axios from 'axios';
import useAuthStore from '../stores/useAuthStore';
import useAdminStore from '../stores/useAdminStore';

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/v1`;

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
      !originalRequest._retry
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
        const { accessToken, user } = res.data.data;
        useAuthStore.getState().setAuth(user, accessToken);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        // Redirect to login — handled without importing react-router to avoid circular deps.
        window.location.href = '/login';
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
    if (error.response?.status === 401) {
      useAdminStore.getState().clearAdminAuth();
      window.location.href = '/admin/login';
    }
    return Promise.reject(buildError(error));
  }
);

// ── Re-export helpers used by service files ─────────────────────────────────

export { unwrapResponse, buildError };
