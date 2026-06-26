import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import useAuthStore from '../stores/useAuthStore';

/**
 * Primary auth hook for components and pages.
 * Combines Zustand state (user, accessToken, isAuthenticated) with
 * the logout helper provided by AuthContext.
 *
 * @returns {{ user: object|null, accessToken: string|null, isAuthenticated: boolean, logout: function }}
 */
export default function useAuth() {
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const ctx = useContext(AuthContext);

  return {
    user,
    accessToken,
    isAuthenticated,
    logout: ctx?.logout ?? (() => {}),
  };
}
