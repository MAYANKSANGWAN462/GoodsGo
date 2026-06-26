import { create } from 'zustand';

/**
 * Zustand store for user authentication state.
 * Access token is held in memory only — never written to localStorage or sessionStorage.
 */
const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  /** Store access token + user after successful login or token refresh. */
  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),

  /** Wipe auth state on logout or failed refresh. */
  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),
}));

export default useAuthStore;
