import { create } from 'zustand';

/**
 * Zustand store for user authentication state.
 * Access token is held in memory only — never written to localStorage or sessionStorage.
 *
 * SESSION_HINT_KEY is a lightweight localStorage flag (no sensitive data) that lets
 * AuthContext skip the startup silent-refresh call when the user has never logged in
 * or explicitly logged out. This prevents a noisy 401 in the console on every cold load.
 */
export const SESSION_HINT_KEY = 'gg_hint';

const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  /** Store access token + user after successful login or token refresh. */
  setAuth: (user, accessToken) => {
    localStorage.setItem(SESSION_HINT_KEY, '1');
    set({ user, accessToken, isAuthenticated: true });
  },

  /** Wipe auth state on logout or failed refresh. */
  clearAuth: () => {
    localStorage.removeItem(SESSION_HINT_KEY);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
