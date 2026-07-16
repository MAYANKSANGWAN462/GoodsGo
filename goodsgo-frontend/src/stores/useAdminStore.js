import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Zustand store for admin authentication state.
 * Kept entirely separate from useAuthStore — admin and user tokens are cryptographically distinct.
 *
 * Persisted to sessionStorage (not localStorage): admin sessions have no
 * refresh-cookie recovery, so without persistence any page reload would wipe
 * the in-memory token and bounce the admin back to /admin/login. sessionStorage
 * is tab-scoped and cleared when the tab closes; the JWT itself expires in 8h.
 */
const useAdminStore = create(
  persist(
    (set) => ({
      admin: null,
      adminToken: null,
      isAdminAuthenticated: false,

      setAdminAuth: (admin, adminToken) =>
        set({ admin, adminToken, isAdminAuthenticated: true }),

      clearAdminAuth: () =>
        set({ admin: null, adminToken: null, isAdminAuthenticated: false }),
    }),
    {
      name: 'goodsgo-admin-auth',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useAdminStore;
