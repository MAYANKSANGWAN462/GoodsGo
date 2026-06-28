# GoodsGo — Frontend Module Context

> **Purpose:** Active implementation brief. Regenerate this file completely after every completed frontend module.
> **Current block:** FE-11 — Admin Panel
> **Status:** Not started
> **Max size:** 150 lines. This constraint is intentional — keep it tight.

---

## Current Block: FE-11 — Admin Panel

### Module Goal
Build the full admin panel: login page, layout shell, and all 7 admin management pages. Admin auth uses a completely separate Zustand store (`useAdminStore`), a separate Axios instance (`adminApi`), and a separate login endpoint. Never mix user and admin token state.

### Why this block eleventh
All user-facing flows (auth, posts, bookings, chat, notifications, profile, reviews, payments) are complete. The admin panel is the last major feature before the FE-12 polish pass.

---

### Files to Implement (exist as stubs — replace now)
```
src/components/layout/AdminLayout.jsx       ← Admin shell: AdminSidebar + AdminTopbar + <Outlet />
src/pages/admin/AdminLoginPage.jsx          ← Admin login form using adminApi; stores in useAdminStore
src/pages/admin/AdminDashboardPage.jsx      ← Stats overview (user count, active posts, pending reports)
src/pages/admin/AdminUsersPage.jsx          ← User list: search + status filter; suspend/reactivate
src/pages/admin/AdminUserDetailPage.jsx     ← Single user detail; suspend/reactivate action
src/pages/admin/AdminPostsPage.jsx          ← Post list: status/reported filters; hide/restore
src/pages/admin/AdminBookingsPage.jsx       ← Booking overview (read-only)
src/pages/admin/AdminReportsPage.jsx        ← Report queue; resolve/dismiss; disputes tab
src/pages/admin/AdminPaymentsPage.jsx       ← Payment list; release/refund actions
src/pages/admin/AdminReviewsPage.jsx        ← Review list (read-only moderation)
```

### Files to Create (new — not in scaffold)
```
src/services/admin.service.js              ← All admin API calls using adminApi instance
src/hooks/useAdmin.js                      ← React Query hooks for admin data
```

### Files to Modify (targeted changes only)
```
src/App.jsx   ← Replace all PlaceholderPage elements inside <AdminRoute> with real page imports
```

---

### Backend APIs Required
| Endpoint | Service fn | Notes |
|---|---|---|
| `POST /auth/login` (admin credentials) | `adminLogin(email, password)` | Same auth endpoint; admin JWT returned |
| `POST /auth/logout` | `adminLogout()` | Clears admin httpOnly cookie |
| `GET /admin/users` | `getAdminUsers(filters)` | `?status=&search=&page=&limit=` |
| `GET /admin/users/:userId` | `getAdminUser(userId)` | Single user detail |
| `PUT /admin/users/:userId/suspend` | `suspendUser(userId, reason)` | |
| `PUT /admin/users/:userId/reactivate` | `reactivateUser(userId)` | |
| `GET /admin/posts` | `getAdminPosts(filters)` | `?status=&reported=&page=&limit=` |
| `PUT /admin/posts/:postId/hide` | `hidePost(postId)` | |
| `PUT /admin/posts/:postId/restore` | `restorePost(postId)` | |
| `GET /admin/reports` | `getAdminReports(filters)` | `?status=&page=&limit=` |
| `PUT /admin/reports/:reportId/resolve` | `resolveReport(id, body)` | `{ adminNotes, action }` |
| `PUT /admin/reports/:reportId/dismiss` | `dismissReport(id, body)` | `{ adminNotes }` |
| `GET /admin/disputes` | `getAdminDisputes(filters)` | `?status=&page=&limit=` |
| `POST /admin/payments/:bookingId/release` | `releasePayment(bookingId)` | |
| `POST /admin/payments/:bookingId/refund` | `refundPayment(bookingId, body)` | `{ amount, reason }` |

> **Admin auth note:** Verify with backend before implementing — `docs/API_CONTRACT.md` Section 11 flags that admin login may use the same `/api/v1/auth/*` routes gated by admin credentials, not a separate `/admin/auth/login` endpoint. Check `goodsgo-backend/src/modules/admin/` routes for the actual path.

### Component Relationships
```
AdminRoute → AdminLayout (AdminSidebar + AdminTopbar + <Outlet />)
  AdminLoginPage (no layout — full screen, uses adminApi)
  AdminDashboardPage
  AdminUsersPage → AdminUserDetailPage
  AdminPostsPage
  AdminBookingsPage (read-only)
  AdminReportsPage (tabs: Reports | Disputes)
  AdminPaymentsPage
  AdminReviewsPage (read-only)
```

### Design Notes
- `AdminLayout` is visually distinct from `MainLayout`: dark sidebar, admin-only nav links.
- `useAdminStore` holds `{ admin, adminToken, isAdminAuthenticated }` — already scaffolded in FE-1.
- `adminApi` in `src/services/api.js` already exists with token injection + 401→redirect.
- All admin data queries use `adminApi`, not `api`. Route guards use `AdminRoute` (already wired in App.jsx).
- Paginated lists (users, posts, reports) follow the same Pagination + EmptyState pattern as user-facing pages.
- Destructive actions (suspend, hide, resolve) use `<ConfirmDialog>` before calling the mutation.

### Testing Checklist (manual, human-executed)
- [ ] `/admin/login` renders without errors; non-admin login shows error
- [ ] Successful admin login stores token in useAdminStore (not localStorage)
- [ ] `/admin` dashboard shows overview stats
- [ ] `/admin/users` lists users; search and status filter work
- [ ] Suspend/reactivate user triggers ConfirmDialog; list refreshes after action
- [ ] `/admin/posts` lists posts; hide/restore work
- [ ] `/admin/reports` shows report queue; resolve/dismiss work
- [ ] `/admin/payments` shows payment list; release/refund work
- [ ] Admin logout redirects to `/admin/login`; adminToken cleared
- [ ] Non-admin user navigating to `/admin` is redirected to `/admin/login`
- [ ] No admin token in localStorage or sessionStorage at any point

---

### Notes for This Block
- Read `docs/API_CONTRACT.md` Section 11 before writing any admin service calls.
- Verify the actual admin login endpoint path in `goodsgo-backend/src/modules/admin/` or `goodsgo-backend/src/modules/auth/`.
- `src/stores/useAdminStore.js` is already implemented (FE-1) — do not recreate it.
- `adminApi` in `src/services/api.js` is already implemented (FE-1) — do not recreate it.
- `AdminRoute` in `src/components/guards/AdminRoute.jsx` is already implemented (FE-1).
- Admin pages are desktop-primary; mobile responsiveness is best-effort for this block.
