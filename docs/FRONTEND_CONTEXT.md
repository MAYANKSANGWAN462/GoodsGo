# GoodsGo — Frontend Engineering Context

> **Document purpose:** Permanent frontend engineering memory. Read at the start of every frontend session alongside `docs/FRONTEND_ARCHITECTURE.md`.
> **Last updated:** Start of frontend development (post-Block O backend completion).
> **Backend source of truth:** `docs/PROJECT_CONTEXT.md` governs all API behaviour, business rules, and backend architecture. This document never duplicates it.

---

## 1. How to Use This Document System

| File | When to Read | Update Frequency |
|---|---|---|
| `docs/FRONTEND_CONTEXT.md` (this file) | Every session | Only when conventions or stack decisions change |
| `docs/FRONTEND_ARCHITECTURE.md` | Every session | Only when files are added/moved |
| `docs/FRONTEND_MODULE_CONTEXT.md` | Every session | Regenerated after every completed frontend module |
| `docs/API_CONTRACT.md` | When integrating a new endpoint | Only when backend API changes |
| `docs/UI_COMPONENT_GUIDE.md` | When building or consuming a shared component | Updated as component catalogue grows |
| `docs/PROJECT_CONTEXT.md` | When backend behaviour is unclear | Backend team owns this |

---

## 2. Installed Stack — Actual vs. Planned

The scaffold at `goodsgo-frontend/` has **different versions from the plan** in `docs/PROJECT_CONTEXT.md` Section 7 and 30. Treat the installed versions as authoritative. Add missing packages only when the module that first needs them is being built.

| Library | Planned | Installed | Notes |
|---|---|---|---|
| React | 18 | **19.1.1** | Production-stable. Practical SPA differences minimal. |
| React Router DOM | v6 | **v7.9.3** | Breaking API differences — see Section 5. |
| Tailwind CSS | v3 + PostCSS | **v4.1.14 via `@tailwindcss/vite`** | CSS-first config — see Section 9. |
| Axios | Planned | **^1.18.1** | Installed in FE-1. |
| Zustand | Planned | **^5.0.14** | Installed in FE-1. |
| TanStack React Query | Planned | **^5.101.1** | Installed in FE-1. |
| React Hook Form + Yup | Planned | **^7.80.0 / ^1.7.1** | Installed in FE-1. |
| Leaflet + react-leaflet | Planned | **Not installed** | `npm install leaflet react-leaflet` before location module. |
| Socket.io-client | Planned | **^4.x (installed FE-6)** | Installed in FE-6. Connection managed by useSocket/SocketContext. |
| react-hot-toast | Planned | **^2.6.0** | Installed in FE-1. |
| PropTypes | Planned | **^15.8.1** | Installed in FE-1. |
| date-fns | Planned | **^4.4.0** | Installed in FE-1. |

---

## 3. Product Vision (Frontend Perspective)

GoodsGo has a **single account type** — no "I am a customer / I am a transporter" choice. The same user can post a transport need today and offer a vehicle tomorrow. The UI must never imply roles. The marketplace feed showing all three post types together is the product's gravitational centre.

The admin panel is a **completely separate product** embedded in the same codebase: different login, different JWT, different Axios instance, different layout. Treat it as such at every level.

---

## 4. Engineering Conventions

### Language and module system
- JavaScript only. No TypeScript. Hard constraint inherited from the backend.
- ESM modules (`import`/`export`) — Vite uses `"type": "module"`. The backend uses CommonJS. Do not confuse the two.
- PropTypes on every component that accepts props. No exceptions — this is the frontend's substitute for TypeScript prop types.

### Strict rules (same philosophy as backend CLAUDE.md)
- No business logic inside components. Logic belongs in custom hooks (`src/hooks/`) and service functions (`src/services/`).
- No direct Axios calls from components. All API calls go through service files.
- No hardcoded strings for route paths. Use `ROUTES` from `src/constants/routes.js`.
- No hardcoded vehicle type or goods category lists. Fetch from `GET /api/v1/config/options` at startup.
- No `localStorage` or `sessionStorage` for auth tokens. See Section 6.

### Component conventions
- One component per file. PascalCase filename matching the component name.
- Functional components only. No class components.
- `ComponentName.propTypes = { ... }` declared at the bottom of every component file.
- No data fetching inside `src/components/common/` components — data arrives via props only.

### Naming
| Context | Convention | Example |
|---|---|---|
| Component files | `PascalCase.jsx` | `BookingCard.jsx` |
| Hook files | `useCamelCase.js` | `usePosts.js` |
| Service files | `camelCase.service.js` | `auth.service.js` |
| Context files | `PascalCaseContext.jsx` | `AuthContext.jsx` |
| Constant files | `camelCase.js` | `bookingStatuses.js` |
| Utility files | `camelCase.js` | `formatters.js` |
| Page files | `PascalCasePage.jsx` | `MarketplacePage.jsx` |
| Route constants | `SCREAMING_SNAKE_CASE` | `ROUTES.MARKETPLACE` |
| Query keys | Array form | `['posts', filters]` |

---

## 5. Routing

**React Router v7 is installed.** V7 retains the v6 `<Routes>/<Route>` component API. **This project uses the component-based API only** — no loaders, no actions, no `createBrowserRouter`. All data fetching lives in React Query hooks.

### Guard components
- `<ProtectedRoute>` — redirects unauthenticated users to `/login`. Wraps all auth-required pages.
- `<AdminRoute>` — redirects non-admin users to `/admin/login`. Wraps all admin pages.

### Route tree summary
```
/                       → HomePage
/marketplace            → MarketplacePage (optionalAuth)
/marketplace/posts/:id  → PostDetailPage (optionalAuth)
/posts/create           → CreatePostPage (auth + email verified)
/posts/:id/edit         → EditPostPage (auth, owner enforced by backend)
/bookings               → BookingsPage (auth)
/bookings/:id           → BookingDetailPage (auth)
/chat                   → ChatPage (auth)
/profile/me             → MyProfilePage (auth)
/profile/settings       → SettingsPage (auth)
/profile/:userId        → PublicProfilePage (public)
/saved                  → SavedPostsPage (auth)
/notifications          → NotificationsPage (auth)
/payments               → PaymentHistoryPage (auth)
/login                  → LoginPage
/register               → RegisterPage
/forgot-password        → ForgotPasswordPage
/reset-password         → ResetPasswordPage
/admin/login            → AdminLoginPage
/admin                  → AdminDashboardPage (admin auth)
/admin/users            → AdminUsersPage
/admin/users/:id        → AdminUserDetailPage
/admin/posts            → AdminPostsPage
/admin/bookings         → AdminBookingsPage
/admin/reports          → AdminReportsPage
/admin/payments         → AdminPaymentsPage
/admin/reviews          → AdminReviewsPage
/404                    → NotFoundPage
/unauthorized           → UnauthorizedPage
```

---

## 6. Authentication Flow (Frontend Rules)

> Backend implementation: `docs/PROJECT_CONTEXT.md` Section 10. This section covers only frontend obligations.

### Token storage — non-negotiable
- **Access token:** Zustand memory only. Never `localStorage` or `sessionStorage`. Resets on page refresh by design — handled by silent refresh on app load.
- **Refresh token:** httpOnly cookie. The frontend never reads or writes it. Browser sends it automatically on requests to `/api/v1/auth/*` because Axios is configured with `withCredentials: true`.

### App startup sequence
1. Mount the app.
2. Attempt `POST /api/v1/auth/refresh-token` silently (Axios `withCredentials: true`).
3. If it returns `{ accessToken, user }`: store in `useAuthStore`, mark authenticated.
4. If it returns 401: user is unauthenticated — show public UI.
5. Fetch `GET /api/v1/config/options` to populate reference data (vehicle types, goods categories).

### 401 interceptor (automatic refresh)
The Axios response interceptor must:
1. On 401, call `POST /api/v1/auth/refresh-token` once.
2. If refresh succeeds, retry the original request with the new access token.
3. If refresh fails, clear `useAuthStore` and redirect to `/login`.
4. Queue concurrent 401s during a refresh to avoid multiple simultaneous refresh calls.

### Admin auth
- Completely separate from user auth.
- Separate Zustand store: `useAdminStore`.
- Separate Axios instance: `adminApi` (exported from `src/services/api.js`).
- Admin refresh token: its own httpOnly cookie.
- Admin login page: `/admin/login`. Never use the user login endpoint.

---

## 7. Global State (Zustand vs. React Query)

**Zustand:** auth state and socket connection reference only.

| Store | State held |
|---|---|
| `useAuthStore` | `{ user, accessToken, isAuthenticated }` |
| `useAdminStore` | `{ admin, adminToken, isAdminAuthenticated }` |
| `useSocketStore` | `{ socket, isConnected }` |

**React Query:** all server data (posts, bookings, notifications, conversations, etc.).

Do not put server data in Zustand. No posts, bookings, or notifications in Zustand stores.

---

## 8. React Query Conventions

### Standard query keys
```
['config']                        → GET /config/options
['posts', filters]                → GET /posts feed
['post', postId]                  → GET /posts/:id
['my-posts']                      → GET /users/me/posts
['saved-posts']                   → GET /users/me/saved-posts
['bookings', filters]             → GET /bookings (own)
['booking', bookingId]            → GET /bookings/:id
['booking-history', bookingId]    → GET /bookings/:id/history
['post-bookings', postId]         → GET /posts/:id/bookings
['conversations']                 → GET /chat
['conversation', id]              → GET /chat/:id
['messages', conversationId]      → GET /chat/:id/messages
['notifications']                 → GET /users/me/notifications
['user-reviews', userId]          → GET /reviews/users/:userId
['booking-reviews', bookingId]    → GET /reviews/bookings/:bookingId
['my-reviews']                    → GET /users/me/reviews
['me']                            → GET /users/me
['public-profile', userId]        → GET /users/:userId
['admin-users', filters]          → GET /admin/users
['admin-user', userId]            → GET /admin/users/:userId
['admin-posts', filters]          → GET /admin/posts
['admin-reports', filters]        → GET /admin/reports
['admin-disputes', filters]       → GET /admin/disputes
['admin-settings']                → GET /admin/settings
```

### Stale time defaults
| Data type | `staleTime` | Reason |
|---|---|---|
| Reference data `['config']` | `Infinity` | Changes require a backend deploy; cache forever per session |
| Feed `['posts']` | `60_000` (1 min) | Balance freshness vs. refetch cost |
| Own profile `['me']` | `30_000` | Changes are user-initiated |
| Conversation messages | `0` | Real-time socket keeps this fresh |
| Notifications | `0` | Real-time socket updates drive UI |

---

## 9. Socket Architecture

### Connection lifecycle
1. When `isAuthenticated` becomes `true`, connect socket.io-client to the backend with `{ auth: { token: accessToken }, withCredentials: true }`.
2. Store socket in `useSocketStore`.
3. On logout or 401 refresh failure, disconnect socket and clear `useSocketStore`.

### Events to listen for
| Event | Frontend action |
|---|---|
| `notification` | Add to notifications cache; show toast for high-priority types |
| `new_message` | Append message to `['messages', conversationId]` cache |
| `typing_start` | Show typing indicator in `ChatWindow` |
| `typing_stop` | Hide typing indicator |

### Events to emit
| Event | When |
|---|---|
| `join_conversation` | On opening a `ChatWindow` |
| `leave_conversation` | On closing a `ChatWindow` |
| `typing_start` | On keystroke in `ChatInputBar` (debounced 300ms) |
| `typing_stop` | On input blur or 2s silence |
| `messages_read` | On visible message scroll to bottom |
| `mark_read` | On reading a notification |

---

## 10. Axios Integration

### User Axios instance (`api` from `src/services/api.js`)
- `baseURL`: `import.meta.env.VITE_API_URL`
- `withCredentials: true`
- Request interceptor: attach `Authorization: Bearer <accessToken>` from `useAuthStore`
- Response interceptor: unwrap `response.data.data` and `response.data.meta`; handle 401 with refresh; re-throw errors in standard shape

### Admin Axios instance (`adminApi` from `src/services/api.js`)
- Same base config but attaches `adminToken` from `useAdminStore`
- No 401-refresh logic for admin — admin token expiry redirects to `/admin/login`

### Standard error shape re-thrown by interceptor
```js
{ message: string, errors: Array<{field, message}> | null, code: string | null, status: number }
```
Every service function and mutation `onError` handler receives this shape.

---

## 11. Form Conventions

- React Hook Form for all forms. Yup as the schema validator via `@hookform/resolvers/yup`.
- Yup schemas mirror backend Joi schemas for the same endpoint. Keep both in sync when a validation rule changes on either side.
- Yup schemas live in the same file as the form component or in a sibling `*.schema.js` file.
- All field-level errors — Yup pre-submit and API post-submit — display via the `<Input>` component's error prop.
- Never make a backend-required field optional on the frontend to reduce friction. The backend will reject it anyway.

---

## 12. Tailwind v4 Notes

- Config is CSS-first. `@import "tailwindcss"` in `src/index.css` — no `tailwind.config.js` required for basic use.
- Custom design tokens go in `src/index.css` under `@theme { }` blocks.
- `@tailwindcss/vite` handles the build. Do not add PostCSS separately.
- Utility class names are identical to Tailwind v3.
- Define the primary brand colour once in `@theme` and reference it as `bg-primary`, `text-primary`.

---

## 13. Reference Data

`GET /api/v1/config/options` returns `{ vehicleTypes, goodsCategories }`. Fetch once on startup via React Query with `staleTime: Infinity`. Do not hardcode these lists. The `src/constants/vehicleTypes.js` and `src/constants/goodsCategories.js` files exist only for display-label lookups and local fallback — the backend tables are the authoritative source.

---

## 14. Engineering Decisions Log

| Decision | Rationale | Revisable? |
|---|---|---|
| React 19 | Already installed; upgrade cost > benefit | Until explicit decision |
| React Router v7, component API | Data fetching stays in React Query | Can revisit per module |
| Tailwind v4 via Vite plugin | Already scaffolded this way | Until explicit version decision |
| No TypeScript | Hard constraint from project owner | Immutable |
| Access token in Zustand memory only | Backend security requirement | Immutable |
| React Query for all server state | Caching, deduplication, background refresh | Immutable |
| Separate Axios instance for admin | Admin token is cryptographically separate | Immutable |
| Yup mirrors Joi by hand | No shared-schema tooling | Until tooling exists |
| `ROUTES` constant for all paths | Single rename point | Immutable |
| Socket connected only when authenticated | No wasted WebSocket for public browsing | Immutable |
