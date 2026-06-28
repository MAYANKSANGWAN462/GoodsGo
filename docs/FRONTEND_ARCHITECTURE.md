# GoodsGo — Frontend Architecture

> **Purpose:** Complete frontend folder structure with every file's responsibility. Read alongside `docs/FRONTEND_CONTEXT.md`.
> **Last updated:** After FE-3 — Config Fetch + Marketplace Feed + Post Detail.
> **Source of truth for existing files:** `goodsgo-frontend/src/`. Files marked ✅ are implemented; others remain empty stubs unless noted.

**FE-1 implemented files:** `main.jsx`, `App.jsx`, `index.css`, `src/stores/useAuthStore.js`, `src/stores/useAdminStore.js`, `src/services/api.js`, `src/services/auth.service.js`, `src/constants/routes.js`, `src/utils/generateInitials.js`, `src/utils/errorParser.js`, `src/utils/formatters.js`, `src/components/common/Spinner.jsx`, `src/components/common/Button.jsx`, `src/components/common/Input.jsx`, `src/context/AuthContext.jsx`, `src/hooks/useAuth.js`, `src/components/guards/ProtectedRoute.jsx`, `src/components/guards/AdminRoute.jsx`, `src/components/layout/AuthLayout.jsx`, `src/pages/NotFoundPage.jsx`, `src/pages/UnauthorizedPage.jsx`, `src/pages/auth/LoginPage.jsx`, `src/pages/auth/RegisterPage.jsx`, `src/pages/auth/ForgotPasswordPage.jsx`, `src/pages/auth/ResetPasswordPage.jsx`.

**FE-2 implemented files:** `src/components/common/Avatar.jsx`, `src/components/layout/Navbar.jsx`, `src/components/layout/Sidebar.jsx`, `src/components/layout/MainLayout.jsx`, `src/components/layout/Footer.jsx`, `src/pages/HomePage.jsx`, `src/components/notifications/NotificationBell.jsx` (stub — static bell icon; full implementation in FE-7).

**FE-3 implemented files:** `src/constants/postTypes.js`, `src/services/config.service.js`, `src/services/posts.service.js`, `src/hooks/usePosts.js`, `src/components/common/Badge.jsx`, `src/components/common/Card.jsx`, `src/components/common/Pagination.jsx`, `src/components/common/EmptyState.jsx`, `src/components/posts/PostTypeBadge.jsx`, `src/components/posts/PostCard.jsx`, `src/components/posts/PostImageGallery.jsx`, `src/components/posts/PostList.jsx`, `src/components/posts/PostFilters.jsx`, `src/pages/marketplace/MarketplacePage.jsx`, `src/pages/marketplace/PostDetailPage.jsx`. `src/App.jsx` updated (marketplace routes moved outside ProtectedRoute; startup config fetch added).

**FE-4 implemented files:** `src/components/common/Select.jsx`, `src/components/common/Textarea.jsx`, `src/components/common/ConfirmDialog.jsx`, `src/components/posts/NeedTransportForm.jsx`, `src/components/posts/VehicleAvailableForm.jsx`, `src/components/posts/ReturnJourneyForm.jsx`, `src/pages/posts/CreatePostPage.jsx`, `src/pages/posts/EditPostPage.jsx`, `src/services/location.service.js` (partial — geocodeAddress + reverseGeocode). `src/services/posts.service.js`, `src/hooks/usePosts.js`, `src/App.jsx` updated (new functions; real page imports replacing PlaceholderPage).

**FE-5 implemented files:** `src/constants/bookingStatuses.js`, `src/services/bookings.service.js`, `src/hooks/useBookings.js`, `src/components/common/Modal.jsx`, `src/components/bookings/BookingStatusBadge.jsx`, `src/components/bookings/BookingCard.jsx`, `src/components/bookings/BookingList.jsx`, `src/components/bookings/BookingActionButtons.jsx`, `src/components/bookings/BookingRequestModal.jsx`, `src/pages/bookings/BookingsPage.jsx`, `src/pages/bookings/BookingDetailPage.jsx`. `src/pages/marketplace/PostDetailPage.jsx`, `src/App.jsx` updated (BookingRequestModal wired; real booking page imports replacing PlaceholderPage).

**FE-6 implemented files:** `src/stores/useSocketStore.js` (new — not in original scaffold), `src/hooks/useDebounce.js`, `src/services/chat.service.js`, `src/hooks/useSocket.js`, `src/context/SocketContext.jsx`, `src/hooks/useChat.js`, `src/components/chat/MessageBubble.jsx`, `src/components/chat/TypingIndicator.jsx`, `src/components/chat/ChatInputBar.jsx`, `src/components/chat/ConversationList.jsx`, `src/components/chat/ChatWindow.jsx`, `src/pages/chat/ChatPage.jsx`. `src/App.jsx` updated (SocketProvider added; real ChatPage replacing PlaceholderPage for /chat). Package installed: `socket.io-client`.

**FE-7 implemented files:** `src/services/notifications.service.js`, `src/hooks/useNotifications.js`, `src/context/NotificationContext.jsx`, `src/components/notifications/NotificationBell.jsx` (FE-2 stub fully replaced), `src/components/notifications/NotificationDropdown.jsx`, `src/components/notifications/NotificationItem.jsx`, `src/pages/notifications/NotificationsPage.jsx`. `src/App.jsx` updated (NotificationProvider added inside SocketProvider; real NotificationsPage replacing PlaceholderPage for /notifications).

**FE-8 implemented files:** `src/services/users.service.js`, `src/services/reviews.service.js`, `src/hooks/useUsers.js` (new — not a scaffold stub), `src/hooks/useReviews.js` (new — not a scaffold stub), `src/components/common/StarRating.jsx`, `src/components/profile/VerificationBadges.jsx`, `src/components/profile/ProfileStats.jsx`, `src/components/profile/ProfileHeader.jsx`, `src/pages/profile/MyProfilePage.jsx`, `src/pages/profile/PublicProfilePage.jsx`, `src/pages/profile/SettingsPage.jsx`, `src/pages/saved/SavedPostsPage.jsx`. `src/services/posts.service.js` updated (getSavedPosts added). `src/hooks/usePosts.js` updated (useSavedPosts added). `src/App.jsx` updated (4 new page imports; PlaceholderPage replaced for /profile/me, /profile/settings, /saved; /profile/:userId added to public MainLayout group).

**FE-9 implemented files:** `src/components/reviews/ReviewCard.jsx`, `src/components/reviews/ReviewList.jsx`, `src/components/reviews/ReviewForm.jsx`. `src/services/reviews.service.js` updated (createReview, getBookingReviews added). `src/hooks/useReviews.js` updated (useBookingReviews, useCreateReview added). `src/pages/profile/PublicProfilePage.jsx` updated (inline ReviewCard removed; ReviewList wired). `src/pages/profile/MyProfilePage.jsx` updated (useMyReviews added; Reviews tab wired to ReviewList with showRoleBadge + allowDelete). `src/pages/bookings/BookingDetailPage.jsx` updated (reviews section fully wired with ReviewCard, ReviewForm, useBookingReviews, useDeleteReview).

**FE-10 implemented files:** `src/services/payments.service.js` (implemented from empty stub — initiatePayment, verifyPayment). `src/hooks/usePayments.js` (new file — useInitiatePayment, useVerifyPayment). `src/pages/payments/PaymentHistoryPage.jsx` (implemented from empty stub — informational page; no backend GET /payments endpoint). `src/pages/bookings/BookingDetailPage.jsx` updated (payment stub replaced with full PaymentSection; loadRazorpayScript helper; handlePayNow function; paymentVerified state). `src/App.jsx` updated (PaymentHistoryPage import; /payments route replaces PlaceholderPage).

**FE-11 implemented files:** `src/services/admin.service.js` (new), `src/hooks/useAdmin.js` (new), `src/components/layout/AdminLayout.jsx` (replaced FE-1 stub), `src/pages/admin/AdminLoginPage.jsx` (replaced FE-1 stub), `src/pages/admin/AdminDashboardPage.jsx`, `src/pages/admin/AdminUsersPage.jsx`, `src/pages/admin/AdminUserDetailPage.jsx`, `src/pages/admin/AdminPostsPage.jsx`, `src/pages/admin/AdminBookingsPage.jsx` (informational), `src/pages/admin/AdminReportsPage.jsx` (Reports + Disputes tabs), `src/pages/admin/AdminPaymentsPage.jsx` (release/refund forms), `src/pages/admin/AdminReviewsPage.jsx` (informational). `src/App.jsx` updated (8 admin page imports; PlaceholderPage replaced for all admin routes). **Backend fix in same session:** `POST /api/v1/auth/admin/login` added to auth module (auth.validator.js, auth.service.js, auth.controller.js, auth.routes.js).

**FE-12 implemented files:** `src/components/common/ErrorBoundary.jsx` (React class error boundary with reload fallback UI), `src/components/location/LocationAutocomplete.jsx` (debounced geocoding with suggestion dropdown, wired via RHF Controller). `src/components/posts/NeedTransportForm.jsx`, `src/components/posts/VehicleAvailableForm.jsx`, `src/components/posts/ReturnJourneyForm.jsx` updated (Input+onBlur geocode replaced with Controller+LocationAutocomplete). `src/components/chat/ChatWindow.jsx` updated (scroll-to-top loads older message pages; `olderMessages` local state; scroll-position restoration). `src/App.jsx` updated (ErrorBoundary imported; wraps entire `<Routes>` tree in AppRoutes).

**Stubs still pending full implementation:** `src/components/location/MapPicker.jsx` (MapPicker deferred — leaflet/react-leaflet not installed).

**New directory created in FE-1:** `src/stores/` (not in original scaffold — added for Zustand stores per the plan in `docs/FRONTEND_MODULE_CONTEXT.md`).

---

## 1. Root

```
goodsgo-frontend/
├── index.html              ← Vite HTML entry; mounts #root
├── vite.config.js          ← Vite + React + Tailwind v4 plugin
├── package.json            ← See docs/FRONTEND_CONTEXT.md Section 2 for install status
├── eslint.config.js
├── public/
│   ├── GOODS_GO.png        ← App icon / favicon source
│   └── bgimg.png           ← Background image asset
└── src/
    ├── main.jsx            ← React root; mounts App; add QueryClientProvider + Toaster here
    ├── App.jsx             ← Route tree + provider wrappers
    ├── index.css           ← Tailwind v4 import + @theme design tokens
    └── App.css             ← (delete or leave empty — not used)
```

---

## 2. Assets

```
src/assets/
├── GOODSGO.png
└── images/
    ├── logo.svg            ← Light-mode brand logo
    ├── logo-dark.svg       ← Dark-mode brand logo
    ├── hero-illustration.svg   ← HomePage hero section
    ├── empty-feed.svg      ← EmptyState for marketplace feed
    └── truck-placeholder.png   ← Fallback image for posts without images
```

---

## 3. Components

### 3.1 Common (reusable, zero business logic, data via props only)

```
src/components/common/
├── Button.jsx          ← Primary/secondary/danger variants; loading state; size variants
├── Input.jsx           ← Text input with label, error, helper text; integrates with RHF
├── Select.jsx          ← Dropdown select; options array prop; integrates with RHF
├── Textarea.jsx        ← Multi-line input; same interface as Input
├── Modal.jsx           ← Portal-based modal; isOpen, onClose, title, children
├── Spinner.jsx         ← Loading spinner; size variants (sm/md/lg)
├── Avatar.jsx          ← User avatar; fallback to initials; size variants
├── Badge.jsx           ← Colour-coded label chip; variant prop (status, type, role)
├── Card.jsx            ← Generic card wrapper; padding/shadow variants
├── Pagination.jsx      ← Page number controls; currentPage, totalPages, onPageChange
├── EmptyState.jsx      ← Zero-results display; icon, title, message, optional CTA props
├── ErrorBoundary.jsx   ← React error boundary; wraps route-level pages
├── ConfirmDialog.jsx   ← Confirmation modal for destructive actions; title, message, onConfirm
└── StarRating.jsx      ← 1–5 star display or interactive rating; readOnly prop
```

### 3.2 Layout

```
src/components/layout/
├── MainLayout.jsx      ← Authenticated user shell: Navbar + Sidebar (mobile) + <Outlet />
├── AuthLayout.jsx      ← Centred card layout for login/register/forgot-password pages
├── AdminLayout.jsx     ← Admin shell: AdminSidebar + header + <Outlet />
├── Navbar.jsx          ← Top nav: logo, links, NotificationBell, Avatar dropdown
├── Sidebar.jsx         ← Mobile slide-out nav for authenticated user routes
└── Footer.jsx          ← Minimal footer for public pages
```

### 3.3 Guards

```
src/components/guards/
├── ProtectedRoute.jsx  ← Reads useAuthStore; redirects to /login if !isAuthenticated
└── AdminRoute.jsx      ← Reads useAdminStore; redirects to /admin/login if !isAdminAuthenticated
```

### 3.4 Posts

```
src/components/posts/
├── PostCard.jsx            ← Feed card: post type badge, origin→dest, price, date, owner avatar
├── PostList.jsx            ← Renders array of PostCard + Pagination
├── PostFilters.jsx         ← Filter sidebar/panel: type, vehicle, city, date, price, radius
├── PostTypeBadge.jsx       ← Colour badge: need_transport / vehicle_available / return_journey
├── PostImageGallery.jsx    ← Image carousel for post detail view
├── NeedTransportForm.jsx   ← Create/edit form for need_transport post type
├── VehicleAvailableForm.jsx ← Create/edit form for vehicle_available post type
└── ReturnJourneyForm.jsx   ← Create/edit form for return_journey post type
```

The three form components share layout via a parent wrapper in `CreatePostPage`/`EditPostPage` that switches between them based on `post_type`.

### 3.5 Bookings

```
src/components/bookings/
├── BookingCard.jsx           ← Summary card for BookingsPage list
├── BookingList.jsx           ← Renders array of BookingCard + Pagination
├── BookingStatusBadge.jsx    ← Colour badge for all 9 booking statuses
├── BookingRequestModal.jsx   ← Modal to send a booking request from PostDetailPage
└── BookingActionButtons.jsx  ← Context-sensitive action buttons for BookingDetailPage
                                 (accept, reject, withdraw, cancel, mark-in-progress, complete, dispute)
                                 — which buttons render depends on booking status + current user role
```

### 3.6 Chat

```
src/components/chat/
├── ConversationList.jsx  ← Sidebar list of conversations; last message preview; unread count
├── ChatWindow.jsx        ← Message history + ChatInputBar; joins/leaves conversation room
├── MessageBubble.jsx     ← Single message: text or image; sent/received alignment
├── TypingIndicator.jsx   ← "..." indicator shown when remote user is typing
└── ChatInputBar.jsx      ← Text input + image upload button; emits typing events; submit
```

### 3.7 Reviews

```
src/components/reviews/
├── ReviewCard.jsx    ← Single review: star rating, comment, reviewer info, date
├── ReviewList.jsx    ← Array of ReviewCard + Pagination
└── ReviewForm.jsx    ← Create review form (rating + comment + review_role); shown on BookingDetailPage
```

### 3.8 Notifications

```
src/components/notifications/
├── NotificationBell.jsx       ← Icon in Navbar with unread count badge; opens dropdown
├── NotificationDropdown.jsx   ← Popover list of recent notifications; "Mark all read" button
└── NotificationItem.jsx       ← Single notification row; click navigates to relevant page via data.bookingId etc.
```

### 3.9 Location

```
src/components/location/
├── LocationAutocomplete.jsx  ← City search input with Nominatim/config suggestions
└── MapPicker.jsx             ← Leaflet map with draggable pin for lat/lng selection
```

MapPicker requires `leaflet` and `react-leaflet` to be installed. Do not render it until those packages are added.

### 3.10 Profile

```
src/components/profile/
├── ProfileHeader.jsx      ← Avatar, name, rating, member since, verification badges
├── ProfileStats.jsx       ← Counts: posts, bookings, reviews, cancellations
└── VerificationBadges.jsx ← Email verified / phone verified / identity verified badges
```

---

## 4. Pages

### 4.1 Auth Pages
```
src/pages/auth/
├── LoginPage.jsx           ← Email + password form; links to /register, /forgot-password
├── RegisterPage.jsx        ← Full name, email, password, optional phone
├── ForgotPasswordPage.jsx  ← Email input; always shows success message
└── ResetPasswordPage.jsx   ← Password + confirm; reads ?token= from URL
```

### 4.2 Marketplace
```
src/pages/marketplace/
├── MarketplacePage.jsx  ← Feed: PostFilters + PostList; URL search params for filter state
└── PostDetailPage.jsx   ← Single post: gallery, details, BookingRequestModal trigger, report button
```

### 4.3 Posts
```
src/pages/posts/
├── CreatePostPage.jsx  ← post_type selector → renders matching form component
└── EditPostPage.jsx    ← Pre-fills form with existing post data; owner-only (backend enforces)
```

### 4.4 Bookings
```
src/pages/bookings/
├── BookingsPage.jsx      ← Tab: "As Requester" | "As Post Owner" — maps to ?role= query param
└── BookingDetailPage.jsx ← Full booking view: status timeline, BookingActionButtons, ReviewForm (if completed), PaymentSection
```

### 4.5 Chat
```
src/pages/chat/
└── ChatPage.jsx  ← Split view: ConversationList (left) + ChatWindow (right); URL :conversationId
```

### 4.6 Profile
```
src/pages/profile/
├── MyProfilePage.jsx     ← Own profile; links to Settings; shows own reviews + posts
├── PublicProfilePage.jsx ← Other user's public profile; reviews and posts visible
└── SettingsPage.jsx      ← Edit profile form, password change, avatar upload/remove, deactivate
```

### 4.7 Other Authenticated Pages
```
src/pages/saved/
└── SavedPostsPage.jsx          ← Saved posts list; PostList with unsave button

src/pages/notifications/
└── NotificationsPage.jsx       ← Full notification history; mark read controls

src/pages/payments/
└── PaymentHistoryPage.jsx      ← Initiate payment (Razorpay flow) + payment history list
```

### 4.8 Admin Pages
```
src/pages/admin/
├── AdminLoginPage.jsx        ← Separate login form; calls admin auth endpoint
├── AdminDashboardPage.jsx    ← Overview stats (user count, active posts, pending reports)
├── AdminUsersPage.jsx        ← User list with search + status filters; suspend/reactivate actions
├── AdminUserDetailPage.jsx   ← Single user detail with post/booking counts; suspend action
├── AdminPostsPage.jsx        ← Post list with status/reported filters; hide/restore actions
├── AdminBookingsPage.jsx     ← Booking overview (read-only for moderators)
├── AdminReviewsPage.jsx      ← Review moderation (read-only for moderators)
├── AdminReportsPage.jsx      ← Report queue; resolve/dismiss actions
└── AdminPaymentsPage.jsx     ← Payment release and refund actions
```

Note: `AdminDisputesPage` is not in the scaffold — disputes are resolved from `AdminReportsPage` via the admin API. Add it if needed.

### 4.9 Root Pages
```
src/pages/
├── HomePage.jsx        ← Marketing landing; links to /marketplace and /register
├── NotFoundPage.jsx    ← 404 display
└── UnauthorizedPage.jsx ← Shown when user lacks permission for a resource
```

---

## 5. Services

All API calls go through service files. Components and hooks never call Axios directly.

```
src/services/
├── api.js                  ← Axios instances: `api` (user) and `adminApi` (admin); interceptors
├── auth.service.js         ← login, register, logout, forgotPassword, resetPassword, refreshToken
├── users.service.js        ← getMe, updateProfile, changePassword, uploadAvatar, removeAvatar, getPublicProfile, deactivateAccount
├── posts.service.js        ← getFeed, getPostById, createPost, updatePost, deletePost, updatePostStatus, toggleSave, reportPost, getMyPosts, getSavedPosts, getPostBookings
├── bookings.service.js     ← createBooking, getBookings, getBookingById, accept, reject, withdraw, cancel, markInProgress, complete, dispute, getHistory
├── chat.service.js         ← getConversations, getConversationById, getMessages, sendMessage, sendImageMessage
├── reviews.service.js      ← createReview, getBookingReviews, getMyReviews, getUserReviews, deleteReview
├── payments.service.js     ← initiatePayment, verifyPayment
├── notifications.service.js ← listNotifications, markOneRead, markAllRead
├── location.service.js     ← geocodeAddress, reverseGeocode
└── users.service.js        ← (also handles conversations list: getMyConversations)
```

Admin API calls use `adminApi` from `api.js` and can go in a dedicated `src/services/admin.service.js` created when the admin block is built.

---

## 6. Hooks

Custom hooks wrap React Query calls and expose clean interfaces to pages/components.

```
src/hooks/
├── useAuth.js              ← Reads useAuthStore; provides { user, isAuthenticated, login, logout }
├── usePosts.js             ← useQuery/useMutation wrappers for posts service
├── useBookings.js          ← useQuery/useMutation wrappers for bookings service
├── useChat.js              ← useQuery/useMutation wrappers for chat service; socket event handlers
├── useNotifications.js     ← useQuery + socket listener for real-time notification updates
├── useLocation.js          ← Geocode/reverse-geocode queries; browser geolocation helper
├── useSocket.js            ← Manages socket.io-client connection lifecycle from useSocketStore
├── useDebounce.js          ← Debounce utility hook (for search inputs, typing events)
└── useInfiniteScroll.js    ← IntersectionObserver hook for infinite scroll (if needed for feed)
```

---

## 7. Context

```
src/context/
├── AuthContext.jsx          ← AuthProvider wrapping useAuthStore; provides auth state to tree
├── SocketContext.jsx        ← SocketProvider; holds socket.io connection; used by useSocket
└── NotificationContext.jsx  ← NotificationProvider; real-time count + list; drives NotificationBell
```

---

## 8. Constants

```
src/constants/
├── routes.js           ← ROUTES object: every path string keyed by name
├── postTypes.js        ← POST_TYPES display labels and colours (local UI mapping only)
├── vehicleTypes.js     ← Local fallback display labels (backend is the source of truth)
├── goodsCategories.js  ← Local fallback display labels (backend is the source of truth)
└── bookingStatuses.js  ← BOOKING_STATUS display labels, badge colours, and action eligibility map
```

---

## 9. Utils

```
src/utils/
├── formatters.js        ← Date formatting (date-fns), currency (₹ INR), distance, file size
├── errorParser.js       ← Parses standard error shape from Axios interceptor into display strings
├── generateInitials.js  ← Extracts initials from a name string for Avatar fallback
├── storage.js           ← (stub — deliberately empty; no tokens in localStorage)
└── validators.js        ← Yup validators shared across multiple forms (e.g., phone, email, password)
```

`storage.js` exists in the scaffold but must not be used for auth tokens. If it is used, restrict it to non-sensitive UI preferences (e.g., last-used filter state).

---

## 10. Layout Hierarchy

```
App (providers: QueryClientProvider, AuthProvider, Toaster)
│
├── AuthLayout          → Login, Register, ForgotPassword, ResetPassword
│
├── MainLayout          → All authenticated user pages
│   ├── Navbar
│   ├── Sidebar (mobile)
│   └── <page content>
│
└── AdminLayout         → All admin pages (separate from MainLayout)
    ├── AdminSidebar
    ├── AdminTopbar
    └── <admin page content>
```

---

## 11. Module Build Sequence (Recommended)

| Block | Scope |
|---|---|
| FE-1 | Foundation (Axios, React Query, Zustand) + Auth pages |
| FE-2 | Layout shell (Navbar, Sidebar, MainLayout) + HomePage |
| FE-3 | Config fetch + Marketplace feed + Post detail |
| FE-4 | Create/Edit post (all 3 post types) |
| FE-5 | Bookings — list + detail + state actions |
| FE-6 | Chat — conversation list + real-time window |
| FE-7 | Notifications — bell + dropdown + page |
| FE-8 | Profile — own profile + settings + public profile |
| FE-9 | Reviews — on booking detail + public profile |
| FE-10 | Payments — Razorpay initiate + verify flow |
| FE-11 | Admin panel — login + all admin pages |
| FE-12 | Polish — empty states, error boundaries, responsive audit |

Update `docs/FRONTEND_MODULE_CONTEXT.md` to the next block at the end of each completed block.
