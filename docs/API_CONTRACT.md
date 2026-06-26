# GoodsGo — API Contract (Frontend Integration Guide)

> **Purpose:** Frontend-to-backend integration reference. Documents what the frontend must send and what it will receive for every backend endpoint.
> **Source of truth for backend behaviour:** `docs/PROJECT_CONTEXT.md` Section 11. This document describes the **integration contract** — not the backend implementation.
> **Base URL:** `import.meta.env.VITE_API_URL` + `/api/v1`
> **Response envelope (all endpoints):** `{ success, message, data?, meta?, errors?: [{field, message}], code? }`
> The Axios interceptor in `src/services/api.js` unwraps `data` and `meta` before they reach service functions.

---

## Convention

| Symbol | Meaning |
|---|---|
| `auth` | Bearer token required (`Authorization: Bearer <accessToken>`) |
| `adminAuth` | Admin Bearer token required (use `adminApi` Axios instance) |
| `cookie` | httpOnly refresh cookie — browser sends automatically with `withCredentials: true` |
| `multipart` | `Content-Type: multipart/form-data` |
| `—` | Not applicable |

---

## 1. Auth — `src/services/auth.service.js`

### POST /auth/register
| Field | Value |
|---|---|
| Auth | None |
| Body | `{ fullName, email, password, phone? }` |
| Success response | `{ message: "Registration successful. Please verify your email." }` (data is null) |
| Frontend pages | `RegisterPage` |
| Query key | None (mutation only) |
| Optimistic update | No |
| Error notes | `EMAIL_ALREADY_EXISTS` (409), field-level Yup mirrors backend Joi |

### POST /auth/login
| Field | Value |
|---|---|
| Auth | None |
| Body | `{ email, password }` |
| Success response | `{ accessToken, user: { id, email, fullName, profileImageUrl, isEmailVerified, rating } }` |
| Frontend pages | `LoginPage` |
| On success | Store `accessToken` + `user` in `useAuthStore`; connect socket |
| Optimistic update | No |
| Error notes | Generic "Invalid credentials" (401) — backend does not distinguish wrong email vs wrong password |

### POST /auth/logout
| Field | Value |
|---|---|
| Auth | `cookie` |
| Body | None |
| Success response | `{ message: "Logged out successfully" }` |
| On success | Clear `useAuthStore`; disconnect socket; redirect to `/login` |
| Error notes | Always 200 even if no cookie present — safe to call unconditionally |

### POST /auth/refresh-token
| Field | Value |
|---|---|
| Auth | `cookie` |
| Body | None |
| Success response | `{ accessToken, user }` |
| When called | App startup (silent); Axios 401 interceptor |
| Error notes | 401 means refresh token expired — clear auth state, redirect to `/login` |

### POST /auth/forgot-password
| Field | Value |
|---|---|
| Auth | None |
| Body | `{ email }` |
| Success response | Always 200 regardless of whether email exists (anti-enumeration) |
| Frontend pages | `ForgotPasswordPage` |
| Error notes | Show same success message whether email exists or not |

### POST /auth/reset-password
| Field | Value |
|---|---|
| Auth | None |
| Body | `{ token, password }` |
| Success response | `{ message: "Password reset successfully. Please log in." }` |
| Frontend pages | `ResetPasswordPage` |
| Token source | `?token=` URL query parameter |
| Error notes | `TOKEN_EXPIRED` / `TOKEN_INVALID` (400) — show specific message |

### GET /auth/verify-email?token=
| Field | Value |
|---|---|
| Auth | None |
| Params | `?token=` in query string |
| Success response | `{ message: "Email verified successfully." }` |
| Frontend pages | Handled by a `VerifyEmailPage` or auto-handled in `App.jsx` route |
| Notes | Backend also accepts POST with token in body — use GET (link from email) |

### POST /auth/resend-verification
| Field | Value |
|---|---|
| Auth | None |
| Body | `{ email }` |
| Success response | Always 200 (anti-enumeration) |
| Frontend pages | Banner on `MyProfilePage` if `!isEmailVerified` |

---

## 2. Users — `src/services/users.service.js`

### GET /users/me
| Field | Value |
|---|---|
| Auth | `auth` |
| Query key | `['me']` |
| Stale time | `30_000` |
| Response data | Full user object (all profile fields) |
| Frontend pages | `MyProfilePage`, `SettingsPage`, `Navbar` (partial) |

### PUT /users/me
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `{ fullName?, phone?, bio?, city?, state?, country? }` — min 1 field |
| On success | Invalidate `['me']` |
| Frontend pages | `SettingsPage` |
| Error notes | `PHONE_ALREADY_EXISTS` (409) |

### PUT /users/me/password
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `{ currentPassword, newPassword }` |
| On success | Logout (all sessions revoked by backend); redirect to `/login` |
| Frontend pages | `SettingsPage` |

### POST /users/me/avatar
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `multipart` — field name `avatar` (JPEG/PNG/WebP, max 5MB) |
| On success | Invalidate `['me']` |
| Frontend pages | `SettingsPage` |
| Error notes | File too large (413); wrong MIME type (400 `INVALID_FILE_TYPE`) |

### DELETE /users/me/avatar
| Field | Value |
|---|---|
| Auth | `auth` |
| On success | Invalidate `['me']` |
| Frontend pages | `SettingsPage` |

### DELETE /users/me
| Field | Value |
|---|---|
| Auth | `auth` |
| On success | Clear auth state; redirect to `/` |
| Frontend pages | `SettingsPage` — behind `<ConfirmDialog>` |
| Error notes | Show clear warning: account + active posts will be deactivated |

### GET /users/me/posts
| Field | Value |
|---|---|
| Auth | `auth` |
| Query | `?page=&limit=&status=` |
| Query key | `['my-posts', filters]` |
| Frontend pages | `MyProfilePage` |

### GET /users/me/saved-posts
| Field | Value |
|---|---|
| Auth | `auth` |
| Query key | `['saved-posts']` |
| Frontend pages | `SavedPostsPage` |

### GET /users/me/bookings
| Field | Value |
|---|---|
| Auth | `auth` |
| Query | `?role=requester\|owner&status=&page=&limit=` |
| Query key | `['bookings', { role, status }]` |
| Frontend pages | `BookingsPage` (tab-based on `role`) |

### GET /users/me/notifications
| Field | Value |
|---|---|
| Auth | `auth` |
| Query | `?page=&limit=` |
| Query key | `['notifications']` |
| Stale time | `0` — socket updates drive freshness |
| Meta | `{ unreadCount }` in response meta |
| Frontend pages | `NotificationsPage`, `NotificationDropdown` |

### PUT /users/me/notifications/read-all
| Field | Value |
|---|---|
| Auth | `auth` |
| On success | Invalidate `['notifications']` |
| Frontend pages | `NotificationDropdown` |

### PUT /users/me/notifications/:id/read
| Field | Value |
|---|---|
| Auth | `auth` |
| On success | Invalidate `['notifications']` |
| Frontend pages | `NotificationItem` (on click) |
| Error notes | 404 if notification belongs to another user (no existence disclosure) |

### GET /users/me/conversations
| Field | Value |
|---|---|
| Auth | `auth` |
| Query key | `['conversations']` |
| Frontend pages | `ChatPage` — conversation list sidebar |
| Notes | Same response as `GET /chat` — backend aliases this |

### GET /users/me/reviews
| Field | Value |
|---|---|
| Auth | `auth` |
| Query key | `['my-reviews']` |
| Frontend pages | `MyProfilePage` — reviews I have written |

### GET /users/:userId
| Field | Value |
|---|---|
| Auth | `optionalAuth` (via `api.js` which attaches token if present) |
| Query key | `['public-profile', userId]` |
| Frontend pages | `PublicProfilePage` |
| Error notes | 404 for suspended/deleted users (backend conceals suspension — show generic not-found) |

---

## 3. Config — `src/services/posts.service.js` (or a dedicated `config.service.js`)

### GET /config/options
| Field | Value |
|---|---|
| Auth | None |
| Query key | `['config']` |
| Stale time | `Infinity` |
| Response data | `{ vehicleTypes: [...], goodsCategories: [...] }` |
| Frontend pages | App startup; `PostFilters`, `NeedTransportForm`, `VehicleAvailableForm`, `ReturnJourneyForm` |
| Notes | Fetch once in `App.jsx` or a startup hook; pass via React Query throughout the app |

---

## 4. Location — `src/services/location.service.js`

### GET /location/geocode?address=
| Field | Value |
|---|---|
| Auth | None |
| Query | `?address=<city or address string>` |
| Query key | `['geocode', address]` |
| Response data | `{ lat, lng, displayName }` |
| Frontend pages | `LocationAutocomplete`, `PostFilters` |
| Notes | Debounce the input before calling — min 3 chars before firing |

### GET /location/reverse-geocode?lat=&lng=
| Field | Value |
|---|---|
| Auth | None |
| Query key | `['reverse-geocode', lat, lng]` |
| Response data | `{ displayName, city, state, country }` |
| Frontend pages | `MapPicker` (on pin drop) |

---

## 5. Posts — `src/services/posts.service.js`

### GET /posts (feed)
| Field | Value |
|---|---|
| Auth | `optionalAuth` |
| Query | `?post_type=&vehicle_type=&goods_category=&origin_city=&destination_city=&date_from=&date_to=&min_price=&max_price=&lat=&lng=&radius_km=&sort_by=&sort_order=&page=&limit=&q=` |
| Query key | `['posts', filters]` — `filters` is the full query param object |
| Stale time | `60_000` |
| Response meta | `{ total, page, limit, totalPages }` |
| Frontend pages | `MarketplacePage` |
| Notes | Sync filter state to URL search params; restore from URL on page load |

### GET /posts/search?q=
| Field | Value |
|---|---|
| Auth | `optionalAuth` |
| Query | `?q=<search string>` + all feed filters |
| Query key | `['posts', { q, ...otherFilters }]` |
| Notes | Same endpoint as feed with `q` param — `PostFilters` handles this inline |

### GET /posts/nearby
| Field | Value |
|---|---|
| Auth | `optionalAuth` |
| Query | `?lat=&lng=&radius_km=` |
| Notes | Pass lat/lng from browser geolocation or `MapPicker`; merged with feed filters |

### POST /posts
| Field | Value |
|---|---|
| Auth | `auth` + email verified |
| Body | `multipart` — fields match post type (see `docs/PROJECT_CONTEXT.md` Section 3.2); field `images` (max 5 files) |
| On success | Invalidate `['posts']` and `['my-posts']`; redirect to new post detail |
| Frontend pages | `CreatePostPage` |
| Error notes | `EMAIL_NOT_VERIFIED` (403) — show verification banner; `MAX_POSTS_REACHED` (429) |

### GET /posts/:postId
| Field | Value |
|---|---|
| Auth | `optionalAuth` |
| Query key | `['post', postId]` |
| Response data | Post object including `images`, `owner`, `isSaved` (if authenticated) |
| Frontend pages | `PostDetailPage` |

### PUT /posts/:postId
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `multipart` — updatable fields; `images` (max 5 files) |
| On success | Invalidate `['post', postId]` and `['my-posts']` |
| Frontend pages | `EditPostPage` |
| Error notes | `FORBIDDEN` (403) if not owner; `CANNOT_EDIT_BOOKED_POST` (409) |

### DELETE /posts/:postId
| Field | Value |
|---|---|
| Auth | `auth` |
| On success | Invalidate `['posts']`, `['my-posts']`; redirect to `/profile/me` |
| Frontend pages | `PostDetailPage` or `EditPostPage` — behind `<ConfirmDialog>` |
| Error notes | `CANNOT_DELETE_BOOKED_POST` (409) |

### PUT /posts/:postId/status
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `{ status: 'active' \| 'inactive' }` |
| On success | Invalidate `['post', postId]`, `['my-posts']` |
| Frontend pages | `PostDetailPage` (owner controls) |

### POST /posts/:postId/save
| Field | Value |
|---|---|
| Auth | `auth` |
| On success | Invalidate `['post', postId]`, `['saved-posts']`; toggle `isSaved` optimistically |
| Frontend pages | `PostCard`, `PostDetailPage` |
| Optimistic update | Yes — toggle `isSaved` immediately, revert on error |
| Error notes | `CANNOT_SAVE_OWN_POST` (409) |

### POST /posts/:postId/report
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `{ reason, description? }` |
| Frontend pages | `PostDetailPage` — behind a report modal |
| Error notes | `ALREADY_REPORTED` (409); `CANNOT_REPORT_OWN_POST` (409) |

### GET /posts/:postId/bookings
| Field | Value |
|---|---|
| Auth | `auth` (owner only, enforced backend) |
| Query key | `['post-bookings', postId]` |
| Frontend pages | `PostDetailPage` (post owner tab showing incoming requests) |

---

## 6. Bookings — `src/services/bookings.service.js`

### POST /bookings
| Field | Value |
|---|---|
| Auth | `auth` + email verified |
| Body | `{ postId, pickupAddress, destinationAddress, scheduledDate, goodsDescription, specialInstructions? }` |
| On success | Invalidate `['bookings']`; close `BookingRequestModal` |
| Frontend pages | `BookingRequestModal` (triggered from `PostDetailPage`) |
| Error notes | `CANNOT_BOOK_OWN_POST` (409); `ALREADY_HAS_ACTIVE_BOOKING` (409) |

### GET /bookings
| Field | Value |
|---|---|
| Auth | `auth` |
| Query | `?role=requester\|owner&status=&page=&limit=` |
| Query key | `['bookings', { role, status, page }]` |
| Frontend pages | `BookingsPage` |

### GET /bookings/:bookingId
| Field | Value |
|---|---|
| Auth | `auth` (parties only) |
| Query key | `['booking', bookingId]` |
| Frontend pages | `BookingDetailPage` |
| Error notes | 404 for non-parties |

### PUT /bookings/:bookingId/accept
| Field | Value |
|---|---|
| Auth | `auth` (post owner only) |
| Body | `{ agreedPrice }` |
| On success | Invalidate `['booking', bookingId]`, `['conversations']` |
| Frontend pages | `BookingActionButtons` |
| Error notes | `FORBIDDEN` (403); `INVALID_STATUS_TRANSITION` (409) |

### PUT /bookings/:bookingId/reject
| Field | Value |
|---|---|
| Auth | `auth` (post owner only) |
| Body | `{ reason? }` |
| On success | Invalidate `['booking', bookingId]` |
| Frontend pages | `BookingActionButtons` |

### PUT /bookings/:bookingId/withdraw
| Field | Value |
|---|---|
| Auth | `auth` (requester only, pending status only) |
| Body | None |
| On success | Invalidate `['booking', bookingId]` |
| Frontend pages | `BookingActionButtons` |

### PUT /bookings/:bookingId/cancel
| Field | Value |
|---|---|
| Auth | `auth` (either party) |
| Body | `{ reason }` (min 5 chars) |
| On success | Invalidate `['booking', bookingId]`, `['conversations']` |
| Frontend pages | `BookingActionButtons` — behind `<ConfirmDialog>` |
| Error notes | Show warning: cancellation counter is incremented |

### PUT /bookings/:bookingId/mark-in-progress
| Field | Value |
|---|---|
| Auth | `auth` (post owner only) |
| On success | Invalidate `['booking', bookingId]` |
| Frontend pages | `BookingActionButtons` |

### PUT /bookings/:bookingId/complete
| Field | Value |
|---|---|
| Auth | `auth` (post owner only) |
| On success | Invalidate `['booking', bookingId]`; show `ReviewForm` |
| Frontend pages | `BookingActionButtons` — behind `<ConfirmDialog>` |

### PUT /bookings/:bookingId/dispute
| Field | Value |
|---|---|
| Auth | `auth` (either party, `in_progress` or `completed` only) |
| Body | `{ reason, description, evidenceUrls? }` |
| On success | Invalidate `['booking', bookingId]` |
| Frontend pages | `BookingActionButtons` |

### GET /bookings/:bookingId/history
| Field | Value |
|---|---|
| Auth | `auth` (parties only) |
| Query key | `['booking-history', bookingId]` |
| Frontend pages | `BookingDetailPage` (status timeline section) |

---

## 7. Chat — `src/services/chat.service.js`

### GET /chat
| Field | Value |
|---|---|
| Auth | `auth` |
| Query key | `['conversations']` |
| Response data | Array of conversation objects with `lastMessagePreview`, `participant` info |
| Frontend pages | `ChatPage` (sidebar) |

### GET /chat/:conversationId
| Field | Value |
|---|---|
| Auth | `auth` (participants only) |
| Query key | `['conversation', conversationId]` |
| Frontend pages | `ChatPage` (detail pane header) |

### GET /chat/:conversationId/messages
| Field | Value |
|---|---|
| Auth | `auth` |
| Query | `?page=&limit=` (newest-first pagination) |
| Query key | `['messages', conversationId]` |
| Stale time | `0` — socket is the real-time source |
| Frontend pages | `ChatWindow` |
| Notes | Load older pages on scroll-to-top; new messages arrive via `new_message` socket event |

### POST /chat/:conversationId/messages
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `{ content }` |
| On success | Optimistically append message to `['messages', conversationId]`; emit `new_message` to other participant via socket (backend also emits) |
| Frontend pages | `ChatInputBar` |
| Optimistic update | Yes — append immediately, revert on error |
| Error notes | `CONVERSATION_LOCKED` (409) — locked on cancel/reject; `CONVERSATION_ARCHIVED` (409) |

### POST /chat/:conversationId/messages/image
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `multipart` — field name `image` |
| On success | Invalidate `['messages', conversationId]` |
| Frontend pages | `ChatInputBar` (image attach button) |

---

## 8. Reviews — `src/services/reviews.service.js`

### POST /reviews
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `{ bookingId, rating, comment, reviewRole: 'as_customer' \| 'as_transporter' }` |
| On success | Invalidate `['booking-reviews', bookingId]`, `['public-profile', revieweeId]` |
| Frontend pages | `ReviewForm` (on `BookingDetailPage` after booking is `completed`) |
| Error notes | `BOOKING_NOT_COMPLETED` (409); `REVIEW_ALREADY_EXISTS` (409); `CANNOT_REVIEW_OWN_BOOKING` (409) |

### GET /reviews/bookings/:bookingId
| Field | Value |
|---|---|
| Auth | `auth` (parties only) |
| Query key | `['booking-reviews', bookingId]` |
| Frontend pages | `BookingDetailPage` |

### GET /reviews/users/:userId
| Field | Value |
|---|---|
| Auth | `optionalAuth` |
| Query | `?page=&limit=` |
| Query key | `['user-reviews', userId]` |
| Frontend pages | `PublicProfilePage` |

### DELETE /reviews/:reviewId
| Field | Value |
|---|---|
| Auth | `auth` (reviewer only, within edit window) |
| On success | Invalidate `['my-reviews']`, `['booking-reviews', bookingId]` |
| Frontend pages | `ReviewCard` (own review only, within window) |
| Error notes | `REVIEW_EDIT_WINDOW_EXPIRED` (409) |

---

## 9. Payments — `src/services/payments.service.js`

### POST /payments/initiate
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `{ bookingId }` |
| Response data | `{ orderId, amount, currency, key, paymentRowId }` |
| Frontend pages | `PaymentHistoryPage`, `BookingDetailPage` (payment section) |
| Notes | Use `key` (Razorpay public key) to open the Razorpay checkout modal client-side |

### POST /payments/verify
| Field | Value |
|---|---|
| Auth | `auth` |
| Body | `{ bookingId, orderId, paymentId, signature }` |
| On success | Invalidate `['booking', bookingId]`; show success toast |
| Notes | Called in the `handler` callback of Razorpay's checkout modal after payment |
| Error notes | `PAYMENT_VERIFICATION_FAILED` (400) — signature mismatch |

> `POST /payments/webhook` is a server-to-server endpoint called by Razorpay. The frontend never calls it directly.

---

## 10. Health Check

### GET /health
| Field | Value |
|---|---|
| Auth | None |
| Notes | Frontend does not actively call this; it is for uptime monitors and load balancers |

---

## 11. Admin — `src/services/admin.service.js` (use `adminApi` Axios instance)

All admin endpoints require `adminAuth`. Create this service file when building the admin module.

| Method | Path | Min Role | Body / Query | Query Key | Frontend Page |
|---|---|---|---|---|---|
| GET | `/admin/users` | admin | `?status=&search=&page=&limit=` | `['admin-users', filters]` | `AdminUsersPage` |
| GET | `/admin/users/:userId` | admin | — | `['admin-user', userId]` | `AdminUserDetailPage` |
| PUT | `/admin/users/:userId/suspend` | admin | `{ reason }` | invalidate above | `AdminUserDetailPage` |
| PUT | `/admin/users/:userId/reactivate` | admin | — | invalidate above | `AdminUserDetailPage` |
| GET | `/admin/posts` | moderator | `?status=&reported=&page=&limit=` | `['admin-posts', filters]` | `AdminPostsPage` |
| PUT | `/admin/posts/:postId/hide` | moderator | — | invalidate above | `AdminPostsPage` |
| PUT | `/admin/posts/:postId/restore` | moderator | — | invalidate above | `AdminPostsPage` |
| GET | `/admin/reports` | moderator | `?status=&page=&limit=` | `['admin-reports', filters]` | `AdminReportsPage` |
| PUT | `/admin/reports/:reportId/resolve` | moderator | `{ adminNotes, action }` | invalidate above | `AdminReportsPage` |
| PUT | `/admin/reports/:reportId/dismiss` | moderator | `{ adminNotes }` | invalidate above | `AdminReportsPage` |
| GET | `/admin/disputes` | admin | `?status=&page=&limit=` | `['admin-disputes', filters]` | `AdminReportsPage` or dedicated page |
| GET | `/admin/disputes/:disputeId` | admin | — | `['admin-dispute', id]` | Dispute detail |
| PUT | `/admin/disputes/:disputeId/resolve` | admin | `{ status, adminNotes }` | invalidate above | Dispute detail |
| POST | `/admin/payments/:bookingId/release` | admin | — | invalidate `['booking', id]` | `AdminPaymentsPage` |
| POST | `/admin/payments/:bookingId/refund` | admin | `{ amount, reason }` | invalidate `['booking', id]` | `AdminPaymentsPage` |
| GET | `/admin/settings` | super_admin | — | `['admin-settings']` | Settings page |
| PUT | `/admin/settings/:key` | super_admin | `{ value }` | invalidate above | Settings page |

> Note: Admin login (`POST /api/v1/admin/auth/login`) is not documented in `docs/PROJECT_CONTEXT.md` as a separate admin auth endpoint. The admin auth system uses the same `/api/v1/auth/*` routes gated by `authenticateAdmin` middleware — verify with backend before implementing the admin login page.

---

## 12. WebSocket Events Reference

> Socket server is the backend's Socket.io server, same host as the REST API.

### Connection
```js
const socket = io(VITE_API_URL, { auth: { token: accessToken }, withCredentials: true })
```

### Server → Client events

| Event | Payload | Frontend action |
|---|---|---|
| `notification` | `{ id, type, title, body, data: { bookingId?, postId?, conversationId? } }` | Add to notification list; toast if urgent type |
| `new_message` | `{ conversationId, message: { id, content, messageType, imageUrl, senderId, createdAt } }` | Append to `['messages', conversationId]` cache |
| `typing_start` | `{ conversationId, userId }` | Show `TypingIndicator` |
| `typing_stop` | `{ conversationId, userId }` | Hide `TypingIndicator` |

### Client → Server events

| Event | Payload | When |
|---|---|---|
| `join_conversation` | `{ conversationId }` | `ChatWindow` mount |
| `leave_conversation` | `{ conversationId }` | `ChatWindow` unmount |
| `typing_start` | `{ conversationId }` | Keystroke in `ChatInputBar` (debounced 300ms) |
| `typing_stop` | `{ conversationId }` | Input blur or 2s silence |
| `messages_read` | `{ conversationId, messageIds }` | Scroll to bottom of `ChatWindow` |
| `mark_read` | `{ notificationId }` | Click on `NotificationItem` |
