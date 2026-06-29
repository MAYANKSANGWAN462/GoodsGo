import { createContext, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../stores/useAuthStore';
import { refreshToken } from '../services/auth.service';
import { logout as logoutService } from '../services/auth.service';

export const AuthContext = createContext(null);

/**
 * AuthProvider wraps the app and performs the silent token refresh on startup.
 * It exposes login/logout helpers that combine the Zustand store update with
 * any side-effects (cache invalidation, socket connection) that other modules add.
 *
 * isInitializing is true until the startup silent refresh resolves (success or failure).
 * ProtectedRoute reads this to show a spinner instead of immediately redirecting to
 * /login during the brief window before the session is restored.
 */
export function AuthProvider({ children }) {
  const { setAuth, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const didSilentRefresh = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Silent refresh on mount — restores the session if the refresh cookie is still valid.
  useEffect(() => {
    if (didSilentRefresh.current) return;
    didSilentRefresh.current = true;

    refreshToken()
      .then(({ data }) => {
        if (data?.accessToken && data?.user) {
          setAuth(data.user, data.accessToken);
        }
      })
      .catch(() => {
        // Refresh cookie absent or expired — user remains unauthenticated.
        clearAuth();
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, [setAuth, clearAuth]);

  async function handleLogout() {
    try {
      await logoutService();
    } catch {
      // Always clear local state even if the network call fails.
    } finally {
      clearAuth();
      queryClient.clear();
    }
  }

  return (
    <AuthContext.Provider value={{ logout: handleLogout, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
