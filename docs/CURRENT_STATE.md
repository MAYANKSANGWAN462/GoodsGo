# GoodsGo — Current Development State

> **Purpose:** Concise snapshot of where development stands right now.  
> **Last updated:** 2026-06-27 (after FE-8 — Profile — own profile + settings + public profile)  
> **Source of truth for architecture/requirements:** `docs/PROJECT_CONTEXT.md`

---

## Current Project Phase

Frontend development — FE-8 complete. Full profile experience is live: MyProfilePage (own profile with PostList tab + Reviews empty-state tab), SettingsPage (edit profile form with RHF+Yup, change password, avatar upload/remove, deactivate account behind ConfirmDialog), PublicProfilePage (public user profile with paginated reviews, redirects to own profile if viewing self, 404-redirects for suspended users), SavedPostsPage (saved posts list reusing PostList). New common component: StarRating (read-only + interactive). New service/hook files: users.service.js, reviews.service.js, useUsers.js, useReviews.js. getSavedPosts + useSavedPosts added to posts layer. Build passes at 588 modules, 0 errors.

---

## Overall Progress

| Area | Progress | Notes |
|---|---|---|
| Backend | ~100% complete (all planned modules) | Syntax-validated; never run against a live database |
| Frontend | FE-8 complete | Foundation + Auth + Layout + Marketplace + Post CRUD + Bookings + Chat + Notifications + Profile wired |
| Database | Schema 100% designed, 20 migrations written | Never executed against a real Postgres instance |
| Deployment | 0% | No hosting account confirmed, no CI/CD |

---

## Completed Blocks (in order)

`A → B → C → D → E → F → H → K → I → J → L → M → N → O` (backend)  
`FE-1 → FE-2 → FE-3 → FE-4 → FE-5 → FE-6 → FE-7 → FE-8` (frontend)

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
| **FE-8: Profile (Own Profile + Settings + Public Profile)** | **FE-8** | **Complete** — users.service.js; reviews.service.js; useUsers.js (useMe, usePublicProfile, useUpdateProfile, useChangePassword, useUploadAvatar, useRemoveAvatar, useDeactivateAccount); useReviews.js (useUserReviews, useMyReviews, useDeleteReview); getSavedPosts + useSavedPosts added to posts layer; StarRating.jsx common component; ProfileHeader, ProfileStats, VerificationBadges profile components; MyProfilePage, PublicProfilePage, SettingsPage, SavedPostsPage; App.jsx wired |

---

## Partially Completed Modules

None.

---

## Pending Frontend Modules

| Block | Scope | Status |
|---|---|---|
| FE-9 | Reviews — create review on booking detail + public profile ReviewList | Not started |
| FE-10 | Payments — Razorpay initiate + verify flow | Not started |
| FE-11 | Admin panel — login + all admin pages | Not started |
| FE-12 | Polish — empty states, error boundaries, responsive audit | Not started |

---

## Current Active Frontend Module

**FE-9 — Reviews (Create Review + Review List)**  
See `docs/FRONTEND_MODULE_CONTEXT.md` for the implementation brief.

---

## Current Milestone

FE-8 complete. Next milestone: FE-9 (Reviews — create review on booking detail + public profile review list).

---

## Known Blockers

| Priority | Issue | Location | Effect |
|---|---|---|---|
| 🟠 P1 | `razorpay` npm package added to `package.json` but **not yet installed** | `goodsgo-backend/` | Will fail at runtime until `npm install` is run in `goodsgo-backend/`. |
| 🟡 P2 | `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_FULL_NAME` not in `.env.example` | `seed_admin.js` | Functional with insecure hardcoded fallback defaults. |
| 🟡 P2 | No `.env` file in `goodsgo-backend/` — backend needs `JWT_SECRET`, `DATABASE_URL`, etc. | Backend | Backend will not start without proper env vars. |

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
- [ ] Set all required env vars in `goodsgo-backend/.env`
- [ ] Set `VITE_API_URL` in `goodsgo-frontend/.env` for your dev backend URL (currently `http://localhost:5000`)
- [ ] Connect to a real PostgreSQL instance and run all 20 migrations + 4 seed scripts
- [ ] Begin FE-9 — Reviews (create review on booking detail + public profile review list)

---

## Recently Completed Work

**FE-8 — Profile (Own Profile + Settings + Public Profile):**

New files created:
- `src/services/users.service.js` — getMe, updateProfile, changePassword, uploadAvatar, removeAvatar, getPublicProfile, deactivateAccount
- `src/services/reviews.service.js` — getUserReviews, getMyReviews, deleteReview
- `src/hooks/useUsers.js` — useMe (staleTime 30s); usePublicProfile (no-retry on 404); useUpdateProfile; useChangePassword (logout+redirect on success); useUploadAvatar; useRemoveAvatar; useDeactivateAccount (logout+redirect on success)
- `src/hooks/useReviews.js` — useUserReviews; useMyReviews; useDeleteReview
- `src/components/common/StarRating.jsx` — 1–5 star display or interactive; half-star support; readOnly prop; numeric label in read-only mode
- `src/components/profile/VerificationBadges.jsx` — email/phone/identity verified badges with check/cross icons
- `src/components/profile/ProfileStats.jsx` — posts, bookings, reviews, cancellations counts in a row
- `src/components/profile/ProfileHeader.jsx` — avatar, name, StarRating, location, member-since, bio, VerificationBadges; optional "Edit profile" link for own-profile view
- `src/pages/profile/MyProfilePage.jsx` — tabbed: "My Posts" (PostList via useMyPosts) + "Reviews" (EmptyState until FE-9)
- `src/pages/profile/PublicProfilePage.jsx` — public profile with paginated reviews; redirects to MY_PROFILE if viewing own userId; 404 redirect for suspended users
- `src/pages/profile/SettingsPage.jsx` — edit profile form (RHF+Yup, reset() prefill from useMe); change password form (logout on success); avatar upload/remove (hidden file input); deactivate account (ConfirmDialog)
- `src/pages/saved/SavedPostsPage.jsx` — saved posts list reusing PostList; EmptyState with CTA to marketplace

Files modified:
- `src/services/posts.service.js` — added getSavedPosts()
- `src/hooks/usePosts.js` — added useSavedPosts(); added getSavedPosts import
- `src/App.jsx` — imported 4 new pages; replaced PlaceholderPage for /profile/me, /profile/settings, /saved; added /profile/:userId to public MainLayout group

Build: `vite build` passes — 0 errors, 588 modules.

---

## Known Technical Debt

- **MyProfilePage Reviews tab:** Shows EmptyState ("No reviews yet") until FE-9 wires ReviewList + ReviewForm.
- **PublicProfilePage ReviewCard:** Inline component in the page file — will be replaced by the proper `ReviewCard` from `src/components/reviews/` when FE-9 builds the reviews component catalogue.
- **ProfileStats counts (postCount, bookingCount, reviewCount, cancellationCount):** Rendered as 0 if the backend's GET /users/me and GET /users/:userId responses don't include these aggregates. Verify backend formatter includes them; no frontend change needed.
- **Location coordinates on post create:** Origin/destination lat/lng auto-geocoded on address blur; defaults to 0,0 if backend unreachable. LocationAutocomplete component deferred to FE-12 polish.
- **BookingDetailPage — payment and reviews sections are stubs:** Payment: FE-10; reviews: FE-9.
- **ChatPage height** uses `calc(100vh - 9rem)` — may need tuning if Navbar height changes.
- **Oldest messages pagination** not yet implemented in ChatWindow — FE-12 polish item.
