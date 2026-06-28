# GoodsGo — Current Development State

> **Purpose:** Concise snapshot of where development stands right now.  
> **Last updated:** 2026-06-28 (after FE-12 — Polish Pass — ErrorBoundary, LocationAutocomplete, ChatWindow pagination, FRONTEND COMPLETE)  
> **Source of truth for architecture/requirements:** `docs/PROJECT_CONTEXT.md`

---

## Current Project Phase

**Frontend development COMPLETE — all 12 modules (FE-1 through FE-12) implemented.**

FE-12 (Polish Pass) complete: `ErrorBoundary` class component wrapping the full route tree; `LocationAutocomplete` with debounced geocoding + suggestion dropdown wired via RHF `Controller` into all 3 post forms (replacing the old onBlur geocode pattern); ChatWindow scroll-to-top loads older message pages with scroll-position restoration; `docs/UI_COMPONENT_GUIDE.md` updated with both new components. Build passes at 609 modules, 0 errors.

Next phase: deployment (provision Postgres, run migrations, configure env, deploy backend + frontend).

---

## Overall Progress

| Area | Progress | Notes |
|---|---|---|
| Backend | ~100% complete (all planned modules + admin login fix) | Syntax-validated; never run against a live database |
| Frontend | **COMPLETE (FE-12)** | All modules done: Foundation, Auth, Layout, Marketplace, Post CRUD, Bookings, Chat, Notifications, Profile, Reviews, Payments, Admin Panel, Polish |
| Database | Schema 100% designed, 20 migrations written | Never executed against a real Postgres instance |
| Deployment | 0% | No hosting account confirmed, no CI/CD |

---

## Completed Blocks (in order)

`A → B → C → D → E → F → H → K → I → J → L → M → N → O` (backend)  
`FE-1 → FE-2 → FE-3 → FE-4 → FE-5 → FE-6 → FE-7 → FE-8 → FE-9 → FE-10 → FE-11 → FE-12` (frontend — ALL COMPLETE)

---

## Completed Modules

| Module | Block | Status |
|---|---|---|
| Core utilities & infrastructure | A | Complete |
| Config layer | B | Complete |
| Middleware stack | C | Complete |
| Database migrations (001–020) + seeds | D / O | Complete — 20 migrations total |
| Auth module | E | Complete |
| Users module | F | Complete |
| Location module | H | Complete |
| Posts module | H | Complete |
| Config routes | H | Complete |
| Cron job | H | Complete |
| Bookings module | K | Complete |
| Notifications module | I | Complete |
| Socket Handlers | J | Complete |
| Chat REST API | L | Complete |
| Reviews module | M | Complete |
| Payments module | N | Complete |
| Admin module | O | Complete |
| **FE-1: Foundation + Auth** | **FE-1** | **Complete** — Axios instances, Zustand stores, auth pages, route tree, providers |
| **FE-2: Layout Shell + HomePage** | **FE-2** | **Complete** — Navbar (dropdown, bell stub), Sidebar (mobile), MainLayout, Footer, HomePage full design |
| **FE-3: Config Fetch + Marketplace + Post Detail** | **FE-3** | **Complete** — config startup fetch, Marketplace feed with URL-synced filtering, PostDetail page, common components (Badge, Card, Pagination, EmptyState) |
| **FE-4: Create/Edit Post (All 3 Post Types)** | **FE-4** | **Complete** — Select, Textarea, ConfirmDialog common components; NeedTransportForm, VehicleAvailableForm, ReturnJourneyForm; CreatePostPage, EditPostPage; service + hook additions |
| **FE-5: Bookings (List + Detail + State Actions)** | **FE-5** | **Complete** — Modal.jsx common component; bookingStatuses constants; bookings.service.js; useBookings hook; BookingStatusBadge, BookingCard, BookingList, BookingActionButtons, BookingRequestModal; BookingsPage, BookingDetailPage; PostDetailPage + App.jsx wired |
| **FE-6: Chat (Conversation List + Real-Time Window)** | **FE-6** | **Complete** — useSocketStore (new); useDebounce; chat.service.js; useSocket; SocketContext/SocketProvider; useChat (useConversations, useConversation, useMessages, useSendMessage, useSendImageMessage, useConversationSocket); MessageBubble, TypingIndicator, ChatInputBar, ConversationList, ChatWindow; ChatPage split view; App.jsx wired with SocketProvider |
| **FE-7: Notifications (Bell + Dropdown + Page)** | **FE-7** | **Complete** — notifications.service.js; useNotifications (useNotifications, useMarkOneRead, useMarkAllRead); NotificationContext/NotificationProvider (socket subscription singleton); NotificationBell (live badge, replaces FE-2 stub); NotificationDropdown; NotificationItem (type icons, navigation); NotificationsPage (paginated); App.jsx wired with NotificationProvider |
| **FE-8: Profile (Own Profile + Settings + Public Profile)** | **FE-8** | **Complete** — users.service.js; reviews.service.js (getUserReviews, getMyReviews, deleteReview); useUsers.js; useReviews.js (useUserReviews, useMyReviews, useDeleteReview); getSavedPosts + useSavedPosts; StarRating.jsx common component; ProfileHeader, ProfileStats, VerificationBadges profile components; MyProfilePage, PublicProfilePage, SettingsPage, SavedPostsPage; App.jsx wired |
| **FE-9: Reviews (Create Review + Review Lists)** | **FE-9** | **Complete** — createReview + getBookingReviews added to reviews.service.js; useBookingReviews + useCreateReview added to useReviews.js; ReviewCard (role badge, delete button gated on isEditable); ReviewList (paginated, emptyTitle/emptyMessage props, internal delete management); ReviewForm (RHF+Yup, StarRating via Controller, reviewRole as hidden prop); BookingDetailPage reviews section (shows existing reviews + form for non-reviewed completed bookings); MyProfilePage Reviews tab uses ReviewList+allowDelete; PublicProfilePage inline ReviewCard replaced with shared component |
| **FE-10: Payments (Razorpay Initiate + Verify)** | **FE-10** | **Complete** — payments.service.js (initiatePayment, verifyPayment); usePayments.js (useInitiatePayment, useVerifyPayment); PaymentHistoryPage (informational — no backend GET /payments endpoint); BookingDetailPage payment section (requester: amount/deadline/Pay Now; owner: awaiting-payment notice; paymentVerified local state; Razorpay script dynamic load); App.jsx wired |
| **FE-11: Admin Panel** | **FE-11** | **Complete** — Backend fix: POST /auth/admin/login added to auth.service.js + auth.controller.js + auth.routes.js + auth.validator.js; admin.service.js (new); useAdmin.js (new); AdminLayout (dark sidebar + responsive topbar + logout); AdminLoginPage (RHF+Yup, adminApi, useAdminStore); AdminDashboardPage (live stats via 4 admin queries); AdminUsersPage (paginated, search, suspend/reactivate); AdminUserDetailPage (full profile + activity counts + actions); AdminPostsPage (status/reported filters, hide/restore); AdminReportsPage (Reports tab: resolve/dismiss; Disputes tab: resolve); AdminPaymentsPage (release/refund by booking ID); AdminReviewsPage + AdminBookingsPage (informational — no backend list endpoints for these); App.jsx updated |
| **FE-12: Polish Pass** | **FE-12** | **Complete** — ErrorBoundary.jsx (React class component; wraps full Routes tree in App.jsx); LocationAutocomplete.jsx (debounced geocoding + suggestion dropdown; wired via Controller in all 3 post forms, replacing the onBlur geocode pattern); ChatWindow.jsx (scroll-to-top loads older pages via getMessages with local olderMessages state + scroll-position restore); AdminReportsPage propTypes audit (ReportRow + DisputeRow already correct); docs updated (CURRENT_STATE.md, FRONTEND_ARCHITECTURE.md, UI_COMPONENT_GUIDE.md, FRONTEND_MODULE_CONTEXT.md). Build: 609 modules, 0 errors. **FRONTEND COMPLETE.** |

---

## Partially Completed Modules

None.

---

## Pending Frontend Modules

None. All frontend modules are complete.

---

## Current Active Frontend Module

**None — frontend development complete.** See `docs/FRONTEND_MODULE_CONTEXT.md`.

---

## Current Milestone

FE-11 complete. Next milestone: FE-12 (Polish — error boundaries, responsive audit, location autocomplete, chat pagination, deferred tech-debt items).

---

## Known Blockers

| Priority | Issue | Location | Effect |
|---|---|---|---|
| 🟠 P1 | `razorpay` npm package added to `package.json` but **not yet installed** | `goodsgo-backend/` | Will fail at runtime until `npm install` is run in `goodsgo-backend/`. |
| 🟡 P2 | `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_FULL_NAME` not in `.env.example` | `seed_admin.js` | Functional with insecure hardcoded fallback defaults. |
| 🟡 P2 | No `.env` file in `goodsgo-backend/` — backend needs `JWT_SECRET`, `DATABASE_URL`, `JWT_ADMIN_SECRET`, etc. | Backend | Backend will not start without proper env vars. |

---

## Frontend-Specific Installed Packages

```
axios ^1.x               (FE-1)
zustand ^5.x             (FE-1)
@tanstack/react-query ^5.x  (FE-1)
react-hook-form ^7.x     (FE-1)
yup ^1.x                 (FE-1)
@hookform/resolvers ^3.x  (FE-1)
react-hot-toast ^2.x     (FE-1)
prop-types ^15.x         (FE-1)
date-fns ^4.x            (FE-1)
socket.io-client ^4.x    (FE-6)
```

---

## Important TODOs

- [ ] **Run `npm install`** in `goodsgo-backend/` — installs `razorpay@^2.9.4`
- [ ] Set all required env vars in `goodsgo-backend/.env` (including `JWT_ADMIN_SECRET`)
- [ ] Set `VITE_API_URL` in `goodsgo-frontend/.env` for your dev backend URL (currently `http://localhost:5000`)
- [ ] Connect to a real PostgreSQL instance and run all 20 migrations + 4 seed scripts (including `seed_admin.js`)
- [ ] Begin FE-12 — Polish pass (error boundaries, responsive audit, location autocomplete, chat pagination)

---

## Recently Completed Work

**FE-11 — Admin Panel:**

**Backend fix (in auth module):**
- `src/modules/auth/auth.validator.js` — added `adminLoginSchema` export
- `src/modules/auth/auth.service.js` — added `adminLogin(email, password)` function; imports `generateAdminToken`
- `src/modules/auth/auth.controller.js` — added `adminLogin` controller (`POST /auth/admin/login`)
- `src/modules/auth/auth.routes.js` — added `POST /admin/login` route with `authLimiter` + `adminLoginSchema`

**New service file:**
- `src/services/admin.service.js` — `adminLogin`, `getAdminUsers`, `getAdminUser`, `suspendUser`, `reactivateUser`, `getAdminPosts`, `hidePost`, `restorePost`, `getAdminReports`, `resolveReport`, `dismissReport`, `getAdminDisputes`, `resolveDispute`, `releasePayment`, `refundPayment`, `getAdminSettings`

**New hook file:**
- `src/hooks/useAdmin.js` — `useAdminUsers`, `useAdminUser`, `useSuspendUser`, `useReactivateUser`, `useAdminPosts`, `useHidePost`, `useRestorePost`, `useAdminReports`, `useResolveReport`, `useDismissReport`, `useAdminDisputes`, `useResolveDispute`, `useReleasePayment`, `useRefundPayment`, `useAdminSettings`

**Files implemented from stubs:**
- `src/components/layout/AdminLayout.jsx` — dark sidebar with nav links + responsive hamburger + topbar with admin info and logout
- `src/pages/admin/AdminLoginPage.jsx` — RHF+Yup form, calls `adminLogin()`, stores in `useAdminStore`
- `src/pages/admin/AdminDashboardPage.jsx` — live stats (users, posts, reports, disputes) + quick-action links
- `src/pages/admin/AdminUsersPage.jsx` — paginated user list, search, status filter, suspend (reason modal) / reactivate
- `src/pages/admin/AdminUserDetailPage.jsx` — full profile, activity stats, suspend/reactivate actions
- `src/pages/admin/AdminPostsPage.jsx` — status/reported filters, hide/restore with ConfirmDialog
- `src/pages/admin/AdminReportsPage.jsx` — Reports tab (resolve with action + notes, dismiss) + Disputes tab (resolve with outcome)
- `src/pages/admin/AdminPaymentsPage.jsx` — release/refund forms by booking ID (no list endpoint exists in backend)
- `src/pages/admin/AdminReviewsPage.jsx` — informational (no GET /admin/reviews backend endpoint)
- `src/pages/admin/AdminBookingsPage.jsx` — informational (no GET /admin/bookings backend endpoint)

**Files modified:**
- `src/App.jsx` — 8 admin page imports added; PlaceholderPage replaced for all admin routes

**Build:** `vite build` passes — 0 errors, 607 modules.

---

## Known Technical Debt

- **PaymentHistoryPage has no real data:** No `GET /payments` endpoint exists in the backend. The page is informational only.
- **paymentVerified local state resets on page refresh:** After verifying payment, if the user refreshes `BookingDetailPage`, the "Pay Now" button reappears.
- **AdminBookingsPage has no real data:** No `GET /admin/bookings` endpoint in backend. Informational page only.
- **AdminReviewsPage has no real data:** No `GET /admin/reviews` endpoint in backend. Informational page only.
- **Admin panel has no refresh-token mechanism:** Admin JWTs expire after 8h (per `JWT_ADMIN_EXPIRES_IN`). On expiry, the adminApi 401 interceptor clears `useAdminStore` and redirects to `/admin/login`. No silent refresh like the user flow.
- **ProfileStats counts (postCount, bookingCount, reviewCount, cancellationCount):** Rendered as 0 if the backend's GET /users/me and GET /users/:userId responses don't include these aggregates.
- **Location coordinates on post create:** Origin/destination lat/lng auto-geocoded on address blur; defaults to 0,0 if backend unreachable. LocationAutocomplete component deferred to FE-12 polish.
- **ChatPage height** uses `calc(100vh - 9rem)` — may need tuning if Navbar height changes.
- **Oldest messages pagination** not yet implemented in ChatWindow — FE-12 polish item.
- **MyProfilePage Reviews tab pagination:** useMyReviews fetches all reviews without pagination params.
