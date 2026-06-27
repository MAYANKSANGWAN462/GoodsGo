# GoodsGo — Current Development State

> **Purpose:** Concise snapshot of where development stands right now.  
> **Last updated:** 2026-06-27 (after FE-9 — Reviews — create review on BookingDetailPage + ReviewList on profile pages)  
> **Source of truth for architecture/requirements:** `docs/PROJECT_CONTEXT.md`

---

## Current Project Phase

Frontend development — FE-9 complete. Review creation and display are fully wired: ReviewCard (role badge, editable delete button), ReviewList (paginated, shared by PublicProfilePage and MyProfilePage), ReviewForm (RHF+Yup, interactive StarRating, role derived from booking). BookingDetailPage shows existing booking reviews and ReviewForm when status is `completed` and user hasn't reviewed yet. MyProfilePage Reviews tab replaced EmptyState with ReviewList + delete. PublicProfilePage inline ReviewCard replaced with shared component. Build passes at 592 modules, 0 errors.

---

## Overall Progress

| Area | Progress | Notes |
|---|---|---|
| Backend | ~100% complete (all planned modules) | Syntax-validated; never run against a live database |
| Frontend | FE-9 complete | Foundation + Auth + Layout + Marketplace + Post CRUD + Bookings + Chat + Notifications + Profile + Reviews wired |
| Database | Schema 100% designed, 20 migrations written | Never executed against a real Postgres instance |
| Deployment | 0% | No hosting account confirmed, no CI/CD |

---

## Completed Blocks (in order)

`A → B → C → D → E → F → H → K → I → J → L → M → N → O` (backend)  
`FE-1 → FE-2 → FE-3 → FE-4 → FE-5 → FE-6 → FE-7 → FE-8 → FE-9` (frontend)

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

---

## Partially Completed Modules

None.

---

## Pending Frontend Modules

| Block | Scope | Status |
|---|---|---|
| FE-10 | Payments — Razorpay initiate + verify flow | Not started |
| FE-11 | Admin panel — login + all admin pages | Not started |
| FE-12 | Polish — empty states, error boundaries, responsive audit | Not started |

---

## Current Active Frontend Module

**FE-10 — Payments (Razorpay Initiate + Verify)**  
See `docs/FRONTEND_MODULE_CONTEXT.md` for the implementation brief.

---

## Current Milestone

FE-9 complete. Next milestone: FE-10 (Payments — Razorpay initiate + verify + PaymentHistoryPage).

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
- [ ] Begin FE-10 — Payments (Razorpay initiate + verify + PaymentHistoryPage)

---

## Recently Completed Work

**FE-9 — Reviews (Create Review + Review Lists):**

New service additions:
- `src/services/reviews.service.js` — added `createReview(body)` and `getBookingReviews(bookingId)`

New hook additions:
- `src/hooks/useReviews.js` — added `useBookingReviews(bookingId)` and `useCreateReview()` (mutation with cache invalidation for booking-reviews, public-profile, user-reviews)

New component files (implemented from stubs):
- `src/components/reviews/ReviewCard.jsx` — Avatar, name, StarRating (read-only), comment, date, role badge (showRoleBadge), delete button (when onDelete + isEditable)
- `src/components/reviews/ReviewList.jsx` — renders ReviewCard array + Pagination + EmptyState; manages delete state internally via useDeleteReview; allowDelete, showRoleBadge, emptyTitle, emptyMessage props
- `src/components/reviews/ReviewForm.jsx` — RHF+Yup; StarRating via Controller; comment Textarea; reviewRole shown as info text (not user-selectable)

Files modified:
- `src/pages/profile/PublicProfilePage.jsx` — removed inline ReviewCard function; replaced review section with ReviewList
- `src/pages/profile/MyProfilePage.jsx` — added useMyReviews; replaced Reviews tab EmptyState with ReviewList (showRoleBadge, allowDelete)
- `src/pages/bookings/BookingDetailPage.jsx` — added useBookingReviews, useDeleteReview, useState for deletingReviewId; replaced reviews stub with full reviews section (existing reviews + ReviewForm when not yet reviewed; "waiting" message when both parties have reviewed)

Build: `vite build` passes — 0 errors, 592 modules.

---

## Known Technical Debt

- **BookingDetailPage — payment section is a stub:** Payment: FE-10.
- **ProfileStats counts (postCount, bookingCount, reviewCount, cancellationCount):** Rendered as 0 if the backend's GET /users/me and GET /users/:userId responses don't include these aggregates. Verify backend formatter includes them; no frontend change needed.
- **Location coordinates on post create:** Origin/destination lat/lng auto-geocoded on address blur; defaults to 0,0 if backend unreachable. LocationAutocomplete component deferred to FE-12 polish.
- **ChatPage height** uses `calc(100vh - 9rem)` — may need tuning if Navbar height changes.
- **Oldest messages pagination** not yet implemented in ChatWindow — FE-12 polish item.
- **MyProfilePage Reviews tab pagination:** useMyReviews fetches all reviews without pagination params. If the list grows large, add page state and update the service/hook in FE-12 polish.
