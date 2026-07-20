# GoodsGo — API Reference (Phase 8)

> Every REST endpoint and Socket.IO event: purpose, auth, authorization, input,
> output, errors, business logic, rate limits. Base path: **`/api/v1`**. A
> ready-to-import Postman collection lives at the repo root
> (`GoodsGo.postman_collection.json`).

---

## 1. Conventions

**Success envelope** (`ApiResponse`):
```json
{ "success": true, "statusCode": 200, "message": "…", "data": { … }, "meta": { … } }
```
**Error envelope** (`errorHandler`):
```json
{ "success": false, "message": "…", "code": "MACHINE_CODE", "errors": [ { "field": "…", "message": "…" } ] }
```
`errors[]` is present only for validation failures.

**Machine error codes** (`code`): `VALIDATION_ERROR`, `AUTHENTICATION_FAILED`,
`TOKEN_EXPIRED`, `TOKEN_INVALID`, `AUTHORIZATION_FAILED`, `NOT_FOUND`,
`CONFLICT`, `BUSINESS_RULE_VIOLATION`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`,
`SERVICE_UNAVAILABLE`, `PAYMENT_FAILED`, `UPLOAD_FAILED`, plus domain-specific
ones (`ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, `INVALID_STATUS_TRANSITION`,
`PAYMENT_DEADLINE_EXPIRED`, `PAYMENT_SIGNATURE_INVALID`, etc.).

**Auth surfaces (three):**
- **User:** `Authorization: Bearer <accessToken>` (JWT, `JWT_SECRET`, ~15 min).
  Obtained from login; refreshed silently via the refresh cookie.
- **Refresh:** httpOnly cookie `refresh_token` (JWT, `JWT_REFRESH_SECRET`, 7d),
  sent automatically to `/api/v1/auth/*` only (`path` + `sameSite`).
- **Admin:** `Authorization: Bearer <adminToken>` (JWT, `JWT_ADMIN_SECRET`, 8h,
  no refresh flow).

**Auth middleware semantics:**
- `authenticate` — requires a valid user token; loads the user from the DB and
  rejects suspended/deleted accounts (401/403).
- `optionalAuth` — attaches `req.user` if a valid token is present, else `null`;
  never fails the request (used for public reads that enrich when logged in).
- `requireEmailVerified` — 403 `EMAIL_NOT_VERIFIED` unless the user's email is
  verified (gates create-post, booking, review, payment).
- `authenticateAdmin` + `requireAdminRole(min)` — admin JWT + role hierarchy.

**Global rate limit:** 100 req/min/IP on all `/api/*`. Stricter per-endpoint
limits noted below. A 429 returns `RATE_LIMIT_EXCEEDED` + `retryAfterSeconds`.

**Common status codes:** 200 OK, 201 Created, 204 No Content, 400 validation,
401 auth, 403 forbidden/suspended/unverified, 404 not found (also used to avoid
existence disclosure), 409 conflict, 422 business-rule violation, 429 rate limit,
500 internal, 502 gateway error, 503 DB down.

---

## 2. Health

### `GET /health`
No auth. Load-balancer/uptime probe. Runs `SELECT 1`. Returns
`{ status: 'ok'|'degraded', timestamp, uptime, environment, version, services:{ database } }`.
**200** if DB reachable, **503** if not.

---

## 3. Auth — `/api/v1/auth`

| Method | Path | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| POST | `/register` | – | 10 / 15min / IP | Create account, send verification email |
| POST | `/login` | – | 10 / 15min / IP | Issue access token + refresh cookie |
| POST | `/logout` | cookie | – | Revoke refresh token, clear cookie |
| POST | `/refresh-token` | cookie | – | Rotate refresh token, new access token |
| POST | `/forgot-password` | – | 3 / hr / IP | Email reset link (always 200) |
| POST | `/reset-password` | – | – | Reset password via token, revoke all sessions |
| GET/POST | `/verify-email` | – | – | Verify email via token (query or body) |
| POST | `/resend-verification` | – | 3 / hr / IP | Resend verification (always 200) |
| POST | `/admin/login` | – | 10 / 15min / IP | Admin login (separate JWT) |
| GET | `/diagnose-email` | – | – | **Debug** email-provider status (remove in prod) |

**POST `/register`** — body `{ email, password, full_name, phone? }`. Password
must meet complexity rules (Joi). **201** `{ id, email, full_name }`. Verification
email sent async (`setImmediate`). **409 CONFLICT** if email exists (deliberate
UX tradeoff — the registrant needs to know to log in instead).

**POST `/login`** — body `{ email, password }`. Constant-time: bcrypt runs even
for unknown emails (dummy hash) to prevent enumeration via timing. Checks
deleted/suspended/unverified. **200** `{ accessToken, user }` + sets
`refresh_token` httpOnly cookie. **401** generic `Invalid email or password`;
**403** `ACCOUNT_SUSPENDED` / `EMAIL_NOT_VERIFIED`.

**POST `/refresh-token`** — no body; reads the cookie. Verifies JWT → looks up the
SHA-256 hash → **reuse detection** (a presented *revoked* token revokes all the
user's tokens and 401s — theft indicator) → rotates (revoke old, issue new) →
**200** `{ accessToken, user }` + new cookie. **401 TOKEN_EXPIRED / invalid**.

**POST `/forgot-password`** & **`/resend-verification`** — **always 200**
regardless of whether the email exists; all work is deferred to `setImmediate`
(anti-enumeration by timing). Rate-limited to curb SMTP abuse.

**POST `/reset-password`** — body `{ token, password }`. Single-use token,
1-hour expiry. On success (transaction): update password, consume token, **revoke
ALL refresh tokens** (forces re-login everywhere). **400** invalid/expired/used.

**GET/POST `/verify-email`** — token in query (link click) or body (SPA). Marks
`is_email_verified`, consumes token (transaction), emits `USER_UPDATED` over the
socket so the "verify email" banner disappears live, sends welcome email async.

**POST `/admin/login`** — body `{ email, password }`. Queries `admin_users`, signs
with `JWT_ADMIN_SECRET`. **200** `{ adminToken, admin:{ id, email, fullName,
adminRole } }`. No cookie/refresh — 8h token.

---

## 4. Users — `/api/v1/users`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/me` | user | Full own profile |
| PUT | `/me` | user | Update `full_name, bio, city, state, phone` (≥1 field) |
| PUT | `/me/password` | user | Change password (needs `current_password`); revokes other sessions |
| POST | `/me/avatar` | user | Upload/replace avatar (multipart `avatar`); 20/hr/IP |
| DELETE | `/me/avatar` | user | Remove avatar (DB + Cloudinary) |
| DELETE | `/me` | user | Soft-delete account, revoke sessions, deactivate posts |
| GET | `/me/posts` | user | Own posts (status/page/limit) |
| GET | `/me/saved-posts` | user | Saved posts |
| GET | `/me/bookings` | user | Own bookings (role/status/page/limit) |
| GET | `/me/conversations` | user | Own conversations |
| GET | `/me/reviews` | user | Reviews written by me |
| GET/PUT | `/me/notifications…` | user | (mounted notifications sub-router — § 10) |
| GET | `/:userId` | optional | Public profile (404 for suspended/deleted — no disclosure) |

Avatar upload flow: `uploadLimiter` → Multer memory → `requireFile('avatar')` →
service verifies magic bytes, strips EXIF, resizes 400×400 face-crop, uploads to
Cloudinary, stores url + public_id. Password change and account deletion both
revoke refresh tokens.

---

## 5. Posts — `/api/v1/posts`

| Method | Path | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| GET | `/` | optional | – | Marketplace feed (all filters + pagination) |
| POST | `/` | user + verified | 5/hr/user + 20/hr/IP | Create post (multipart, ≤5 images) |
| GET | `/search` | optional | – | Full-text search |
| GET | `/nearby` | optional | – | Geo-radius search (Haversine) |
| GET | `/:postId` | optional | – | Post detail (increments view_count) |
| PUT | `/:postId` | user + verified | 20/hr/IP | Update (owner only, optional new images) |
| DELETE | `/:postId` | user | – | Soft-delete (blocked if active booking) |
| PUT | `/:postId/status` | user | – | Toggle active/inactive (owner) |
| POST | `/:postId/save` | user | – | Save/unsave toggle (not own post) |
| POST | `/:postId/report` | user | – | Report (one per user per post) |
| GET | `/:postId/bookings` | user | – | Booking requests on own post (owner) |

**Feed filters** (`GET /`): `post_type, vehicle_type, goods_category,
origin_city, destination_city, date_from, date_to, min_price, max_price, lat,
lng, radius_km, q, sort_by, sort_order, page, limit`. `sort_by` is validated
against a **whitelist** (`ALLOWED_POST_SORT_COLUMNS`) — never interpolated raw.
`optionalAuth` enriches results with a "saved" flag when logged in.

**Route ordering note:** `/search` and `/nearby` are declared *before* `/:postId`
so Express doesn't treat `"search"` as a `postId`.

---

## 6. Bookings — `/api/v1/bookings`

| Method | Path | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| POST | `/` | user + verified | 10/hr/user | Create booking request |
| GET | `/` | user | – | List own bookings (`role=requester\|owner`, `status`, page) |
| GET | `/:bookingId` | user | – | Detail (party only) |
| PUT | `/:bookingId/accept` | user | – | Owner accepts (price, commission, conversation) |
| PUT | `/:bookingId/reject` | user | – | Owner rejects pending |
| PUT | `/:bookingId/withdraw` | user | – | Requester withdraws pending |
| PUT | `/:bookingId/cancel` | user | – | Either party cancels accepted/in-progress |
| PUT | `/:bookingId/mark-in-progress` | user | – | Transporter confirms pickup |
| PUT | `/:bookingId/complete` | user | – | Shipper confirms delivery |
| PUT | `/:bookingId/dispute` | user | – | Either party disputes in-progress/completed |
| GET | `/:bookingId/history` | user | – | Status audit trail (party only) |

**Authorization is role-and-type-aware.** Who may do what depends on the post
type (see § "role flip" in the handbook). E.g. `mark-in-progress` requires the
*transporter* — the requester for `need_transport`, the post owner otherwise;
`complete` requires the *shipper* — the reverse. Illegal transitions return **422
INVALID_STATUS_TRANSITION**; non-parties get **403**. `accept` is transactional
with `SELECT … FOR UPDATE` (see DATABASE_GUIDE § 5). Every transition writes a
`booking_status_history` row and emits `BOOKING_STATUS_CHANGED` to both parties.

---

## 7. Chat — `/api/v1/chat`

| Method | Path | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| GET | `/` | user | – | List conversations (page/limit) |
| GET | `/:conversationId` | user | – | Conversation detail (participant only) |
| GET | `/:conversationId/messages` | user | – | Message history (newest-first, page/limit) |
| POST | `/:conversationId/messages` | user | 60/min/user | Send text message (`content` ≤2000) |
| POST | `/:conversationId/messages/image` | user | 60/min/user + 20/hr/IP | Send image message (multipart `image`) |

Non-participants get **404** (no existence disclosure). Locked/archived
conversations reject new messages. Text messages can also be sent over Socket.IO
(`send_message`); images are REST-only (they go through Cloudinary). `/messages/
image` is declared before `/messages` (route-ordering rule).

---

## 8. Reviews — `/api/v1/reviews`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | user | Create review for a completed booking (`bookingId, rating 1-5, comment?, reviewRole`) |
| GET | `/bookings/:bookingId` | user | Both reviews (0–2) for a booking (parties only) |
| GET | `/users/:userId` | optional | Public visible reviews for a user (page/limit) |
| DELETE | `/:reviewId` | user | Delete own review within the edit window |

One review per reviewer per booking per role (DB unique). Writing/deleting
recomputes the reviewee's rating aggregate. `/bookings/:id` and `/users/:id` are
declared before `/:reviewId`.

---

## 9. Payments — `/api/v1/payments`

| Method | Path | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| POST | `/initiate` | user | 10/hr/user | Create Razorpay order for an accepted booking |
| POST | `/verify` | user | – | Verify HMAC signature, mark completed |
| POST | `/webhook` | **none** | – | Razorpay server-to-server events |

**`/initiate`** — only the *shipper* (payer, resolved by post type) may pay; the
booking must be `accepted` and within `payment_deadline`. Idempotent: reuses an
existing pending/processing order (so a closed-modal retry works); **409** if
already completed. Creates the `payments` row (`pending`) and returns
`{ orderId, amount(paise), currency, key, paymentRowId }`. **502
PAYMENT_GATEWAY_ERROR** if Razorpay fails.

**`/verify`** — body `{ bookingId, orderId, paymentId, signature }`. Recomputes
`HMAC-SHA256(orderId|paymentId, RAZORPAY_KEY_SECRET)` and compares with
`crypto.timingSafeEqual`. **Fails closed** if the secret is unset (502). On
match, marks `completed` (transaction), emits `PAYMENT_STATUS_CHANGED`, notifies.
Idempotent (returns the record if already completed). **400
PAYMENT_SIGNATURE_INVALID** on mismatch.

**`/webhook`** — **no auth** (Razorpay isn't a user); authenticity is the HMAC of
the **raw body** vs `RAZORPAY_WEBHOOK_SECRET` (raw bytes captured by the
`express.json` verify hook). Handles `payment.captured` (authoritative completion
even if the browser closed before `/verify`), `payment.failed`, `refund.processed`.
**Always returns 200** (any other code makes Razorpay retry); errors are logged,
never thrown. Fails closed if the secret is unset.

Payout `release` and `refund` are **not public endpoints** — they are exposed
only via admin routes (§ 11) and the cron auto-release.

---

## 10. Notifications — `/api/v1/users/me/notifications`

Mounted under the user profile. All require auth.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List notifications (page/limit); `meta.unreadCount` for the badge |
| PUT | `/read-all` | Mark all read (idempotent) |
| PUT | `/:id/read` | Mark one read (404 if not yours) |

`/read-all` is declared before `/:id/read`. Notifications can also be marked read
over Socket.IO (`mark_read`).

---

## 11. Admin — `/api/v1/admin`

All routes require an admin JWT (`authenticateAdmin`) and a minimum role
(`requireAdminRole`). Mutations are audit-logged (`logAdminAction`). Role levels:
**moderator (1) < admin (2) < super_admin (3)**; a higher role satisfies a lower
requirement.

| Method | Path | Min role | Purpose |
|---|---|---|---|
| GET | `/users` | admin | List users (filters) |
| GET | `/users/:userId` | admin | User detail |
| PUT | `/users/:userId/suspend` | admin | Suspend user |
| PUT | `/users/:userId/reactivate` | admin | Reactivate user |
| GET | `/posts` | moderator | List posts |
| PUT | `/posts/:postId/hide` | moderator | Hide post |
| PUT | `/posts/:postId/restore` | moderator | Restore post |
| GET | `/reports` | moderator | Report queue |
| PUT | `/reports/:reportId/resolve` | moderator | Resolve report |
| PUT | `/reports/:reportId/dismiss` | moderator | Dismiss report |
| GET | `/disputes` | admin | List disputes |
| GET | `/disputes/:disputeId` | admin | Dispute detail |
| PUT | `/disputes/:disputeId/resolve` | admin | Resolve dispute |
| POST | `/payments/:bookingId/release` | admin | Release escrow to transporter |
| POST | `/payments/:bookingId/refund` | admin | Refund (partial/full) via Razorpay |
| GET | `/settings` | super_admin | Read platform settings |
| PUT | `/settings/:key` | super_admin | Update a setting (invalidates 60s cache) |

Literal paths (`/users`, `/disputes`, `/settings`) precede their `/:id` siblings.

---

## 12. Location — `/api/v1/location`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/geocode?address=` | none | Forward geocode (OpenStreetMap Nominatim) |
| GET | `/reverse-geocode?lat=&lng=` | none | Reverse geocode |

Public utility endpoints backed by Nominatim. Respect Nominatim's usage policy
(rate limits, User-Agent) — a scale risk flagged in FAILURE_ANALYSIS.

---

## 13. Config — `/api/v1/config`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/options` | none | Active vehicle types + goods categories for form dropdowns |

Served from a 10-minute in-memory cache.

---

## 14. Socket.IO events

Connect, then emit `authenticate { token }`. All handlers ignore events until the
socket is authenticated.

**Client → server:** `authenticate`, `join_conversation`, `leave_conversation`,
`send_message` (`{conversationId, content}`), `typing_start`, `typing_stop`,
`mark_read` (`{notificationId}`), `messages_read` (`{conversationId}`).

**Server → client:** `authenticated`, `auth_error`, `new_message`, `user_typing`,
`user_stopped_typing`, `messages_read`, `notification`, `booking_status_changed`,
`post_status_changed`, `payment_status_changed`, `user_updated`.

Message send re-verifies participation + `active` status in the DB, inserts the
row, updates the conversation preview, and broadcasts to `conv:<id>`. Typing/read
are relayed to the *other* participant. Notifications/status changes are pushed to
`user:<id>` rooms by the services. Full semantics: SERVICES_AND_INFRASTRUCTURE §
Socket.IO.

---

## 15. Security posture per endpoint (summary)

- Every mutating endpoint is authenticated; ownership is re-checked in the
  service against the DB (never trusted from the client).
- Money endpoints verify HMAC signatures and fail closed without secrets.
- Auth/enumeration-sensitive endpoints return uniform responses + timing.
- Uploads are MIME + magic-byte verified and size/count-limited.
- All inputs are sanitized (HTML/null-byte strip, prototype-pollution block) and
  Joi-validated (unknown fields stripped → mass-assignment safe).

See [SECURITY_GUIDE.md](./SECURITY_GUIDE.md) for the full treatment.
