# GoodsGo — Project Deep Dive (Files & Modules)

> Phase 4 (file-by-file documentation) and Phase 5 (per-module documentation).
> For each important file: purpose, why it exists, what breaks if removed, who
> calls it / what it calls, the design pattern, and risks. Modules are then
> documented as complete vertical slices.

---

## Part A — File-by-file (backend)

### Entry & app

**`server.js`** — *process entry point / composition root.*
Loads env (before anything reads `process.env`), initializes Sentry (first, for
auto-instrumentation), **validates required env vars and exits if any is missing**,
creates the `http.Server` from the Express app, attaches Socket.IO, registers
socket handlers, starts cron, listens, verifies email config, and installs
**graceful shutdown** (SIGTERM/SIGINT → stop accepting connections → close sockets
→ drain the pool → exit, with a 30s force-exit timer) plus last-resort
`unhandledRejection`/`uncaughtException` guards.
*Calls:* `src/app`, `config/socket`, `config/database`, `socket.handler`,
`jobs/expirePosts`, `config/email`. *If removed:* nothing runs. *Pattern:*
composition root + graceful lifecycle. *Risk:* it's the single place lifecycle
correctness lives — keep it thin and ordered.

**`src/app.js`** — *the Express application (pure, no side effects).*
Builds the middleware chain **in a deliberate order** (helmet → cors →
compression → morgan → json/urlencoded (with the `/webhook` raw-body hook) →
sanitize → `/api` rate limit), mounts `/health` and every `/api/v1/*` router,
then the 404, the Sentry error handler, and the global error handler (last).
Exports `app` only so tests can drive it without a port. *If removed:* no HTTP
surface. *Pattern:* middleware pipeline. *Risk:* **order matters** — the file
warns against reordering (e.g. helmet must be first, error handler last, raw-body
hook before sanitize).

### `config/`
- **`database.js`** — the `pg.Pool` + `query`/`getClient`/`checkConnection`.
  Enforces the parameterized-query discipline; logs slow queries (dev). *If
  removed:* no DB. *Pattern:* singleton pool + thin wrapper. *Risk:* forgetting
  `client.release()` leaks a connection — the JSDoc mandates the `finally` pattern.
- **`socket.js`** — Socket.IO singleton (`initSocket`/`getIO`) + `emitToUser` /
  `emitToConversation` room helpers + `getConnectedUsersCount`. *If removed:* no
  real-time. *Pattern:* singleton + facade over rooms. *Risk:* `getIO` before
  `initSocket` throws (ordering in `server.js`).
- **`email.js`** — provider-fallback `sendMail` (Gmail API → Brevo → SMTP), SMTP
  transporter singleton, Gmail OAuth token cache, `verifyEmailConnection`. *If
  removed:* no email. *Pattern:* strategy/fallback. *Risk:* provider config drift;
  the `diagnose-email` route exists to debug it.
- **`cloudinary.js`** — configures + exports the Cloudinary v2 SDK once. *If
  removed:* no media. *Pattern:* configured singleton.

### `middleware/`
- **`auth.middleware.js`** — `authenticate` (verify user JWT → **live DB user
  lookup** rejecting suspended/deleted → `req.user`), `optionalAuth` (best-effort),
  `requireEmailVerified`. *Why the DB hit:* closes the ≤15-min window where a
  suspended user's still-valid JWT would otherwise work. *If removed:* no auth.
  *Pattern:* guard middleware. *Risk:* the per-request DB lookup is a future cache
  target.
- **`adminAuth.middleware.js`** — `authenticateAdmin` (verify admin JWT, separate
  table + secret), `requireAdminRole(min)` (numeric hierarchy), `logAdminAction`
  (audit logger that wraps `res.json`, logs only 2xx mutations). *If removed:* no
  admin security/audit. *Pattern:* guard + decorator. *Risk:* `logAdminAction`
  only extracts `id/userId/postId/bookingId` params (reports/settings log
  `target_id=null` — acceptable, documented).
- **`rateLimiter.middleware.js`** — the eight limiters (§ SECURITY_GUIDE 5);
  per-user limiters key on `req.user.id`. *Risk:* in-memory state (per-instance).
- **`validate.middleware.js`** — the `validate(schema, prop)` factory,
  `validateAll`, and shared `commonSchemas` (UUID, pagination, coordinates). Joi
  with `stripUnknown` (mass-assignment safety) + `convert`. *If removed:* no input
  contracts. *Pattern:* middleware factory.
- **`upload.middleware.js`** — Multer memory-storage config, `wrapMulter` (turns
  MulterErrors into `ApiError` 400s), named handlers (`uploadAvatar`,
  `uploadPostImages`, `uploadSingleImage`, `uploadDocument(s)`), and `requireFile`.
  *Pattern:* adapter + guard. *Risk:* limits (5 MB, 5 files) live here + in
  constants.
- **`errorHandler.middleware.js`** — the single global error formatter: maps
  `ApiError`, JWT errors, **PostgreSQL error codes** (23505→409, 23503→422, …),
  Multer errors, JSON parse errors, payload-too-large, CORS; hides internals in
  production. *If removed:* raw stack traces leak / inconsistent errors. *Pattern:*
  centralized error handling. *Risk:* it's the last line — keep the mapping current.
- **`sanitize.middleware.js`** — recursive input cleaning (strip HTML/null bytes,
  block prototype pollution). Never throws (a sanitizer bug must not block all
  traffic). *Pattern:* global normalizer.

### `utils/`
- **`ApiError.js`** — the one error class + factory methods (`notFound`,
  `unauthorized`, `forbidden`, `badRequest`, `conflict`, `businessRule`,
  `rateLimitExceeded`, `tokenExpired`, `internal`). `isOperational` decides whether
  the handler leaks detail. *If removed:* error contract collapses.
- **`ApiResponse.js`** — the success envelope class. *If removed:* inconsistent
  responses; the frontend interceptor breaks.
- **`asyncHandler.js`** — wraps async handlers so rejections reach `next(err)`.
  *If removed:* async errors hang requests (Express 4 doesn't catch them).
- **`generateTokens.js`** — JWT sign/verify for the three token types +
  `hashToken` (SHA-256) + `getRefreshTokenExpiry`. *If removed:* no auth tokens.
- **`hashPassword.js`** — bcrypt cost-12 hash + constant-time compare. *If
  removed:* no password security.
- **`generateOTP.js`** — crypto-random hex tokens + expiry helper (email verify /
  reset). *If removed:* no verification tokens.
- **`uploadImage.js`** — magic-byte verification + Cloudinary upload per asset
  type + EXIF strip + `deleteImage` + `generateSignedUrl` (private KYC). *If
  removed:* no secure media pipeline.
- **`calculateDistance.js`** — Haversine (JS) + `buildHaversineSQL`
  (parameterized radius filter; column names must be hardcoded). *If removed:* no
  geo search.
- **`paginate.js`** — pagination helper. **`sendEmail.js`** — templated senders
  over `config/email`. **`constants.js`** — the frozen source of truth for every
  enum/limit/room/event. *If `constants.js` removed:* the entire app (magic
  strings referenced everywhere).
- **`emailTemplates/*.html`** — the six transactional email bodies.

### `db/`
- **`migrate.js`** — applies `migrations/*.sql` in filename order (idempotent).
- **`migrations/001…020.sql`** — the schema as code (DATABASE_GUIDE).
- **`seeds/*.js`** — idempotent reference-data + initial-admin seeding.

### `jobs/`
- **`expirePosts.job.js`** — `startJobs` (run-on-boot + hourly at `:05`),
  `expirePostsJob` (expire + 24h warning), `autoRejectBookingsJob` (auto-reject
  stale pending + history + notify). Lazy-loads notifications to tolerate boot
  order. *If removed:* stale posts/bookings never clean up. *Pattern:* scheduled
  task; idempotent. *Risk:* runs N× with N instances (fix: single worker / lock).

### `socket/`
- **`socket.handler.js`** — connection + `authenticate` lifecycle; registers
  chat/notification handlers only after auth. *Pattern:* event-driven auth gate.
- **`chat.socket.js`** — `join/leave_conversation`, `send_message` (re-verify
  participant + active status → insert → update preview → broadcast to `conv:<id>`),
  `typing_*` (relay to the *other* party), `messages_read` (mark + broadcast).
  Never throws from a handler. *Risk:* image messages are REST-only by design.
- **`notification.socket.js`** — `mark_read` (delegates to the same service the
  REST endpoint uses; swallows errors — REST is the fallback).

### `modules/*` (shape)
Each domain has `routes` (HTTP wiring), `validator` (Joi), `controller` (thin
HTTP⇄service adapter), `service` (logic + SQL). Controllers are intentionally
boring; **all interesting behavior lives in the service** — that's where to look
and where to test. `config` is a lighter module (routes + a cached service).

---

## Part B — File-by-file (frontend, by category)

The frontend has ~150 files; documenting each individually is low-value, so it's
grouped by role. Naming and structure are consistent, so knowing the category
tells you the file's job.

- **`main.jsx`** — bootstraps React; eagerly initializes the theme store before
  first render to prevent a flash of the wrong theme (FOUC). *If removed:* no app.
- **`App.jsx`** — the router with **route-level code splitting** (`React.lazy` +
  `Suspense` fallback `PageLoader`), plus idle prefetch of the marketplace/login
  chunks. *If removed:* no routing; also owns the perf win (initial JS ~454 kB
  gzip ~143 kB shell + per-page chunks).
- **`index.css`** — Tailwind + design tokens + dark-mode variant + custom
  animations + `.skeleton`. The token system (`bg-surface`, `text-text`,
  `border-border`) is what makes dark mode automatic.
- **`services/api.js`** — the shared Axios instance with the **request
  interceptor** (attach the in-memory access token) and **response interceptor**
  (unwrap the `{success,data,…}` envelope; on 401 `TOKEN_EXPIRED`, call
  `/auth/refresh-token` once and retry; `/auth/login` is excluded so a bad login
  doesn't loop the refresh). *If removed:* every call site would re-implement auth
  + envelope handling. *This is the single most important frontend file.*
- **`services/*.service.js`** — one file per backend module; each owns that
  domain's endpoints. *Pattern:* API client per domain.
- **`hooks/use*.js`** — TanStack Query wrappers (queries + mutations with cache
  invalidation) over the services. Components consume hooks, never Axios. *If
  removed:* components would hand-roll caching/loading/error.
- **`stores/*`** (Zustand) — `useAuthStore` (access token in memory + user),
  `useAdminStore` (admin token in sessionStorage — persists across reloads within
  a tab, avoiding the login bounce), `useThemeStore` (localStorage `gg-theme`),
  `useSocketStore` (the socket instance).
- **`context/*`** — `AuthContext`, `SocketContext` (the authenticated socket
  connection), `NotificationContext` (the live notification stream + unread count).
- **`components/common/*`** — the design system (Button, Card, Modal, Input,
  Select, Textarea, Badge, Avatar, Pagination, Spinner, EmptyState, ErrorState,
  ErrorBoundary, SkeletonLoader, PageLoader, PageHeader, StarRating,
  ConfirmDialog, GoodsGoLogo). API-stable, token-driven, dark-mode-ready.
- **`components/<feature>/*`** — composed feature UI (bookings, chat, posts,
  reviews, profile, notifications, location, layout, guards). E.g.
  `RazorpayCheckoutButton`, `BookingActionButtons`, `ChatWindow`,
  `NotificationBell`, `MapPicker`/`LocationAutocomplete`.
- **`components/guards/*`** — `ProtectedRoute` (user), `GuestRoute` (redirect
  logged-in), `AdminRoute` (admin) — mapping to the three backend auth surfaces.
- **`pages/*`** — one component per route (auth, marketplace, posts, bookings,
  chat, profile, admin, notifications, payments, saved, 404, unauthorized). Pages
  compose feature components + hooks; they hold minimal logic.
- **`constants/*`** — mirror the backend enums (routes, bookingStatuses,
  postTypes, vehicleTypes, goodsCategories) so the UI and API agree.
- **`utils/*`** — `cloudinaryUrl` (optimized image URLs), `formatters`,
  `validators`, `errorParser` (turn the API error envelope into UI text),
  `generateInitials`, `storage`.

---

## Part C — Module documentation (Phase 5)

For each backend module: workflow, internal architecture, endpoints, validation,
DB interaction, security, business logic, why-this-design, future improvements.

### Auth
*Workflow:* register → verify email → login (access token + refresh cookie) →
silent refresh → logout / password reset. *Architecture:* `auth.service`
concentrates all logic (cookie helpers, token rotation, reuse detection, anti-
enumeration). *Validation:* Joi (email, password complexity, tokens). *DB:*
`users`, `refresh_tokens`, `email_verifications`, `password_resets`. *Security:*
the crown jewels — see SECURITY_GUIDE §2. *Why:* stateless access + revocable,
rotating refresh gives scale + security. *Future:* MFA, account lockout, social
login.

### Users
*Workflow:* read/update own profile, avatar upload/remove, change password,
soft-delete, view public profiles + sub-resources. *Architecture:* `users.routes`
also mounts sub-resource controllers from posts/bookings/chat/reviews/
notifications (cross-module composition at the route layer). *DB:* `users` (+
joins). *Security:* public profile returns 404 for suspended/deleted (no
disclosure); password change + delete revoke sessions. *Future:* phone
verification flow, KYC submission endpoints.

### Posts
*Workflow:* create (multipart + images) → appear in the filtered feed → detail
(view count) → edit/delete/status/save/report → owner sees requests.
*Architecture:* `posts.service` builds the dynamic feed query (whitelisted sort,
parameterized filters, Haversine radius, trigram/tsvector search) with pagination.
*DB:* `posts` (13 indexes), `post_images`, `saved_posts`, `reported_posts`.
*Security:* owner checks; sort-column whitelist; email-verified to create.
*Why one table, three types:* single feed query, shared code, type-specific
nullable fields. *Future:* PostGIS, keyset pagination, saved-search alerts.

### Bookings
*Workflow & state machine:* DATABASE_GUIDE §5. *Architecture:* `bookings.service`
owns the 9-state machine; transitions are transactional; `accept` uses `SELECT …
FOR UPDATE`; every transition writes history + emits socket events + fires
notifications. *Role logic:* which party may act flips by post type. *DB:*
`bookings`, `booking_status_history`, `conversations`, `messages` (system),
`posts`, `users`, `disputes`. *Security:* party-only access; DB partial-unique
index blocks duplicate active bookings; illegal transitions → 422. *Future:*
richer negotiation (counter-offers), partial-capacity accounting for
`vehicle_available`.

### Chat
*Workflow:* one conversation auto-created per accepted booking; text via REST or
socket, images via REST+Cloudinary; typing + read receipts via socket;
locked/archived mirrors booking lifecycle. *Architecture:* REST
(`chat.service`/routes) + real-time (`chat.socket`) share the message model and
formatter. *DB:* `conversations` (denormalized preview), `messages`. *Security:*
participant re-verified from DB on every action; non-participant → 404. *Future:*
message pagination cursors, delivery receipts, attachments beyond images.

### Reviews
*Workflow:* after completion, each party may leave one role-scoped review; rating
aggregate recomputed; admin can hide. *DB:* `reviews`, `users` (aggregate).
*Security:* unique per booking/reviewer/role; delete within an edit window.
*Future:* review responses, weighted/most-recent aggregates.

### Payments
*Workflow & escrow:* SERVICES_AND_INFRASTRUCTURE §1. *Architecture:* lazy Razorpay
singleton; order/verify/webhook/release/refund; HMAC everywhere; fail-closed.
*DB:* `payments` (ledger, unique gateway id), `bookings`. *Security:* the highest-
stakes module — see SECURITY_GUIDE §8. *Future:* real payout rails (Razorpay
Route), reconciliation jobs, idempotency keys on initiate.

### Notifications
*Workflow:* services call `createNotification` → row inserted + `emitToUser` push;
email for critical events; list/read via REST or `mark_read` socket.
*Architecture:* central `notifications.service` used by bookings/payments/reviews/
cron (lazy-required to tolerate boot order). *DB:* `notifications` (JSONB deep-link
data, partial unread index). *Future:* web push / FCM, digest emails, preferences.

### Location
*Workflow:* geocode/reverse-geocode via Nominatim; nearby search via Haversine.
*Public, unauthenticated.* *Risk/Future:* Nominatim rate limits → cache + paid
geocoder / self-host; PostGIS for radius.

### Admin
*Workflow:* separate login → role-gated user/post/report/dispute/payment/settings
management, all audited. *Architecture:* `admin.service` delegates payment actions
to `payments.service`; `logAdminAction` records mutations. *Security:* separate
table + secret + role hierarchy + audit log — see SECURITY_GUIDE §2.7. *Future:*
finer permissions, document-access logging, admin activity dashboards.

### Config
*Workflow:* serve reference data (`/options`) from a 10-min cache; provide cached
platform settings (`config.service`, 60s TTL, invalidated on admin update) to
posts/bookings/payments. *Why:* runtime-tunable behavior (commission %, expiry,
deadlines) without redeploy; avoids re-reading settings on every request.

---

## Part D — Cross-cutting patterns (recognize these everywhere)

- **Layered architecture** — routes→controller→service→DB, strictly.
- **Singleton adapters** — DB pool, Socket.IO, Cloudinary, Razorpay, email
  transporter (lazy where env may be absent at load).
- **Factory functions** — `validate(schema)`, `requireAdminRole(role)`,
  `logAdminAction(type,target)`, `requireFile(field)`, the rate limiters.
- **Fail-closed security** — missing payment secrets → reject, not validate-empty.
- **Fire-and-forget side effects** — `setImmediate` for emails/notifications so
  they never block responses.
- **Lazy cross-module requires** — tolerate boot/generation order (notifications).
- **Idempotency** — migrations, seeds, webhooks, mark-read, auto-reject.
- **DB is the source of truth; sockets accelerate** — every live event is backed
  by a persisted row recoverable via REST.
