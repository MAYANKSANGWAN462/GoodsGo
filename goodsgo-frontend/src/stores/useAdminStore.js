import { create } from 'zustand';

/**
 * Zustand store for admin authentication state.
 * Kept entirely separate from useAuthStore — admin and user tokens are cryptographically distinct.
 * Stub only for FE-1. Full implementation in the FE-Admin block.
 */
const useAdminStore = create((set) => ({
  admin: null,
  adminToken: null,
  isAdminAuthenticated: false,

  setAdminAuth: (admin, adminToken) =>
    set({ admin, adminToken, isAdminAuthenticated: true }),

  clearAdminAuth: () =>
    set({ admin: null, adminToken: null, isAdminAuthenticated: false }),
}));

export default useAdminStore;
