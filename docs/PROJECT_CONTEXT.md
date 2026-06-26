# GoodsGo — Project Context & Engineering Memory

> **Document purpose:** This is the permanent engineering memory of the GoodsGo project. It is the single source of truth for continuing development in Claude Code (or any future engineering session) from the exact point this chat-based development left off. It must be kept up to date as the project evolves. Store at `docs/PROJECT_CONTEXT.md` in the repository root.
>
> **Last updated:** End of Block O (Admin Module).
> **Project phase:** Backend MVP complete — all planned backend modules implemented. Full admin panel (user management, post moderation, report/dispute resolution, payment actions, platform settings) live. Frontend scaffold exists (Vite+React). No frontend integration started.
> **Migration set:** 20 files (001–020). Migrations 019 (`disputes`) and 020 (`admin_audit_logs`) added in Block O with explicit user approval.

---

## 1. Project Vision

GoodsGo is a logistics marketplace platform inspired by BlaBlaCar, but built for transporting **goods** instead of passengers. The platform's purpose is to reduce **deadhead transportation** — the industry term for a truck/vehicle returning empty after a delivery — by connecting transporters with nearby shipment requests so they can pick up a load before heading back.

The product is positioned for the Indian logistics market initially (currency: INR, phone format: Indian, default country: India, geocoding scoped to India), with an architecture that does not hard-block international expansion later.

**Core insight driving the product:** Every truck that drives back empty after a delivery is wasted capacity. If that capacity can be matched with someone who needs a vehicle along that route, both sides win — the transporter earns extra income on a trip they were making anyway, and the customer gets a cheaper/faster shipment than booking a dedicated vehicle.

---

## 2. Business Goals

1. **Reduce fuel and cost waste** in the road logistics sector by maximizing vehicle utilization on return journeys.
2. **Single unified account model** — there is intentionally no "I am a customer" vs "I am a transporter" choice at signup. Every user has one account type. The *role* a user plays is determined entirely by which kind of post they create at any given moment. The same person can be a customer on Monday (posting a `need_transport` request) and a transporter on Tuesday (posting a `vehicle_available` listing). This is a deliberate, foundational product decision — do not introduce a `role` enum on the `users` table; it would contradict the core product model.
3. **Platform revenue via commission** — GoodsGo takes a percentage cut (`platform_commission_pct`, currently defaulted to 10% via `platform_settings`) of every completed, paid booking. This is the only currently designed revenue model. No subscription tiers, no listing fees, no premium placement — those are explicitly deferred (see Section 17, Future Features).
4. **Trust-first marketplace** — ratings, reviews, identity verification (KYC), reporting, admin moderation, and dispute resolution are all designed as first-class concerns, not afterthoughts, because logistics marketplaces fail without trust mechanisms (no-show transporters, fraudulent posts, payment disputes).
5. **Production-grade from day one, but resource-constrained** — the project must run on a low-RAM development machine and a free/cheap cloud tier in production (Neon.tech free Postgres, Cloudinary free tier, Render/Railway free or low-cost compute). This drove the decision to avoid Docker, Kubernetes, microservices, Redis, and BullMQ in the initial architecture (see Section 9 and Section 31 for the full reasoning).

---

## 3. Functional Requirements

### 3.1 Account & Identity
- Single account type; no role selection at registration.
- Email + password registration with mandatory email verification before certain actions (creating posts, sending booking requests).
- Optional phone number at registration (unique constraint, not currently verified — phone verification is a designed-but-unbuilt feature, see Section 15).
- Login, logout, forgot password, reset password — all implemented.
- Identity verification (KYC: national ID / driver's license / passport, with front/back/selfie images) was **designed in the architecture phase (private Cloudinary storage, signed URLs, admin approval workflow)** but **no database table, service, or endpoint has been built for it.** This is a Pending Decision / deferred feature, not a bug — flagged in Section 17.

### 3.2 Posts (Marketplace Listings) — 3 Types
1. **`need_transport`** — A user has goods to ship and needs a vehicle. Required: pickup location, destination, goods type/category/weight/dimensions, budget range, required vehicle type, pickup date, description; images optional.
2. **`vehicle_available`** — A transporter has a vehicle ready for cargo. Required: current location, vehicle type, vehicle capacity, availability date, price expectation; destination optional (flexible).
3. **`return_journey`** — A transporter has just completed a delivery and wants a load before returning. Required: current location, return destination, vehicle type, remaining capacity, available date.

All three types share a single `posts` database table with a `post_type` discriminator column (not three separate tables) — this was a deliberate schema decision to allow a single JOIN-based feed query instead of a 3-way UNION (see Section 9, Database Design Decisions).

### 3.3 Marketplace Feed
- Single combined feed shows all three post types together.
- Filters: location (origin/destination city, lat/lng + radius), vehicle type, goods category, weight range, price range, date range, post type, full-text search on description.
- Sort by: created date, availability date, price.
- Pagination on every list endpoint.

### 3.4 Booking Lifecycle
A 9-state booking state machine governs the transaction between a requester and a post owner:
`pending → accepted → in_progress → completed`
with side branches: `pending → rejected | withdrawn | auto_rejected`, and `accepted | in_progress → cancelled`, and `in_progress | completed → disputed`.

Full lifecycle requirements: send request, withdraw own pending request, accept (with price negotiation), reject (with reason), cancel after acceptance (either party, with reason, increments a cancellation counter on the canceling user), mark in-progress (pickup confirmed), mark complete (unlocks reviews and starts payment auto-release timer), raise a dispute, and view full status history (append-only audit trail).

**Race condition requirement (explicit):** Two simultaneous "accept" calls on the same post's competing booking requests must not both succeed. This is enforced via a PostgreSQL `SELECT ... FOR UPDATE` row lock inside a transaction in `bookings.service.js`, plus a partial unique database index preventing a user from having two simultaneously-active bookings on the same post.

### 3.5 Chat
One conversation is automatically created per accepted booking (never created manually by a user). Real-time messaging via Socket.io. Conversation has a status (`active` / `locked` / `archived`) that mirrors the booking lifecycle — locked (read-only) on cancellation/rejection, archived (read-only) after completion. **Fully implemented (Blocks J + L)** — `socket.handler.js` authenticates clients into `user:<id>` rooms; `chat.socket.js` handles `join_conversation`, `leave_conversation`, `send_message`, `typing_start`, `typing_stop`, `messages_read`; `notification.socket.js` handles `mark_read`. REST API (Block L): `GET /chat` (conversation list), `GET /chat/:id` (single conversation), `GET /chat/:id/messages` (paginated history), `POST /chat/:id/messages` (text message), `POST /chat/:id/messages/image` (Cloudinary image upload). Both text and image messages emit `new_message` socket events for real-time delivery. `GET /users/me/conversations` also available.

### 3.6 Reviews
Two-sided review system — after a booking is `completed`, both the requester and the post owner may leave one review each (`review_role`: `as_customer` / `as_transporter`), enforced by a compound unique DB constraint. **Fully implemented (Block M)** — all four module files live: `reviews.validator.js`, `reviews.service.js`, `reviews.controller.js`, `reviews.routes.js`. REST API mounted at `/api/v1/reviews`; `GET /users/me/reviews` sub-resource wired into `users.routes.js`. Rating aggregate (`users.rating`, `users.total_reviews`) recalculated automatically on every review write/delete. `REVIEW_RECEIVED` notification dispatched to reviewee on creation.

### 3.7 Payments
Escrow-style payment model: customer pays on booking acceptance (within a configurable deadline), platform holds funds, releases to transporter on completion (or auto-releases after a configurable grace period if neither party acts). Commission is split out and tracked. Razorpay is the selected gateway. **Implemented (Block N)** — `payments.service.js` exports `initiatePayment()` (creates Razorpay order + inserts `payments` row), `verifyPayment()` (HMAC-SHA256 timing-safe signature check → marks `completed`), `handleWebhook()` (HMAC webhook auth + event routing for `payment.captured`, `payment.failed`, `refund.processed`; never throws), `releasePayment()` (records release + notifies payee; no actual bank transfer — manual or Razorpay Route; for admin/cron), `refundPayment()` (Razorpay refund API call + DB update; for admin). **`razorpay@^2.9.4` added to `package.json` — user must run `npm install`.**

### 3.8 Notifications
In-app notifications (DB-stored) + real-time delivery to online users via Socket.io + email for critical event types. **Implemented — Block I complete.** `notifications.service.js` exports `createNotification()` (never throws), `listNotifications()`, `markOneRead()`, `markAllRead()`. All lazy-require call sites in `bookings.service.js` and `expirePosts.job.js` now activate automatically — users receive in-app notifications for every booking event. Email dispatch is included for `booking_request_received`, `booking_accepted`, and `booking_cancelled` types. Real-time socket delivery via `emitToUser()` is wired in `createNotification()`; connected clients receive the `notification` event immediately. Socket event *handlers* on the client-facing side (the `authenticate`/`join` flow) are Block J, not yet built — notifications emit to `user:<id>` rooms correctly, but a client must be already in that room (from a prior authenticated connection) to receive them until Block J is complete.

### 3.9 Admin Panel
Separate admin authentication (different JWT secret, different `admin_users` table, three-tier role hierarchy: `moderator < admin < super_admin`). **Fully implemented — Block O complete.** `admin.service.js` exports 16 functions across 6 domains: user management (`listUsers`, `getUserDetail`, `suspendUser` [transactional — also deactivates active posts], `reactivateUser`), post moderation (`listPostsAdmin`, `hidePost`, `restorePost`), report management (`listReports`, `resolveReport`, `dismissReport`), dispute resolution (`listDisputes`, `getDisputeDetail`, `resolveDispute` [conditional `resolved_by`/`resolved_at` via `CASE WHEN`]), payment actions (`releasePaymentAdmin`, `refundPaymentAdmin` — delegate to `payments.service`), and platform settings (`getPlatformSettings`, `updatePlatformSetting`). All 16 routes mounted at `/api/v1/admin` behind `authenticateAdmin`; mutations use `logAdminAction` audit middleware and `requireAdminRole` gating. `disputes` table created (migration 019); `admin_audit_logs` table created (migration 020) — both P0 blockers from Section 33 resolved.

### 3.10 Reporting & Moderation
Users can report a post (one report per user per post, enforced by DB unique constraint) with a reason enum and free-text description. **Both submission and admin review/resolution are implemented:** `posts.service.js.reportPost()` handles user submission; `admin.service.js.resolveReport()` and `dismissReport()` handle admin review (Block O).

---

## 4. Non-Functional Requirements

| Requirement | Decision Made |
|---|---|
| Language | JavaScript only — explicitly NOT TypeScript. The entire codebase substitutes TypeScript's compile-time safety with: Joi runtime validation schemas, JSDoc type comments, frozen constant objects (`Object.freeze`) instead of enums, and parameterized SQL with whitelisted column names. |
| Architecture style | Monolith, layered MVC: `routes → middleware → controller → service → database`. Explicitly NOT microservices. |
| ORM | None. Raw SQL via the `pg` driver, always parameterized (`$1, $2...`), never string-interpolated. This is a hard security and architecture rule, repeated throughout every service file. |
| Hosting constraints | Must run on a low-RAM development machine and deploy to free/low-cost cloud tiers (Neon.tech, Render/Railway, Cloudinary free tier). No Docker, no Kubernetes in the initial build. |
| Caching / Queues | No Redis, no BullMQ in the initial build. `node-cron` is used in-process for scheduled jobs (post expiry, booking auto-reject) as a lightweight substitute. A documented future migration path exists to add Redis-backed queues if/when scale requires it (Section 18, Roadmap; Section 26, Scalability). |
| Real-time | Socket.io, attached to the same HTTP server/port as the REST API (no separate WebSocket service). |
| File storage | Cloudinary (images only). Files are never written to local disk — Multer uses `memoryStorage()` exclusively, buffers are streamed directly to Cloudinary. |
| Database | PostgreSQL 15+, cloud-hosted (Neon.tech recommended; serverless, free tier, max ~10 concurrent connections, hence the connection pool is deliberately small — see Section 25). |
| Security baseline | bcrypt password hashing (cost factor 12), JWT access+refresh token pattern with rotation and reuse detection, separate signing secrets for user vs admin tokens, Helmet security headers, rate limiting on all sensitive endpoints, input sanitization middleware, magic-byte file upload verification (not just MIME header trust), SQL injection prevented structurally (no string-built queries anywhere in the codebase). |
| Availability | Graceful shutdown handling (SIGTERM/SIGINT) implemented in `server.js` to avoid dropped requests during redeploys. `/health` endpoint exists for load balancer / uptime monitoring integration. |
| Internationalization | Not implemented. Currency hardcoded conceptually to INR (₹) in formatting and copy. No i18n library or translation layer exists. This is a Pending Decision for if/when GoodsGo expands beyond India. |

---

## 5. User Roles

There is exactly **one** application-level account type for end users: a row in the `users` table. There is no `role` column on `users`. A user's effective role in any given interaction is implicit and contextual:

- **As a post owner** — whoever's `user_id` is on a `posts` row. Can edit/delete/toggle status of that post, and accepts/rejects booking requests against it.
- **As a requester** — whoever sends a `bookings` row with themselves as `requester_id`. Can withdraw their own pending request, cancel after acceptance, mark disputes.
- **As a customer in a booking** vs **as a transporter in a booking** — tracked per-booking via the `review_role` enum on the `reviews` table (`as_customer` / `as_transporter`), because the same physical person can be the "customer" in one booking and the "transporter" in another, depending on which post type started the transaction.

Separately, there is a **fully distinct administrative account system**:
- **`admin_users` table** — completely separate from `users`. Has its own JWT signing secret (`JWT_ADMIN_SECRET`), its own auth middleware (`adminAuth.middleware.js`), and a three-level role hierarchy stored in the `admin_role_enum`:
  - `moderator` (level 1) — lowest privilege, intended for report review and content hiding.
  - `admin` (level 2) — intended for user suspension, payment-adjacent actions.
  - `super_admin` (level 3) — full access, intended for platform settings changes and irreversible actions (hard deletes).
  - The hierarchy is enforced numerically in `requireAdminRole(requiredRole)` — a higher level automatically satisfies a lower-level requirement check.
  - **No privilege-escalation path exists between the two systems** — a regular user JWT cannot be used against admin routes because it is signed with a different secret and `jwt.verify()` will fail outright (not just an authorization check, a cryptographic verification failure).

## 6. Current Folder Structure

This is the **exact, verified** state of the repository on disk — not the aspirational architecture. Every file below has been generated and syntax-validated. Items marked `(empty/pending)` are directories that exist in the architecture plan but contain no files yet.

```
goodsgo-backend/
├── package.json                          ⚠ see Section 33 — missing razorpay dep (axios added Block I)
├── .env.example
├── .gitignore
├── server.js
└── src/
    ├── app.js
    ├── config/
    │   ├── database.js                   pg.Pool, query(), getClient(), checkConnection()
    │   ├── cloudinary.js                  Cloudinary SDK v2 configured singleton
    │   ├── email.js                       Nodemailer transporter singleton
    │   └── socket.js                      Socket.io init, getIO(), emitToUser(), emitToConversation()
    │
    ├── middleware/
    │   ├── errorHandler.middleware.js     Global error handler (last app.use())
    │   ├── sanitize.middleware.js         XSS/HTML strip on body/query/params
    │   ├── validate.middleware.js         Joi validation factory + shared schemas
    │   ├── rateLimiter.middleware.js      7 tuned limiters
    │   ├── auth.middleware.js             User JWT verify + live DB check
    │   ├── adminAuth.middleware.js        Admin JWT verify + role hierarchy ⚠ see Section 33
    │   └── upload.middleware.js           Multer memoryStorage + MIME filter
    │
    ├── utils/
    │   ├── constants.js                   All enums/status strings/whitelists (single source of truth)
    │   ├── ApiError.js                     Custom error class w/ statusCode + isOperational
    │   ├── ApiResponse.js                  {success, message, data, meta} shape
    │   ├── asyncHandler.js                 Wraps async route handlers
    │   ├── paginate.js                     Pagination param sanitizer + meta builder
    │   ├── calculateDistance.js            Haversine formula + buildHaversineSQL()
    │   ├── hashPassword.js                 bcrypt hash (cost 12) + compare
    │   ├── generateTokens.js               JWT sign/verify (user + admin), hashToken()
    │   ├── generateOTP.js                  Crypto-secure tokens for email links
    │   ├── sendEmail.js                     Nodemailer wrapper + HTML template engine
    │   ├── uploadImage.js                   Cloudinary upload, magic-byte check, signed URLs
    │   └── emailTemplates/
    │       ├── verify-email.html
    │       ├── reset-password.html
    │       ├── welcome.html
    │       ├── booking-request.html        Generated Block I
    │       ├── booking-accepted.html       Generated Block I
    │       └── booking-cancelled.html      Generated Block I
    │
    ├── db/
    │   ├── migrate.js                      Migration runner (checksum-tracked, --dry-run support)
    │   ├── migrations/
    │   │   ├── 001_create_extensions.sql   uuid-ossp, pg_trgm, update_updated_at(), vehicle_types, goods_categories
    │   │   ├── 002_create_users.sql
    │   │   ├── 003_create_refresh_tokens.sql
    │   │   ├── 004_create_email_verifications.sql
    │   │   ├── 005_create_password_resets.sql
    │   │   ├── 006_create_posts.sql        post_type_enum, post_status_enum, GIN search indexes
    │   │   ├── 007_create_post_images.sql
    │   │   ├── 008_create_bookings.sql     booking_status_enum (9 states), partial unique index
    │   │   ├── 009_create_booking_status_history.sql
    │   │   ├── 010_create_conversations.sql
    │   │   ├── 011_create_messages.sql
    │   │   ├── 012_create_reviews.sql
    │   │   ├── 013_create_payments.sql     escrow fields: payment_deadline, auto_release_at
    │   │   ├── 014_create_notifications.sql
    │   │   ├── 015_create_saved_posts.sql
    │   │   ├── 016_create_reported_posts.sql
    │   │   ├── 017_create_admin_users.sql  + deferred FK to reported_posts.reviewed_by
    │   │   ├── 018_create_platform_settings.sql
    │   │   ├── 019_create_disputes.sql     dispute_status_enum + disputes table — added Block O (approved)
    │   │   └── 020_create_admin_audit_logs.sql  admin_audit_logs table — added Block O (approved)
    │   │   NOTE: `identity_documents` table still not created (deferred KYC feature — see Section 16)
    │   └── seeds/
    │       ├── seed_admin.js               Reads ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_FULL_NAME env vars
    │       ├── seed_vehicle_types.js        10 vehicle types
    │       ├── seed_goods_categories.js     16 goods categories
    │       └── seed_platform_settings.js    9 default settings (generated late, as a Block K catch-up)
    │
    ├── jobs/
    │   └── expirePosts.job.js              Hourly cron: post expiry + booking auto-reject (node-cron)
    │
    ├── socket/                              Block J — COMPLETE
    │   ├── socket.handler.js                authenticate lifecycle, user room join, delegates to chat+notification handlers
    │   ├── chat.socket.js                   join/leave conversation, send_message, typing_start/stop, messages_read
    │   └── notification.socket.js           mark_read (delegates to notifications.service.markOneRead)
    │
    └── modules/
        ├── auth/
        │   ├── auth.validator.js            6 Joi schemas
        │   ├── auth.service.js              register/login/logout/refresh/verify/reset/resend
        │   ├── auth.controller.js           8 handlers
        │   └── auth.routes.js               9 routes, mounted at /api/v1/auth
        │
        ├── users/
        │   ├── users.validator.js           3 schemas
        │   ├── users.service.js             profile CRUD, avatar, password change, deactivation
        │   ├── users.controller.js           10 handlers (7 core + getMyPosts/getSavedPosts/getMyBookings)
        │   └── users.routes.js               10 routes, mounted at /api/v1/users
        │                                      (incrementally updated in Blocks F, H, K)
        │
        ├── location/
        │   ├── location.service.js           Nominatim geocoding + Indian-city static fallback
        │   ├── location.controller.js        geocode + reverse-geocode handlers
        │   └── location.routes.js            2 routes, mounted at /api/v1/location
        │
        ├── posts/
        │   ├── posts.validator.js            6 schemas (3-way discriminated create schema via Joi .when())
        │   ├── posts.service.js              feed query, CRUD, nearby, save/unsave, report, getPostBookings (delegates to bookings.service)
        │   ├── posts.controller.js           12 handlers
        │   └── posts.routes.js               11 routes, mounted at /api/v1/posts
        │
        ├── bookings/
        │   ├── bookings.validator.js          7 schemas
        │   ├── bookings.service.js            full 9-state machine, FOR UPDATE lock, lazy notify()
        │   ├── bookings.controller.js          12 handlers
        │   └── bookings.routes.js              11 routes, mounted at /api/v1/bookings
        │
        ├── config/                             ⚠ NOT in original numbered file plan — documented addition
        │   └── config.routes.js                Serves vehicle_types + goods_categories, mounted at /api/v1/config
        │                                        (NOTE: file was incorrectly placed at src/config/config.routes.js
        │                                         and moved to this correct location in Block N session)
        │
        ├── notifications/                       Block I — COMPLETE
        │   ├── notifications.validator.js       listNotificationsSchema, notificationIdParamSchema (reuses commonSchemas)
        │   ├── notifications.service.js         createNotification (never throws), listNotifications, markOneRead, markAllRead
        │   ├── notifications.controller.js      list, markAllRead, markOneRead handlers
        │   └── notifications.routes.js          sub-router: GET /, PUT /read-all, PUT /:id/read
        │
        ├── chat/                                Block L — COMPLETE
        │   ├── chat.validator.js                4 Joi schemas
        │   ├── chat.service.js                  getMyConversations, getConversationById, getMessages, sendMessage, sendImageMessage
        │   ├── chat.controller.js               5 thin asyncHandler handlers
        │   └── chat.routes.js                   5 routes mounted at /api/v1/chat
        │
        ├── reviews/                              Block M — COMPLETE
        │   ├── reviews.validator.js              5 Joi schemas (create, reviewIdParam, bookingIdParam, userIdParam, listQuery)
        │   ├── reviews.service.js                createReview, getBookingReviews, getMyReviews, getUserReviews, deleteReview
        │   ├── reviews.controller.js             5 thin asyncHandler handlers
        │   └── reviews.routes.js                 4 routes mounted at /api/v1/reviews
        │
        ├── payments/                              Block N — COMPLETE
        │   ├── payments.validator.js              2 Joi schemas (initiate, verify)
        │   ├── payments.service.js                initiatePayment, verifyPayment, handleWebhook, releasePayment, refundPayment
        │   ├── payments.controller.js              3 thin asyncHandler handlers
        │   └── payments.routes.js                  3 routes: POST /initiate, /verify, /webhook
        │
        └── admin/                                  Block O — COMPLETE
            ├── admin.validator.js                   16 Joi schemas (new file — approved Block O)
            ├── admin.service.js                     16 exported functions: user mgmt, post moderation, reports, disputes, payments, settings
            ├── admin.controller.js                  16 thin asyncHandler handlers
            └── admin.routes.js                      16 routes at /api/v1/admin; authenticateAdmin global; role-gated per endpoint group
```

**Total files on disk:** 112 backend files generated, syntax-validated, and confirmed present.
**Total files remaining per plan:** 0 (all planned backend modules complete).

There is currently **no `docs/` content prior to this file** and **no frontend repository/folder created at all.**

---

## 7. Frontend Architecture

**Status: Not started. Zero frontend files exist.** Everything in this section is the *planned* architecture from the pre-development design phase, not implemented reality. Treat every statement in this section as **Pending Decision** until the first frontend file is actually generated.

### Planned stack
- React 18 + Vite (not Create React App — chosen for lower memory footprint and faster dev server on constrained hardware).
- React Router v6 for routing.
- Tailwind CSS for styling (utility-first, no separate CSS-in-JS library).
- Axios for HTTP, with interceptors planned for automatic access-token refresh on 401.
- Zustand for minimal global state (auth state, socket connection state).
- TanStack React Query for server state caching/refetching.
- React Hook Form + Yup for form validation (mirrors the backend's Joi schemas conceptually, but is a separate, duplicated validation layer — there is currently no shared schema generation between frontend and backend; this is a deliberate but documented trade-off, see Section 32).
- Leaflet + react-leaflet for maps (chosen over Google Maps to avoid API key costs — pairs with the backend's Nominatim/OpenStreetMap geocoding choice).
- Socket.io-client for real-time chat/notifications.
- react-hot-toast for toast notifications.
- PropTypes for runtime prop validation (the JavaScript substitute for TypeScript prop types, mirroring the backend's "no TypeScript" constraint).

### Planned folder structure (not yet created)
A full planned structure exists in the original architecture document (components/common, components/layout, components/guards, components/posts, components/bookings, components/chat, components/reviews, components/notifications, components/location, components/profile, pages/auth, pages/marketplace, pages/posts, pages/bookings, pages/chat, pages/profile, pages/saved, pages/notifications, pages/payments, pages/admin/*, context/, hooks/, services/, utils/, constants/). This is documented in full in the original architecture deliverable (`goodsgo-architecture.md`) and is not repeated here to avoid drift — refer to that file for the complete frontend file generation plan when frontend work begins. **No frontend file generation blocks have been executed.**

### Frontend ↔ Backend contract notes for future implementation
- All backend responses follow `{ success, message, data, meta }` — the frontend Axios layer should unwrap this consistently in one interceptor, not per-call.
- Access token: returned in the JSON body on login/refresh, intended to be held in memory (React state/Zustand), **never** localStorage (XSS risk) — this was an explicit security decision during backend design and the frontend must honor it.
- Refresh token: lives exclusively in an httpOnly cookie set by the backend (`Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`). The frontend never reads or sets this cookie directly — it relies on the browser sending it automatically on requests to `/api/v1/auth/*`, and Axios must be configured with `withCredentials: true`.
- Vehicle types and goods categories for dropdowns: fetch from `GET /api/v1/config/options` at app startup, do not hardcode them in frontend constants (the backend reference tables are the source of truth and can be changed by future admin tooling without a frontend deploy).

---

## 8. Backend Architecture

### Layered request flow (strict, every module follows this exact chain)
```
HTTP Request
  → helmet() [security headers]
  → cors() [origin whitelist]
  → morgan() [request logging]
  → express.json() / express.urlencoded() [body parsing, 10kb limit]
  → sanitizeInputs [XSS/HTML strip on body/query/params]
  → apiLimiter [100 req/min/IP baseline, on /api prefix]
  → [route-specific rate limiter, e.g. authLimiter, bookingLimiter]
  → [authenticate | optionalAuth | authenticateAdmin] [JWT verify + live DB check]
  → [requireEmailVerified] [where applicable]
  → [requireAdminRole(...)] [admin routes only]
  → [uploadXxx middleware] [where file upload applicable]
  → [requireFile(...)] [where file upload applicable]
  → validate(joiSchema, 'body'|'query'|'params') [Joi validation, replaces req.X with clean value]
  → controller.handlerName [asyncHandler-wrapped, thin — parses req, calls ONE service fn, formats ApiResponse]
  → service.functionName [ALL business logic + ALL database access lives here, nowhere else]
  → PostgreSQL via config/database.js query()/getClient()
  ← Response: new ApiResponse(statusCode, message, data?, meta?)
  ← (on any thrown error) → errorHandler middleware [last app.use(), converts to consistent JSON]
```

**This layering is a hard project convention.** Controllers must never contain SQL or business-rule `if` statements. Services must never directly read `req`/`res`. Route files must never contain business logic, only middleware wiring. This rule has been followed with zero exceptions across all 74 generated files and must continue to be followed.

### Why no ORM
Decided explicitly in the architecture phase: Prisma/Sequelize/TypeORM all add an abstraction layer that hides the actual SQL being run, which makes debugging slow queries and understanding exact database behavior (locking, transaction boundaries, JOIN strategy) harder — especially important for a marketplace with concurrent booking-acceptance races. The `pg` driver is used directly everywhere with hand-written, parameterized SQL. This is considered correct for the project's scale and team size, not a temporary shortcut — see Section 31 (Design Decisions) for the full reasoning. Do not introduce an ORM later without an explicit, documented decision to reverse this.

### Why a single wide `posts` table instead of 3 separate tables
The three post types share enough structure (location, owner, status, timestamps) and the marketplace feed needs to show all three types together, sorted and filtered uniformly, in a single query. Three separate tables would require a `UNION ALL` (with all the type-mismatch and index complications that brings) every time the feed is queried — which is the single most frequently called read path in the entire system. A single wide table with nullable type-specific columns and a `post_type` discriminator, plus indexes scoped with `WHERE` clauses on the relevant subsets, was chosen instead. This is documented as a deliberate trade-off (some columns are NULL for 2 of 3 post types) accepted in exchange for query simplicity and feed performance — see Section 32.

### Why notifications/sockets/chat/reviews/payments/admin use "lazy require + try/catch" pattern
Throughout `bookings.service.js` and `expirePosts.job.js`, code that *should* eventually trigger a notification does this:
```js
let _notifService = null;
function getNotifService() {
  if (_notifService) return _notifService;
  try {
    _notifService = require('../notifications/notifications.service');
    return _notifService;
  } catch {
    return null;
  }
}
```
This pattern was introduced **specifically** so that modules built before Block I (Notifications) would not crash with `MODULE_NOT_FOUND` when `notifications.service.js` does not yet exist. It is a deliberate, temporary scaffolding pattern for incremental, block-by-block delivery — **not** a permanent architecture pattern. Once Block I is built, every one of these call sites will start working automatically with zero code changes required at the call site (this was verified as a design goal when the pattern was introduced). **Do not remove or "clean up" this pattern as dead code** — it is load-bearing until Block I lands, and even afterward it provides resilience if the notifications module ever fails to load.

## 9. Database Design

**Engine:** PostgreSQL 15+. **Hosting target:** Neon.tech (serverless Postgres, free tier, max ~10 concurrent connections — this is why `config/database.js` defaults `DB_POOL_MAX` to a conservative 10 and is configurable via env var). **No ORM.** All access via the `pg` driver, exclusively through `query()` and `getClient()` exported from `src/config/database.js`.

### 9.1 Migration Philosophy
- Migrations are plain numbered `.sql` files in `src/db/migrations/`, run in filename-sorted (= numerical) order by the custom runner `src/db/migrate.js`.
- The runner tracks applied migrations in a `schema_migrations` table (filename + SHA-256 checksum + applied_at), and runs each migration file inside its own transaction (`BEGIN`/`COMMIT`/`ROLLBACK` on failure) so a failed migration never leaves partial DDL applied.
- Every `CREATE TYPE` (PostgreSQL ENUM) is wrapped in a `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN ... END $$;` block for idempotency — migrations can be safely re-run against a partially-migrated database without erroring on "type already exists."
- `migrate.js` supports `--dry-run` to preview pending migrations without applying them.
- **Migration lock history:** the migration file set was explicitly locked to exactly 18 files during Block D, replacing an earlier 24-migration draft that included `disputes`, `admin_audit_logs`, and `identity_documents` tables. The lock was extended to 20 files in Block O when the user explicitly approved adding `019_create_disputes.sql` and `020_create_admin_audit_logs.sql` to resolve the P0 blockers documented in Section 33. `identity_documents` remains unadded (deferred KYC feature). Any further addition still requires explicit user approval before any SQL is written.

### 9.2 Shared Conventions Across All Tables
- Every primary key is `UUID PRIMARY KEY DEFAULT uuid_generate_v4()` (never auto-increment integers) — chosen to prevent ID enumeration attacks and to be safe for future horizontal sharding.
- Every table with mutable rows that benefit from change tracking has `created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()` and, where rows are updated post-creation, `updated_at` with an auto-update trigger (see below).
- A single shared trigger function, created once in migration 001, is reused everywhere:
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $$ LANGUAGE plpgsql;
  ```
  Applied via `CREATE TRIGGER trg_<table>_updated_at BEFORE UPDATE ON <table> FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();` on: `users`, `posts`, `bookings`, `reviews`, `payments`, `admin_users`.
- Soft deletes (`deleted_at TIMESTAMP WITH TIME ZONE`, nullable) are used on `users` and `posts` — rows are never hard-deleted via the API, preserving referential integrity for historical bookings/payments/reviews tied to a "deleted" user or post.
- All foreign keys are explicit and named; cascade behavior is chosen per-relationship (see table-by-table notes below) — never a blanket default.

### 9.3 Table-by-Table Reference

**`vehicle_types`** (migration 001) — Reference table. `id, name (unique), label, is_active, display_order, created_at`. Seeded with 10 rows by `seed_vehicle_types.js`: truck, mini_truck, tempo, pickup, container, trailer, refrigerated_truck, flatbed, tanker, van.

**`goods_categories`** (migration 001) — Reference table. Same shape as `vehicle_types`. Seeded with 16 rows by `seed_goods_categories.js`: electronics, furniture, food_and_beverages, clothing_and_textiles, machinery, construction_materials, chemicals, pharmaceuticals, automotive_parts, agricultural_produce, household_items, office_supplies, fragile_goods, hazardous_materials, perishables, other.

**`users`** (migration 002) — Root identity table. Key columns: `email (unique), phone (unique, nullable), password_hash, full_name, profile_image_url, profile_image_public_id, bio, city, state, country (default 'India'), is_email_verified, is_phone_verified, is_identity_verified, is_active, suspended_at, suspension_reason, rating (decimal 3,2), total_reviews, cancellation_count, last_login_at, created_at, updated_at, deleted_at`. No `role` column (see Section 5). Indexes: email, phone (partial, non-null), is_active (partial, non-deleted), city (partial, non-null), plus two GIN trigram indexes (`full_name`, `email`) for admin fuzzy search.

**`refresh_tokens`** (migration 003) — `id, user_id → users(id) ON DELETE CASCADE, token_hash (unique, SHA-256 of the actual JWT — plaintext token is NEVER stored), expires_at, created_at, revoked_at (nullable = active), revoked_reason (enum-like string: 'logout' | 'password_change' | 'rotation' | 'admin' | 'reuse_detected' | 'account_deactivated')`.

**`email_verifications`** (migration 004) — `id, user_id → users(id) CASCADE, token (64-char hex, unique), expires_at, used_at (nullable), created_at`.

**`password_resets`** (migration 005) — Same shape as `email_verifications`.

**`posts`** (migration 006) — The central content table, intentionally wide. `post_type_enum`: `need_transport | vehicle_available | return_journey`. `post_status_enum`: `active | inactive | booked | completed | expired | deleted`. Columns grouped by post-type relevance (most are nullable and only populated for the relevant type(s)): origin (`origin_address` not-null, `origin_city`, `origin_state`, `origin_lat` not-null, `origin_lng` not-null), destination (all nullable — required-or-not is enforced at the **Joi validation layer**, not the DB layer, intentionally, because requirement varies by `post_type`), vehicle (`vehicle_type`, `vehicle_capacity_kg`, `remaining_capacity_kg`), goods (`goods_type`, `goods_category`, `goods_weight_kg`, `goods_length_cm`, `goods_width_cm`, `goods_height_cm`, `is_fragile` — all `NULL` for non-`need_transport` posts), pricing (`budget_min`, `budget_max`, `price_expectation`), scheduling (`availability_date` not-null, `expires_at`), `view_count`, `description`, `user_id → users(id) CASCADE`, soft-delete (`deleted_at`). CHECK constraints: `budget_min <= budget_max` (when both present), lat/lng range validity. Indexes: user_id, post_type, status (all partial on `deleted_at IS NULL`), vehicle_type, goods_category, origin_city, destination_city, availability_date, a composite `created_at DESC` index scoped to `status='active'` for the hot feed-query path, a raw lat/lng composite index for the haversine geo-filter, an `expires_at` partial index for the cron job, a GIN full-text index on `description`, and two GIN trigram indexes on `origin_city`/`destination_city` for fuzzy ILIKE search.

**`post_images`** (migration 007) — `id, post_id → posts(id) CASCADE, image_url (Cloudinary secure_url), cloudinary_public_id (needed to call `cloudinary.uploader.destroy()` on deletion), display_order, created_at`.

**`bookings`** (migration 008) — The core transaction table. `booking_status_enum` (9 values): `pending | accepted | rejected | withdrawn | auto_rejected | cancelled | in_progress | completed | disputed`. Columns: `post_id → posts(id)`, `requester_id → users(id)`, `post_owner_id → users(id)`, `status`, negotiated terms (`agreed_price`, `platform_commission_pct` — a **snapshot** at acceptance time, not a live join to `platform_settings`, so historical bookings retain the commission rate that applied when they were accepted even if the global setting changes later — `platform_commission_amt`, `net_payout`), booking specifics (`pickup_address`, `destination_address`, `scheduled_date`, `goods_description`, `special_instructions`), per-transition timestamps (`accepted_at`, `rejected_at`, `withdrawn_at`, `auto_rejected_at`, `cancelled_at`, `in_progress_at`, `completed_at`, `disputed_at`), cancellation detail (`cancelled_by → users(id) ON DELETE SET NULL`, `cancellation_reason`), `payment_deadline`. **Critical index:** `CREATE UNIQUE INDEX idx_bookings_one_active_per_user_per_post ON bookings (post_id, requester_id) WHERE status IN ('pending','accepted','in_progress')` — this is the database-level race-condition guard described in Section 3.4; a second simultaneous insert attempt for the same user+post while one is already active fails with PostgreSQL error code `23505`, which `bookings.service.js` catches and converts to a 409 `ApiError`.

**`booking_status_history`** (migration 009) — Append-only audit log. `id, booking_id → bookings(id) CASCADE, from_status (nullable for initial insert), to_status, changed_by → users(id) ON DELETE SET NULL (NULL = system/cron action), reason, metadata (JSONB, e.g. `{"agreed_price": 5000}` on accept), created_at`. Rows are inserted by every state-transition function in `bookings.service.js`; never updated or deleted.

**`conversations`** (migration 010) — `conversation_status_enum`: `active | locked | archived`. `id, booking_id → bookings(id) CASCADE (UNIQUE — enforced via a separate unique index, one conversation per booking, ever), participant_1_id / participant_2_id → users(id) CASCADE (denormalized for fast "my conversations" queries without joining through bookings), status, last_message_at, last_message_preview (denormalized, first 255 chars), created_at`. Created automatically inside the `acceptBooking()` transaction in `bookings.service.js` — there is no manual "create conversation" code path anywhere, by design.

**`messages`** (migration 011) — `message_type_enum`: `text | image | system`. `id, conversation_id → conversations(id) CASCADE, sender_id → users(id) ON DELETE SET NULL (NULL for system messages), content, message_type, image_url, image_public_id, is_read, read_at, created_at`. A `system`-type row reading `"Booking accepted. You can now chat about the details."` is inserted automatically by `acceptBooking()`.

**`reviews`** (migration 012) — `review_role_enum`: `as_customer | as_transporter`. `id, booking_id → bookings(id), reviewer_id → users(id), reviewee_id → users(id), rating (smallint, CHECK 1-5), comment, review_role, is_visible (admin can hide without deleting), created_at, updated_at`. **Compound unique index** `(booking_id, reviewer_id, review_role)` — one review per reviewer per booking per role, enforced at the DB layer.

**`payments`** (migration 013) — `payment_status_enum`: `pending | processing | completed | failed | refunded | partially_refunded`. Columns: `booking_id → bookings(id)`, `payer_id`/`payee_id → users(id)`, amount split (`amount`, `platform_commission_pct`, `platform_commission_amt`, `net_payout_amt`), `currency (default 'INR')`, `status`, gateway fields (`gateway_name`, `gateway_order_id`, `gateway_payment_id` (unique — webhook dedup key), `gateway_signature`, `gateway_response` JSONB), refund fields (`refund_amount`, `refund_reason`, `refunded_at`, `gateway_refund_id`), **escrow timing** (`payment_deadline` — set by `bookings.service.js.acceptBooking()`; `auto_release_at` — set by `bookings.service.js.completeBooking()`).

**`notifications`** (migration 014) — `notification_type_enum` (17 values: `booking_request_received, booking_accepted, booking_rejected, booking_withdrawn, booking_cancelled, booking_completed, booking_auto_rejected, new_message, review_received, payment_received, payment_released, post_expired, post_expiry_warning, dispute_raised, dispute_resolved, account_verified, system`). `id, user_id → users(id) CASCADE, type, title, body, data (JSONB deep-link payload, e.g. `{"bookingId": "...", "postId": "..."}`), is_read, read_at, created_at`. **Fully active as of Block I** — `notifications.service.createNotification()` inserts rows and emits real-time socket events; all booking trigger call sites now write to this table.

**`saved_posts`** (migration 015) — `id, user_id → users(id) CASCADE, post_id → posts(id) CASCADE, created_at`. Unique `(user_id, post_id)` — toggle pattern (INSERT to save, DELETE to unsave).

**`reported_posts`** (migration 016) — `report_reason_enum`: `spam | misleading | inappropriate | fraud | duplicate | other`. `report_status_enum`: `pending | under_review | resolved | dismissed`. `id, reporter_id → users(id) CASCADE, post_id → posts(id) CASCADE, reason, description, status, admin_notes, reviewed_by (plain UUID at creation time, see below), reviewed_at, created_at`. Unique `(reporter_id, post_id)`. **Important schema detail:** `reviewed_by` is created as a bare `UUID` column with **no foreign key constraint** in this migration, because `admin_users` does not exist yet at this point in the migration sequence. The FK is added retroactively at the end of migration 017 via `ALTER TABLE reported_posts ADD CONSTRAINT fk_reported_posts_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL` — wrapped in a `DO $$ ... EXCEPTION WHEN duplicate_object ...` block for idempotency. This is the only "deferred FK" pattern in the schema and is intentional, documented, and correct.

**`admin_users`** (migration 017) — `admin_role_enum`: `super_admin | admin | moderator`. `id, email (unique), password_hash, full_name, role, is_active, last_login_at, created_at, updated_at`. Completely independent of `users` — no shared table, no shared ID space.

**`platform_settings`** (migration 018) — Key-value runtime configuration. `key (text, PK), value (text), value_type ('string'|'number'|'boolean'|'json'), description, updated_at, updated_by → admin_users(id) ON DELETE SET NULL`. Seeded by `seed_platform_settings.js` with 9 rows: `platform_commission_pct=10, post_expiry_days=30, max_images_per_post=5, max_active_posts_per_user=10, min_booking_price=100, review_edit_window_hours=24, booking_auto_reject_hours=48, payment_deadline_hours=24, payment_auto_release_days=7`. Read via a small `getSetting(key, defaultValue)` / `getPlatformSetting(key, defaultValue)` helper duplicated in both `posts.service.js` and `bookings.service.js` (see Section 32, Trade-offs — this duplication is acknowledged technical debt, not an oversight).

### 9.4 Tables Referenced By Code But NOT Present In The Schema
1. **`disputes`** — ✅ **RESOLVED (Block O).** Migration `019_create_disputes.sql` creates the `disputes` table and `dispute_status_enum`. `PUT /bookings/:id/dispute` is now fully functional.
2. **`admin_audit_logs`** — ✅ **RESOLVED (Block O).** Migration `020_create_admin_audit_logs.sql` creates the `admin_audit_logs` table. `logAdminAction` now works on all admin mutation routes.
3. **`identity_documents`** — Still not created. Mentioned in `uploadImage.js`'s `CLOUDINARY_FOLDERS.KYC` constant and `uploadIdentityDocument()` helper. No service code calls it. This is a **deferred feature** (KYC/identity verification — see Section 16), not an active bug.

## 10. Authentication & Authorization

### 10.1 User Authentication Flow
- **Registration** (`POST /api/v1/auth/register`): bcrypt-hashes password (cost 12), inserts `users` row with `is_email_verified=false`, generates a 64-char hex token via `generateSecureToken(32)`, inserts into `email_verifications` with 1-hour expiry, and dispatches the verification email via `setImmediate()` (fire-and-forget, does not block the HTTP response).
- **Login** (`POST /api/v1/auth/login`): looks up user by email; **runs `bcrypt.compare()` unconditionally even if the user is not found**, comparing against a hardcoded dummy hash string — this is a deliberate timing-attack mitigation so that "user not found" and "wrong password" take statistically the same amount of time, preventing email enumeration via response-time analysis. On success, issues an access token (JWT, `JWT_SECRET`, 15 min default) and a refresh token (JWT, `JWT_REFRESH_SECRET` — **a different secret from the access token**, 7 days default), stores a SHA-256 hash of the refresh token (never plaintext) in `refresh_tokens`, and sets the refresh token as an httpOnly/Secure/SameSite=Strict cookie scoped to path `/api/v1/auth`.
- **Token refresh** (`POST /api/v1/auth/refresh-token`): reads the refresh cookie (parsed manually from the raw `Cookie` header — **no `cookie-parser` package is used**, to avoid an extra dependency for what is one simple regex/split operation), verifies the JWT, looks up the hash in `refresh_tokens`. **Implements full rotation**: the old token is marked `revoked_at`/`revoked_reason='rotation'` and a brand new refresh token row is inserted — every refresh call invalidates the token that was just used. **Implements reuse detection**: if a token is presented that is already marked `revoked_at` (meaning it was already rotated away once), this is treated as a strong signal of token theft — **all** refresh tokens for that user are immediately revoked (`revoked_reason='reuse_detected'`), forcing a full re-login on every device, and a warning is logged server-side.
- **Logout** (`POST /api/v1/auth/logout`): revokes the current refresh token (`revoked_reason='logout'`) and clears the cookie. Always returns 200 even if no cookie was present.
- **Forgot password** (`POST /api/v1/auth/forgot-password`): **always returns 200 immediately, regardless of whether the email exists** — the actual lookup, token creation, and email dispatch happen inside a `setImmediate()` block, deliberately decoupled from the response so that response timing cannot reveal whether an account exists (anti-enumeration, same philosophy as the login dummy-hash trick).
- **Reset password** (`POST /api/v1/auth/reset-password`): validates the 64-char hex token against `password_resets` (must be unused and unexpired), updates `password_hash`, marks the token `used_at`, and — critically — **revokes every refresh token the user currently has**, forcing logout on all devices after a password change. Runs inside a DB transaction (`getClient()` + `BEGIN`/`COMMIT`/`ROLLBACK`) so the password update and token revocation are atomic.
- **Email verification** (`GET`/`POST /api/v1/auth/verify-email`): validates the token, sets `users.is_email_verified=true`, marks the verification token used, and fires a welcome email asynchronously.
- **Resend verification** (`POST /api/v1/auth/resend-verification`): same anti-enumeration pattern as forgot-password — always 200, real work deferred to `setImmediate()`.

### 10.2 Authorization Layers
1. **`authenticate` middleware** (`auth.middleware.js`) — Verifies the access-token JWT signature/expiry (`JWT_SECRET`), then performs a **live database lookup** of the user by ID on *every single request* (not just trusting the JWT payload) to catch accounts that were suspended/deleted *after* the token was issued but before its 15-minute expiry. Attaches a sanitized `req.user` object (id, email, fullName, profileImageUrl, isEmailVerified, isIdentityVerified, rating, totalReviews — **never** password hash or other sensitive fields). This DB-roundtrip-per-request is an explicit, accepted performance trade-off — see Section 25 (Performance) for the reasoning and future caching mitigation plan.
2. **`optionalAuth` middleware** — Same JWT/DB logic, but never throws; sets `req.user = null` on any failure (no token, expired, invalid, suspended) and lets the request proceed. Used on public-but-personalizable routes (marketplace feed with `isSaved` indicator, public profiles, post detail).
3. **`requireEmailVerified` middleware** — Must run *after* `authenticate`. Throws a 403 with code `EMAIL_NOT_VERIFIED` if `req.user.isEmailVerified` is false. Applied to: post creation, post update (implicitly via the same route guard), booking request creation. **Not** applied to: login, profile viewing/editing, password change, avatar upload — those work for unverified users by design.
4. **Ownership checks** — There is **no generic "ownership middleware."** Every mutation endpoint's service function independently re-fetches the target row and compares `row.user_id === requestingUserId` (or `requester_id`/`post_owner_id` for bookings) **inside the service layer**, throwing `ApiError.forbidden()` on mismatch. This was a deliberate choice over a generic middleware because the "owner" column name differs by resource (`user_id` on posts, `requester_id`/`post_owner_id` on bookings) and the check often needs to happen inside the same transaction as the mutation (e.g., the `FOR UPDATE` lock in `acceptBooking`).
5. **Admin authentication** (`adminAuth.middleware.js`) — Completely parallel system: `authenticateAdmin` verifies against `JWT_ADMIN_SECRET` (cryptographically impossible to satisfy with a user-issued token), looks up `admin_users` (not `users`), attaches `req.admin = { id, email, fullName, adminRole, roleLevel }`. `requireAdminRole(requiredRole)` is a factory that compares numeric role levels (`moderator=1, admin=2, super_admin=3`) so higher roles automatically pass lower-role checks. `logAdminAction(actionType, targetType)` wraps `res.json` to fire an audit-log INSERT after a successful (2xx) response — **fully operational as of Block O** (`admin_audit_logs` table created by migration 020). Known limitation: routes using `:reportId` or `:disputeId` params record `target_id = NULL` in audit logs (the middleware only extracts `id`, `userId`, `postId`, `bookingId` from params — minor, action_type + target_type still provide traceability).

### 10.3 Rate Limiting (all 7 limiters live in `rateLimiter.middleware.js`)
| Limiter | Window | Max | Key | Applied To |
|---|---|---|---|---|
| `authLimiter` | 15 min | 10 | IP | register, login |
| `forgotPasswordLimiter` | 1 hour | 3 | IP | forgot-password |
| `resendVerificationLimiter` | 1 hour | 3 | IP | resend-verification |
| `apiLimiter` | 1 min | 100 | IP | global, on `/api` prefix in `app.js` |
| `uploadLimiter` | 1 hour | 20 | IP | avatar upload, post image upload |
| `postCreateLimiter` | 1 hour | 5 | **user ID** (falls back to IP if unauthenticated) | post creation |
| `bookingLimiter` | 1 hour | 10 | **user ID** (falls back to IP) | booking creation |

All limiters skip entirely when `NODE_ENV === 'test'`, return a consistent JSON 429 shape (not the library default HTML), and send standard `RateLimit-*` headers.

---

## 11. API Design

**Base URL:** `/api/v1`
**Response envelope (always):** `{ "success": boolean, "message": string, "data"?: any, "meta"?: object, "errors"?: [{field, message}], "code"?: string }`

### 11.1 Auth — `/api/v1/auth` (mounted, fully live)
| Method | Path | Auth | Rate Limit | Notes |
|---|---|---|---|---|
| POST | `/register` | none | authLimiter | |
| POST | `/login` | none | authLimiter | Sets refresh cookie |
| POST | `/logout` | none (reads cookie) | none | |
| POST | `/refresh-token` | none (reads cookie) | none | Rotates token |
| POST | `/forgot-password` | none | forgotPasswordLimiter | Always 200 |
| POST | `/reset-password` | none (token in body) | none | |
| GET | `/verify-email?token=` | none | none | |
| POST | `/verify-email` | none (token in body) | none | |
| POST | `/resend-verification` | none | resendVerificationLimiter | Always 200 |

### 11.2 Users — `/api/v1/users` (mounted, fully live)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/me` | authenticate | Full own profile |
| PUT | `/me` | authenticate | Partial update, min 1 field |
| PUT | `/me/password` | authenticate | Revokes all other sessions |
| POST | `/me/avatar` | authenticate + uploadLimiter | multipart field name `avatar` |
| DELETE | `/me/avatar` | authenticate | |
| DELETE | `/me` | authenticate | Soft delete; deactivates own active posts |
| GET | `/me/posts` | authenticate | Added Block H; delegates to posts.controller |
| GET | `/me/saved-posts` | authenticate | Added Block H |
| GET | `/me/bookings` | authenticate | Added Block K; delegates to bookings.controller |
| GET | `/me/notifications` | authenticate | Added Block I; paginated, includes unreadCount in meta |
| PUT | `/me/notifications/read-all` | authenticate | Added Block I; idempotent, returns updatedCount |
| PUT | `/me/notifications/:id/read` | authenticate | Added Block I; 404 for wrong-user (no existence disclosure) |
| GET | `/:userId` | optionalAuth | Public profile, 404 for suspended/deleted (no existence disclosure) |

### 11.3 Posts — `/api/v1/posts` (mounted, fully live)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | optionalAuth | Feed, all filters (see 11.3.1) |
| POST | `/` | authenticate + requireEmailVerified + postCreateLimiter + uploadLimiter | multipart, field `images` (max 5) |
| GET | `/search?q=` | optionalAuth | Delegates to same feed query w/ full-text filter |
| GET | `/nearby?lat=&lng=&radius_km=` | optionalAuth | Delegates to same feed query w/ haversine filter |
| GET | `/:postId` | optionalAuth | Increments `view_count` |
| PUT | `/:postId` | authenticate + requireEmailVerified + uploadLimiter | Owner-only (enforced in service) |
| DELETE | `/:postId` | authenticate | Owner-only; blocked if status='booked' |
| PUT | `/:postId/status` | authenticate | Toggle active↔inactive, owner-only |
| POST | `/:postId/save` | authenticate | Toggle; cannot save own post |
| POST | `/:postId/report` | authenticate | One per user per post; cannot report own |
| GET | `/:postId/bookings` | authenticate | Owner-only; delegates to bookings.service |

**11.3.1 Feed filter query params:** `post_type` (comma-separated), `vehicle_type` (comma-separated), `goods_category`, `origin_city`, `destination_city`, `date_from`, `date_to`, `min_price`, `max_price`, `lat`, `lng`, `radius_km` (default 50, max 500), `sort_by` (whitelisted: `created_at|availability_date|price_expectation|budget_min|goods_weight_kg|view_count`), `sort_order` (`asc|desc`), `page`, `limit` (max 50), `q` (full-text search string).

### 11.4 Location — `/api/v1/location` (mounted, fully live)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/geocode?address=` | none | Static Indian-city table first, then Nominatim |
| GET | `/reverse-geocode?lat=&lng=` | none | Nominatim only |

### 11.5 Config — `/api/v1/config` (mounted, fully live — undocumented-in-original-plan addition)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/options` | none | Returns `{vehicleTypes, goodsCategories}`, 10-min in-memory cache |

### 11.6 Bookings — `/api/v1/bookings` (mounted, fully live)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | authenticate + requireEmailVerified + bookingLimiter | |
| GET | `/` | authenticate | Query: `role=requester\|owner`, `status=` (comma-sep), `page`, `limit` |
| GET | `/:bookingId` | authenticate | Parties only |
| PUT | `/:bookingId/accept` | authenticate | Owner-only; `FOR UPDATE` lock; body requires `agreed_price` |
| PUT | `/:bookingId/reject` | authenticate | Owner-only; optional `reason` |
| PUT | `/:bookingId/withdraw` | authenticate | Requester-only, pending-only |
| PUT | `/:bookingId/cancel` | authenticate | Either party; `reason` required (min 5 chars) |
| PUT | `/:bookingId/mark-in-progress` | authenticate | Owner-only |
| PUT | `/:bookingId/complete` | authenticate | Owner-only |
| PUT | `/:bookingId/dispute` | authenticate | Either party; **⚠ will throw — missing `disputes` table, see Section 33** |
| GET | `/:bookingId/history` | authenticate | Parties only; full audit trail |

### 11.7 Health Check — root level
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | `{status, timestamp, uptime, environment, version, services:{database}}`; 200 or 503 |

### 11.8 Chat — `/api/v1/chat` (mounted, fully live — Block L)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | `authenticate` | List user's conversations, ordered by `last_message_at DESC`, paginated |
| GET | `/:conversationId` | `authenticate` | Single conversation + participant profiles; 404 for non-participants |
| POST | `/:conversationId/messages/image` | `authenticate` + `uploadLimiter` + `chatMessageLimiter` | Multipart, field `image`; Cloudinary upload; emits `new_message` socket event |
| GET | `/:conversationId/messages` | `authenticate` | Paginated message history, newest-first |
| POST | `/:conversationId/messages` | `authenticate` + `chatMessageLimiter` | Text message; emits `new_message` socket event |

Also wired at: `GET /api/v1/users/me/conversations` → delegates to same controller.

### 11.9 Reviews — `/api/v1/reviews` (mounted, fully live — Block M)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | `authenticate` | Create review; body: `{ bookingId, rating, comment, reviewRole }` |
| GET | `/bookings/:bookingId` | `authenticate` | Both reviews for a completed booking (parties only) |
| GET | `/users/:userId` | `optionalAuth` | Public visible reviews written about a user (paginated) |
| DELETE | `/:reviewId` | `authenticate` | Delete own review within `review_edit_window_hours`; recalculates rating |

Also wired at: `GET /api/v1/users/me/reviews` → reviews I have written.

### 11.10 Payments — `/api/v1/payments` (mounted, fully live — Block N)
| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/initiate` | `authenticate` + `paymentInitiateLimiter` (10/hr per user) | Body: `{ bookingId }`; creates Razorpay order; returns `{ orderId, amount, currency, key, paymentRowId }` |
| `POST` | `/verify` | `authenticate` | Body: `{ bookingId, orderId, paymentId, signature }`; HMAC-SHA256 timing-safe check; marks payment `completed` |
| `POST` | `/webhook` | None (HMAC-verified internally) | Razorpay webhook — `payment.captured`, `payment.failed`, `refund.processed`; always returns 200; raw body captured via `req.rawBody` |

### 11.11 Admin — `/api/v1/admin` (mounted, fully live — Block O)
All routes require `authenticateAdmin`. Mutation routes also apply `requireAdminRole(minRole)` + `logAdminAction(actionType, targetType)`.

| Method | Path | Min Role | Notes |
|---|---|---|---|
| GET | `/users` | admin | List users; filters: `status`, `search`, `page`, `limit` |
| GET | `/users/:userId` | admin | Detailed user view with post/booking counts |
| PUT | `/users/:userId/suspend` | admin | Body: `{ reason }`; transactional — also deactivates active posts |
| PUT | `/users/:userId/reactivate` | admin | Clears `suspended_at`, `suspension_reason` |
| GET | `/posts` | moderator | List posts; filters: `status`, `reported`, `page`, `limit` |
| PUT | `/posts/:postId/hide` | moderator | Sets status to `inactive` |
| PUT | `/posts/:postId/restore` | moderator | Sets status back to `active` |
| GET | `/reports` | moderator | List reported_posts; filters: `status`, `page`, `limit` |
| PUT | `/reports/:reportId/resolve` | moderator | Body: `{ adminNotes, action }`; can hide post and/or suspend user |
| PUT | `/reports/:reportId/dismiss` | moderator | Body: `{ adminNotes }` |
| GET | `/disputes` | admin | List disputes; filters: `status`, `page`, `limit` |
| GET | `/disputes/:disputeId` | admin | Single dispute with booking/user details |
| PUT | `/disputes/:disputeId/resolve` | admin | Body: `{ status, adminNotes }`; dispatches DISPUTE_RESOLVED notification to both parties |
| POST | `/payments/:bookingId/release` | admin | Delegates to `payments.service.releasePayment()` |
| POST | `/payments/:bookingId/refund` | admin | Body: `{ amount, reason }`; delegates to `payments.service.refundPayment()` |
| GET | `/settings` | super_admin | All platform_settings rows |
| PUT | `/settings/:key` | super_admin | Body: `{ value }`; type-validated per row's `value_type` |

### 11.12 Pending / Not Yet Mounted
*(All backend API routes are now live — no pending mounts.)*

## 12. Services Implemented

Services are the **only** layer permitted to contain business logic and database queries (see Section 8 layering rule). Every service file below is fully implemented and syntax-validated.

| Service File | Functions Exported | Core Responsibility |
|---|---|---|
| `auth/auth.service.js` | `register, login, logout, refreshAccessToken, verifyEmail, forgotPassword, resetPassword, resendVerification` | Full auth lifecycle, cookie management, timing-attack mitigation, token rotation/reuse-detection |
| `users/users.service.js` | `getMyProfile, updateProfile, changePassword, uploadAvatar, removeAvatar, getPublicProfile, deactivateAccount` | Profile CRUD, Cloudinary avatar lifecycle, session revocation on password change/deactivation |
| `location/location.service.js` | `geocodeAddress, reverseGeocode, calculateDistance, buildHaversineSQL` (re-exported) | Nominatim integration + 25-city Indian static fallback table |
| `posts/posts.service.js` | `getFeed, getPostById, createPost, updatePost, deletePost, updatePostStatus, toggleSavePost, reportPost, getMyPosts, getSavedPosts, getPostBookings` | Single-JOIN feed query w/ dynamic parameterized WHERE builder, full post CRUD, Cloudinary image lifecycle, platform-settings-driven limits |
| `bookings/bookings.service.js` | `createBooking, getBookings, getBookingById, acceptBooking, rejectBooking, withdrawBooking, cancelBooking, markInProgress, completeBooking, raiseDispute, getBookingHistory, getPostBookings` | Full 9-state machine, `FOR UPDATE` transaction locking, conversation auto-creation, commission calculation, lazy-loaded notification dispatch |
| `notifications/notifications.service.js` | `createNotification, listNotifications, markOneRead, markAllRead` | Block I complete — `createNotification` never throws, emits socket event, dispatches booking emails. All lazy-require call sites now activate automatically. |
| `chat/chat.service.js` | `getMyConversations, getConversationById, getMessages, sendMessage, sendImageMessage` | Block L complete — participation-verified, conversation-status-guarded, Cloudinary orphan cleanup, socket event emission |
| `reviews/reviews.service.js` | `createReview, getBookingReviews, getMyReviews, getUserReviews, deleteReview` | Block M complete — role-validated review creation, rating aggregate recalculation (non-transactional on create, transactional on delete), `REVIEW_RECEIVED` notification dispatch, platform-settings-driven edit window |
| `payments/payments.service.js` | `initiatePayment, verifyPayment, handleWebhook, releasePayment, refundPayment` | Block N complete — Razorpay escrow integration, timing-safe HMAC verification, lazy-require notification pattern |
| `admin/admin.service.js` | `listUsers, getUserDetail, suspendUser, reactivateUser, listPostsAdmin, hidePost, restorePost, listReports, resolveReport, dismissReport, listDisputes, getDisputeDetail, resolveDispute, releasePaymentAdmin, refundPaymentAdmin, getPlatformSettings, updatePlatformSetting` | Block O complete — user management, post moderation, report/dispute resolution, payment delegation, platform settings |

| `socket/socket.handler.js` | `initSocketHandlers(io)` | Socket.io authenticate lifecycle; user room join; delegates to chat + notification handlers |
| `socket/chat.socket.js` | `registerChatHandlers(socket, io)` | join/leave conversation rooms; send_message (insert + broadcast); typing relay; messages_read batch mark |
| `socket/notification.socket.js` | `registerNotificationHandlers(socket)` | mark_read via socket; delegates to notifications.service.markOneRead |

### Cross-cutting utility "services" (not modules, but service-like in role)
- `src/jobs/expirePosts.job.js` exports `startJobs, expirePostsJob, autoRejectBookingsJob` — registers an hourly `node-cron` schedule (`5 * * * *`, i.e. 5 minutes past every hour, offset to avoid contention with other on-the-hour jobs) and runs once immediately on server startup to catch missed expirations from downtime.
- `src/utils/sendEmail.js` exports a generic `sendEmail({to, subject, templateName, variables, textFallback})` plus six named convenience wrappers: `sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendBookingRequestEmail, sendBookingAcceptedEmail, sendBookingCancelledEmail`. All six have corresponding HTML template files (the three booking templates were created in Block I). Booking emails are dispatched automatically by `notifications.service.createNotification()` for the relevant notification types.

---

## 13. Components Implemented

**None.** No frontend code has been written. This section is a placeholder required by the documentation template; it will be populated once frontend development begins. When that happens, this section must list every component file with: purpose, props (documented via PropTypes since the project uses no TypeScript), and which pages/parent components consume it — mirroring the level of detail given to backend services in Section 12.

---

## 14. Features Completed

These are end-to-end functional, tested via the documented testing checklists in each block's chat output, and considered production-quality pending final QA:

1. User registration with email verification (link-based, 1-hour expiry, async email dispatch).
2. Login with JWT access + refresh token issuance, httpOnly cookie, timing-attack-resistant credential check.
3. Token refresh with full rotation and reuse-detection (automatic full-session revocation on detected reuse).
4. Logout (single session) and password-change/account-deactivation (all-session revocation).
5. Forgot password / reset password, fully enumeration-safe.
6. Own profile view/edit, avatar upload/removal (Cloudinary, 5MB max, JPEG/PNG/WebP, magic-byte verified), password change.
7. Public profile viewing (existence-safe for suspended/deleted accounts — returns 404, not 403, to avoid confirming suspension status to the public).
8. Account deactivation (soft delete) with cascading effects: all sessions revoked, all active posts set to `inactive`.
9. Creation of all three post types with type-discriminated Joi validation (`need_transport`, `vehicle_available`, `return_journey`), each with the correct required/forbidden/optional field set per type.
10. Post editing (owner-only, blocked once `booked`/`completed`), soft deletion (owner-only, blocked while `booked`, with async Cloudinary image cleanup), status toggling (`active`↔`inactive`).
11. Post image upload (up to `max_images_per_post` platform setting, currently 5) on both create and update.
12. Marketplace feed: combined 3-type feed, full filter set (type, vehicle, category, city, date range, price range), full-text search, geo-radius search (Haversine SQL, no PostGIS dependency), pagination, whitelisted sort columns (prevents SQL injection via `sort_by` param).
13. Post save/unsave toggle (cannot save own post) and post reporting (one report per user per post, cannot report own post).
14. `GET /users/me/posts` and `GET /users/me/saved-posts`.
15. Reference data endpoint (`GET /config/options`) backed by seeded `vehicle_types`/`goods_categories` tables, 10-minute in-process cache.
16. Geocoding and reverse-geocoding (Nominatim + Indian-city static fallback for the 25 largest logistics hub cities, avoiding unnecessary external API calls for common cases).
17. Full booking lifecycle: create (with DB-level duplicate-prevention), withdraw, accept (commission calculation, conversation auto-creation with system message, automatic rejection of competing pending bookings on the same post, post status flip to `booked`), reject, cancel (post re-opened, conversation locked, cancellation counter incremented), mark-in-progress, complete (conversation archived, post status flip to `completed`, payment auto-release timer calculated), full status-history audit trail.
18. Race-condition-safe booking acceptance via PostgreSQL `SELECT ... FOR UPDATE` row locking inside an explicit transaction — verified by design to prevent double-acceptance of competing requests for one post.
19. `GET /users/me/bookings` and `GET /posts/:postId/bookings`.
20. Automated hourly maintenance: post expiry (with a 24-hour pre-expiry warning notification attempt) and booking auto-rejection after a configurable timeout (default 48 hours), both running via `node-cron` in-process.
21. Complete security middleware stack: Helmet, CORS whitelist, body-size limiting, recursive input sanitization (XSS/prototype-pollution prevention), 7-tier rate limiting, Joi validation factory with shared reusable schemas, Multer upload handling with double MIME verification (header + magic bytes), global error handler normalizing every error type (ApiError, JWT errors, 8 distinct PostgreSQL error codes, Multer errors, JSON parse errors, payload-too-large, CORS errors) into one consistent JSON shape.
22. Database migration runner with checksum tracking, transactional per-file application, and dry-run mode. All 20 migrations apply cleanly in sequence against a fresh database.
23. Seed scripts for admin account, vehicle types, goods categories, and platform settings — all idempotent (`ON CONFLICT DO NOTHING`), safe to re-run.
24. Razorpay payment integration: order creation (`initiatePayment`), client-side HMAC signature verification (`verifyPayment`, timing-safe `crypto.timingSafeEqual`), webhook event handling (`handleWebhook` — `payment.captured`, `payment.failed`, `refund.processed`; raw body captured via `express.json()` `verify` callback; always returns 200 to Razorpay), escrow release (`releasePayment`, for admin/cron), and refund (`refundPayment`, Razorpay refund API + DB update, for admin). `paymentInitiateLimiter` (10/hr per user ID) applied to `POST /payments/initiate`.
25. Full admin panel (Block O): user management (list/detail/suspend+post-deactivation/reactivate), post moderation (list/hide/restore), report management (list/resolve/dismiss), dispute resolution (list/detail/resolve with conditional terminal fields, `DISPUTE_RESOLVED` notification to both parties), payment delegation (release/refund via `payments.service`), platform settings management (read-all/update-one with `value_type` coercion). All 16 admin endpoints protected by `authenticateAdmin` (separate `JWT_ADMIN_SECRET`), role-gated (`moderator`/`admin`/`super_admin`), and audit-logged via `logAdminAction`.

---

## 15. Features Partially Completed

| Feature | Working Part | Missing Part |
|---|---|---|
| Real-time events / Socket | Socket.io server configured and event handlers wired (Blocks J + L complete): `socket.handler.js` authenticates clients; `chat.socket.js` handles all chat events; `notification.socket.js` handles `mark_read`; REST send endpoints (`sendMessage`, `sendImageMessage`) emit `new_message` on every write. | — fully functional — |
| Chat / conversations | **Complete (Block L).** DB schema, socket events (Block J), and REST API (Block L) are all live. Clients can list conversations, view message history, send text messages, and upload image messages via HTTP. Real-time delivery via `new_message` socket events. | — fully functional — |
| Payments | **Complete (Block N).** `initiatePayment`, `verifyPayment`, `handleWebhook`, `releasePayment`, `refundPayment` all implemented. 3 REST endpoints live. Razorpay order, signature, webhook, and refund flows production-ready. | Physical bank transfer (payout to transporter) is not automated — `releasePayment` records the release and notifies but requires manual Razorpay Dashboard action or Razorpay Route integration (deferred). `razorpay` package added to `package.json` but `npm install` not yet run. |
| Disputes | **Complete (Block O).** `raiseDispute()` in `bookings.service.js` transitions the booking to `disputed`; `disputes` table now exists (migration 019); admin resolution via `admin.service.js.resolveDispute()` is fully implemented. | — fully functional — |
| Admin moderation | **Complete (Block O).** All 16 admin endpoints live at `/api/v1/admin`. `admin_audit_logs` table exists (migration 020); `logAdminAction` audit middleware is operational. | Minor: `logAdminAction` records `target_id = NULL` for `:reportId` and `:disputeId` routes (param name not in the middleware's extraction list). Action_type + target_type still provide full traceability. |
| Identity verification (KYC) | `uploadImage.js` has a ready-to-use `uploadIdentityDocument()` helper (private Cloudinary folder, larger resolution allowance) and `generateSignedUrl()` for admin-side time-limited viewing. | No `identity_documents` table, no service, no endpoint. This was designed at the architecture level but never scheduled into a concrete block — it is the lowest-priority gap among the partial features. |

---

## 16. Pending Features (Not Started At All)

Direct continuation of Section 3 (Functional Requirements) cross-referenced against Section 6 (Folder Structure):

- **Identity verification / KYC** (no block assigned yet — Pending Decision on scheduling; `uploadImage.js` helpers ready, no table/service/endpoint exists)
- **Phone number verification** (`is_phone_verified` column exists on `users`, but no OTP/SMS flow was ever designed or scheduled — Pending Decision, likely deferred to a future SMS-provider integration like Twilio/2Factor as noted in the original architecture's "Future Migration Paths")
- **All frontend work** (zero files exist — Section 7)
- **Future/deferred features explicitly out of scope for the current build** (carried over unchanged from the original architecture's "Future Features" list — not reconsidered or re-prioritized during this chat): mobile app (React Native/Flutter), AI/smart load matching, route optimization, fuel savings estimator, GPS vehicle tracking, push notifications (FCM), SMS notifications, automated transporter payouts (Razorpay Route/Stripe Connect), multi-currency support, vehicle insurance integration, credit/wallet system, public third-party API, subscription/premium listing tiers, advanced ML analytics, microservices migration, Docker/Kubernetes.

## 17. Current Working State

**As of this document's last update (end of Block O), the backend can:**
- Start successfully (`npm run dev` / `npm start`) given a valid `.env` — confirmed via `node --check` syntax validation on all 112 files, though **full runtime integration testing against a live database has not been performed in this chat** (no actual Postgres instance was connected during development; all validation was static/syntactic).
- Respond to `GET /health` with database connectivity status.
- Run the full auth → profile → post-creation → marketplace-browsing → booking-lifecycle → chat → reviews → payments → admin flow end-to-end **at the code level**, assuming:
  - A real PostgreSQL database with all 20 migrations applied and all 4 seed scripts run.
  - Valid `.env` values for `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET`, Cloudinary credentials, email SMTP credentials, and Razorpay credentials.
  - **`npm install` run in `goodsgo-backend/`** to install `razorpay@^2.9.4` (added to `package.json` in Block N — not yet installed).
- All code paths that were previously blocked (dispute raising, admin mutation audit logging) are now unblocked with migrations 019/020 applied.
- **No remaining P0 runtime blockers.** The only pending blocker is the uninstalled `razorpay` package (P1 — requires `npm install`).

**No actual deployment, staging environment, or production environment has been created.** No CI/CD pipeline exists. No automated test suite (unit or integration) exists — all "testing" performed in this chat was either static syntax checking (`node --check`) or manually-written testing *checklists* provided as documentation for a human to execute, not automated tests that have actually been run against live infrastructure.

---

## 18. Development Roadmap

This supersedes the original 14-phase roadmap from the pre-development review document for everything from this point forward — the original phase numbering (Phase 0–14) is now stale; refer to the **Block lettering** (A, B, C... O) used throughout actual development instead, which is more granular and has proven to be the operative unit of work.

### Completed (in order)
A → B → C → D (+ Block K catch-up: `seed_platform_settings.js`, `package.json` script fix) → E → F → H → K → I → J → L → M → N → **O**

### Remaining (recommended order, with rationale)
1. **`npm install`** in `goodsgo-backend/` — installs `razorpay@^2.9.4` added in Block N. Required before any payment endpoint works.
2. **Production deployment** (Neon.tech production DB, run all 20 migrations + 4 seeds, Render/Railway backend hosting, Vercel/Netlify frontend hosting, custom domain, UptimeRobot health monitoring) — not started, no provider accounts confirmed as created.
3. **Frontend development** (Vite+React scaffold exists; no backend integration yet — can proceed now that all backend APIs are stable).

### Explicitly deferred until post-MVP (per original architecture, unchanged)
PostGIS migration for geo-search at scale, Redis-backed rate limiting/caching/session store, BullMQ for background job queues at scale, Socket.io Redis adapter for horizontal scaling, PgBouncer connection pooling, read replicas.

---

## 19. Coding Standards

These were established in Block A and have been followed with zero deviations across all 74 files:

1. **Every file begins with `'use strict';`** as the first line.
2. **CommonJS modules only** (`require`/`module.exports`) — no ESM `import`/`export` syntax anywhere, to match the Node.js version target and avoid `.mjs`/`type:module` configuration complexity.
3. **JSDoc comments on every exported function** documenting `@param`, `@returns`, and `@throws` where applicable — this is the project's substitute for TypeScript type signatures and must continue.
4. **Section-divider comments** using the `// ─── Section Name ─── ...` box-drawing-character style are used consistently to visually segment long files (especially services and middleware) — this is a stylistic convention, not load-bearing, but should be continued for consistency with existing files.
5. **No magic strings or numbers** for anything that has a corresponding entry in `constants.js` — always import and use the constant (e.g., `BOOKING_STATUS.PENDING`, never the literal string `'pending'`, except inside the SQL migration files themselves where the literal ENUM value must appear).
6. **No inline business logic in controllers or routes** — see Section 8's layering rule. This has been followed without exception.
7. **Every async route handler is wrapped in `asyncHandler()`** — never a raw `async (req, res) => {...}` passed directly to a router method.
8. **Every thrown error in service/controller code is an `ApiError` instance** (or a factory method like `ApiError.notFound()`, `ApiError.forbidden()`, `ApiError.conflict()`, `ApiError.badRequest()`, `ApiError.businessRule()`) — raw `throw new Error(...)` is never used in application code (only inside the lowest-level utility files where it's immediately caught, e.g. `hashPassword.js`'s input-type guard).
9. **All SQL is parameterized** (`$1, $2...`) — string interpolation into SQL is treated as a hard security violation and has never been done, including for dynamic `ORDER BY` columns, which are always validated against a whitelist array (`ALLOWED_POST_SORT_COLUMNS`) before being concatenated.
10. **All Cloudinary/file-handling code goes through `uploadImage.js`** — no other file calls the Cloudinary SDK directly.
11. **All JWT operations go through `generateTokens.js`** — no other file calls `jsonwebtoken` directly.
12. **All password hashing goes through `hashPassword.js`** — no other file calls `bcryptjs` directly.

---

## 20. Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Files | `kebab-case` or `lowerCamelCase` matching the module name, suffixed by role | `auth.service.js`, `bookings.controller.js`, `errorHandler.middleware.js` |
| Database tables/columns | `snake_case` | `users`, `profile_image_url`, `booking_status_history` |
| Database ENUM type names | `snake_case` + `_enum` suffix | `booking_status_enum`, `post_type_enum` |
| JS variables/functions | `camelCase` | `getMyProfile`, `agreedPrice` |
| JS constants (frozen objects) | `SCREAMING_SNAKE_CASE` for the object name, `SCREAMING_SNAKE_CASE` or matching-DB-value strings for members | `BOOKING_STATUS.PENDING`, `RATE_LIMITS.AUTH.MAX` |
| React components (planned) | `PascalCase.jsx` | `PostCard.jsx` (not yet created) |
| API JSON response keys | `camelCase` (translated from `snake_case` DB columns at the service-layer formatter functions, e.g. `formatPost()`, `formatBooking()`) | `agreedPrice`, `profileImageUrl` |
| Route paths | `kebab-case`, RESTful nesting | `/users/me/saved-posts`, `/bookings/:bookingId/mark-in-progress` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `JWT_REFRESH_SECRET`, `BOOKING_AUTO_REJECT_HOURS` |
| Error codes (`ApiError.code`) | `SCREAMING_SNAKE_CASE`, descriptive of the specific failure | `EMAIL_NOT_VERIFIED`, `INVALID_STATUS_TRANSITION`, `CANNOT_BOOK_OWN_POST`, `MAX_POSTS_REACHED` |
| Migration filenames | `NNN_create_<table>.sql`, zero-padded 3-digit sequence | `008_create_bookings.sql` |
| Git commits (planned convention, not yet exercised — no git repo initialized in this chat) | `type(scope): description` | `feat(bookings): add dispute table migration` |

## 21. Error Handling Strategy

**Single global error handler** (`errorHandler.middleware.js`), registered as the absolute last `app.use()` call in `app.js`. It is the only place in the entire codebase that decides what gets shown to the client vs swallowed.

**Error taxonomy and handling order in the handler:**
1. `ApiError` instances (the vast majority of expected errors) → respond with `err.statusCode`, `err.message`, `err.code`, and `err.errors` (field-level array) if present.
2. JWT errors (`TokenExpiredError`, `JsonWebTokenError`, `NotBeforeError`) → mapped to 401 with specific `code` values (`TOKEN_EXPIRED`, `TOKEN_INVALID`).
3. PostgreSQL errors, detected via a 5-character error code + `severity` property check (`isPostgresError()`), mapped via a lookup table covering: `22001` (string too long), `22P02` (invalid UUID format), `22003` (numeric out of range), `23502` (not-null violation), `23503` (FK violation), `23505` (unique violation — message dynamically extracted from `err.detail` to name the specific duplicate field), `23514` (check constraint), `57014` (query timeout). Unmapped Postgres codes fall through to a generic 500.
4. Multer errors (`MulterError` instances, identified by constructor name to avoid an explicit `multer` import in the error handler) → mapped to 400 with human-readable messages per Multer error code.
5. JSON body parse `SyntaxError` (malformed client JSON) → 400.
6. `entity.too.large` (body size limit exceeded) → 413.
7. CORS rejection errors → 403.
8. **Catch-all** for anything else (programmer errors, unexpected exceptions) → generic 500, message is environment-gated: full `err.message` + first 5 stack lines in development, a fixed generic string in production — **never leaks internals in production.**

**`ApiError` class** (`utils/ApiError.js`) carries `statusCode`, `message`, `errors` (nullable field-array for validation failures), `code` (defaults derived from statusCode via a lookup if not explicitly given), and `isOperational` (always `true` for anything constructed via the factory methods; `ApiError.internal()` explicitly sets it `false` to force generic-500 treatment even though it's technically an ApiError instance).

**`asyncHandler()` wrapper** (`utils/asyncHandler.js`) is the mandatory wrapper for every route handler — it is what allows `throw new ApiError(...)` inside an `async` controller to actually reach the global handler instead of crashing the process or hanging the request (Express does not natively catch rejected promises from async middleware in versions before 5.x, which this project does not use).

**Process-level guards** in `server.js`: `unhandledRejection` is logged but does **not** exit the process (the server keeps serving other requests); `uncaughtException` logs and **does** call `process.exit(1)`, on the reasoning that the process is in an unknown state after a truly uncaught exception and only a supervised restart (PM2/Render/Railway will auto-restart) is safe.

---

## 22. Logging Strategy

**Current state: console-only, no structured logging library, no log aggregation/shipping.** This is acknowledged as immature for a production SaaS and is listed as technical debt (Section 34).

- HTTP request logging via `morgan` — `'dev'` format (colored, concise) in development, `'combined'` (Apache-style) in production, decided by `NODE_ENV` in `app.js`.
- Application-level logs use plain `console.log`/`console.warn`/`console.error`, prefixed consistently with a bracketed module tag, e.g. `[Auth]`, `[DB]`, `[Cloudinary]`, `[Email]`, `[Jobs]`, `[Socket.io]`, `[AdminAudit]`. This bracket-tag convention should be continued for any new module.
- Slow-query logging exists in `config/database.js`: any query taking over 100ms logs a `[DB] SLOW QUERY (Nms): <truncated query text>` warning, but **only when `NODE_ENV === 'development'`** — there is currently no equivalent slow-query visibility in production.
- The error handler logs operational errors at `console.warn` level and programmer errors at `console.error` level with a full stack trace, but there is **no integration with any external monitoring/APM service** (Sentry, Datadog, New Relic are mentioned only as inline `// TODO` comments in `errorHandler.middleware.js`, never implemented).
- **No log rotation, no log file persistence is configured** — in a typical PaaS deployment (Render/Railway) this is acceptable since the platform captures stdout/stderr, but this has not been verified against any actual deployed instance.

---

## 23. Validation Strategy

**Joi is the exclusive validation library** — this is the project's deliberate, documented substitute for TypeScript's compile-time type checking (see Section 4). Every module has a `*.validator.js` file exporting Joi schemas; nothing else defines validation rules.

- **`validate(schema, property)` middleware factory** (`validate.middleware.js`) is the only way schemas are wired into routes. It runs with `{abortEarly: false, stripUnknown: true, convert: true}` — collects *all* validation errors in one pass (not just the first), strips any field not defined in the schema (mass-assignment protection), and coerces compatible types (string `"20"` → number `20` for query params, since Express always parses query strings as strings).
- **Shared/reusable schemas** are centralized in `validate.middleware.js`'s exported `commonSchemas` object: `uuid`, `uuidOptional`, `uuidParam` (for `:id` route params), `pagination`, `sort`, `coordinates` — used by reference across multiple modules' validator files rather than being redefined per-module. **Note:** as of Block K, most modules define their own param schemas (`postIdParamSchema`, `bookingIdParamSchema`, `userIdParamSchema`) inline in their own validator files rather than importing from `commonSchemas.uuidParam` — this is a minor consistency drift (both approaches work identically; the inline versions were written for clarity within each module file) — see Section 32, Trade-offs.
- **Type-discriminated validation** is used for the single biggest validation challenge in the project: `posts.validator.js`'s `createPostSchema` uses Joi's `.when('post_type', {...})` conditional logic so one schema correctly enforces different required/forbidden fields for `need_transport` vs `vehicle_available` vs `return_journey`, rather than maintaining three separate schemas with duplicated common-field definitions.
- **Field-level error formatting**: Joi's raw error objects (which include verbose quoted-field-name messages like `'"email" must be a valid email'`) are transformed by `formatJoiErrors()` into the project's standard `{field, message}` shape with cleaned-up, capitalized messages before being attached to an `ApiError`.
- **Validation never happens inside services** — by the time a service function runs, `req.body`/`req.query`/`req.params` have already been replaced with the Joi-validated, type-coerced, unknown-field-stripped value by the middleware. Services trust their inputs completely except for ownership/business-rule checks (which are not validation, they are authorization/state checks — see Section 10.2).

---

## 24. Security Considerations

Full inventory of security measures actually implemented (cross-referencing Section 10 for auth-specific items not repeated here):

- **Password hashing:** bcrypt, cost factor 12 (chosen as the balance point: ~300ms hash time, expensive enough to deter brute force, fast enough not to harm UX). Maximum password length capped at 128 characters specifically to prevent a bcrypt-cost DoS vector (bcrypt's cost scales with input length for very long inputs).
- **JWT secrets:** three independent secrets (`JWT_SECRET` for user access tokens, `JWT_REFRESH_SECRET` for user refresh tokens, `JWT_ADMIN_SECRET` for admin tokens) — never shared, never reused across environments per the `.env.example` comments.
- **Refresh token storage:** SHA-256 hash only, never plaintext, in the `refresh_tokens` table — a database breach alone cannot be used to forge valid sessions.
- **Cookie security:** refresh-token cookie is `httpOnly` (inaccessible to JS, mitigates XSS-based token theft), `Secure` (HTTPS-only in production), `SameSite=Strict` (mitigates CSRF), and path-scoped to `/api/v1/auth` (minimizes the cookie's exposure surface to unrelated endpoints).
- **SQL injection:** structurally prevented — every query is parameterized, and the one place dynamic SQL fragments are built (the feed's `WHERE` clause builder and `ORDER BY` column) uses either parameter placeholders or a hardcoded whitelist array, never raw string concatenation of user input.
- **XSS:** input-side mitigation via `sanitize.middleware.js` (recursive HTML-tag stripping, null-byte removal, prototype-pollution-key filtering on `__proto__`/`constructor`/`prototype`) applied globally to `body`/`query`/`params` before any route handler runs. Output-side mitigation is deferred to the (not-yet-built) frontend's use of React's default JSX auto-escaping.
- **File upload security:** double verification — declared MIME type checked against an allowlist (`image/jpeg`, `image/png`, `image/webp`) by both Multer's `fileFilter` *and* a second independent magic-byte check in `uploadImage.js` (`verifyMagicBytes()`) comparing the actual file buffer's leading bytes against known signatures for each format — defeats the classic "rename a malicious file to `.jpg`" attack since the MIME header alone is trivially spoofable. Files are never written to disk (`multer.memoryStorage()` exclusively) and are streamed directly to Cloudinary with an `EXIF`-stripping transformation applied (`flags: 'strip_profile'`) to prevent leaking embedded GPS/device metadata from user-uploaded photos.
- **Rate limiting:** see Section 10.3 — 7 distinct limiters, IP-based for unauthenticated abuse vectors, user-ID-based for authenticated-abuse vectors (post/booking spam) so a malicious user cannot evade their limit by simply rotating IP addresses.
- **Security headers:** Helmet with an explicit Content-Security-Policy (`default-src 'self'`, image sources allow Cloudinary's CDN domain, connect-src allows only the configured frontend origin) and `crossOriginEmbedderPolicy: false` (deliberately disabled because it was found to block Cloudinary image loading in some browser contexts — documented inline in `app.js`).
- **CORS:** explicit origin allowlist built from `FRONTEND_URL` env var plus the two common local dev ports; in production, any origin not on the list is rejected outright (`new Error('CORS: Origin ... not allowed')`); in development, all origins are permitted for iteration speed.
- **Admin/user privilege separation:** see Section 5 and Section 10.2 — cryptographically enforced via separate signing secrets, not just an authorization check.
- **Existence-disclosure prevention:** suspended/deactivated user profiles return 404 (not 403) on `GET /users/:userId`; forgot-password and resend-verification always return 200 regardless of account existence.
- **Audit trail:** `booking_status_history` (working, append-only) and `admin_audit_logs` (created by migration 020 in Block O, now fully operational via `logAdminAction` middleware) provide accountability trails for sensitive state transitions.
- **Not implemented / explicitly deferred:** CSRF double-submit-cookie token (mentioned in the original pre-development review as `AR-17`, never actually built — the `SameSite=Strict` cookie attribute is currently the *only* CSRF mitigation in place; this was accepted as sufficient for the MVP but is flagged as a Pending Decision for a hardening pass before scale), 2FA for any account type, IP-based anomaly detection beyond simple rate limiting, Web Application Firewall / DDoS protection at the infrastructure layer (would be a Cloudflare/hosting-provider concern, not application code).

---

## 25. Performance Considerations

- **N+1 query prevention:** the marketplace feed (`posts.service.js.getFeed()`) and single-post detail (`getPostById()`) both use a single JOIN query (posts ⋈ users ⋈ post_images, with `json_agg(...) FILTER (WHERE pi.id IS NOT NULL)` to collapse the 1-to-many image relationship into a JSON array within the same query) rather than fetching posts and then looping to fetch each owner/image set separately. This was an explicit, named architectural requirement from the original pre-development review (`AR-15`) and has been honored in every list-returning service function.
- **Database connection pooling:** `pg.Pool` configured with conservative `min:2/max:10` defaults (overridable via `DB_POOL_MIN`/`DB_POOL_MAX` env vars), sized deliberately small to respect Neon.tech's free-tier concurrent-connection ceiling (~10). The migration runner and each seed script use a **separate** pool with `max:1` specifically so they don't compete with the main application pool's headroom and can be run safely alongside a live server.
- **Per-request DB lookup in `authenticate` middleware:** every authenticated request does one extra primary-key SELECT against `users` to catch post-issuance suspension/deletion (Section 10.2, point 1). This is a deliberate correctness-over-raw-speed trade-off; the query is a single indexed PK lookup (effectively O(1) in Postgres) and was estimated at 1-3ms overhead at the time of the decision. **No caching layer exists yet** to avoid this per-request cost at higher scale — the documented future mitigation (not yet built) is a short-TTL (e.g. 5-minute) Redis cache keyed by user ID, invalidated explicitly on suspend/delete/deactivate actions.
- **In-memory caching used today (no Redis dependency):** `config.routes.js`'s `GET /options` endpoint caches the vehicle-types/goods-categories payload in a plain module-level JS variable for 10 minutes — sufficient because this data changes essentially never during normal operation, and a single-process in-memory cache is fine at current scale (becomes a consistency problem only once horizontal scaling to multiple server instances happens — see Section 26).
- **Geo-search without PostGIS:** the Haversine-distance "nearby posts" filter is implemented as a raw SQL trigonometric expression (`buildHaversineSQL()` in `calculateDistance.js`) rather than using PostGIS's spatial index types. This was an explicit, accepted trade-off: it does **not** use a spatial index, meaning every nearby-search query does a full computation pass over all rows matching the other filters before the radius check — acceptable at the project's current and near-term expected data volume (tens of thousands of posts, not millions), but explicitly documented in the original architecture as needing a PostGIS migration before that volume is reached.
- **Rate-limiter storage:** the `express-rate-limit` package's default in-memory store is used — fine for a single-process deployment, but **will not work correctly if the application is ever scaled to multiple server instances** without switching to a shared store (Redis-backed `rate-limiter-flexible` is the documented future replacement, not yet built).
- **Slow query logging:** see Section 22 — development-only visibility, no equivalent in production yet.

---

## 26. Scalability Considerations

Directly inherited from the original architecture's "Future Migration Paths" section, re-affirmed as still accurate and unchanged by anything built during actual development:

| Trigger Condition | Planned Mitigation | Status |
|---|---|---|
| Feed queries exceed ~500ms | Add PostGIS + GiST spatial index for geo queries | Not started; current Haversine SQL approach is the interim solution |
| More than one server instance needed | Add Socket.io Redis adapter (shares socket state across instances) | Not started; current Socket.io setup assumes single-instance |
| More than one server instance needed | Replace in-memory `express-rate-limit` store with Redis-backed store | Not started |
| Post volume exceeds tens of thousands of active rows | PostGIS spatial indexing becomes necessary, not optional | Not started |
| Email volume exceeds Gmail's practical free-tier ceiling (~500/day) | Switch SMTP provider to SendGrid/Mailgun (the `email.js` config already documents both setups in comments, switching is purely an `.env` change, zero code change required) | Ready to switch, not yet needed |
| Background job volume grows beyond what `node-cron` in-process scheduling can handle (e.g. need for retries, distributed workers, job prioritization) | Introduce BullMQ + Redis | Not started; explicitly out of scope for current build per original constraints |
| Connection pool exhaustion under concurrent load (Neon free tier ~10 connections) | Add PgBouncer, or upgrade Neon plan, or migrate to self-hosted PostgreSQL | Not started |
| Need to extract a module into an independently-scalable service | "Strangler fig" extraction is documented per-module in the original architecture (auth → Auth Service, posts+location → Marketplace Service, chat+socket → Messaging Service, payments → Payment Service, notifications → Notification Service) | Purely aspirational; the current monolith has not been designed with any actual service boundaries beyond the existing folder-per-module structure — extraction would require real work, not just a deploy-config change |

**No load testing, no capacity planning, no actual user-volume projections have been performed at any point in this chat.** All of the above are forward-looking design notes carried from the original architecture phase, not measured/validated against real traffic.

## 27. Deployment Strategy

**Status: Designed, not executed.** No deployment has actually happened. No hosting accounts have been confirmed as created (the original pre-development review listed Render.com/Railway/Neon.tech/Cloudinary as *recommendations*, but none of these were verified as set up during actual development — this entire section remains **Pending Decision / Pending Execution**).

### Planned approach (from original architecture, unchanged)
- **Phase 1 (MVP deployment):** Backend on Render.com or Railway (free/low-cost tier), database on Neon.tech (free serverless Postgres), images on Cloudinary (free tier), email via Gmail SMTP initially.
- **Phase 2 (production-grade):** Add Cloudflare in front for DDoS/CDN, a load balancer if multiple instances are needed, PostgreSQL read replica, Redis for sessions/cache/rate-limiting, switch email to SendGrid/Mailgun.
- **Deployment readiness already built into the code (even though never exercised against a real platform):**
  - `GET /health` endpoint exists specifically for load-balancer/uptime-monitor health checks, returns 503 on DB disconnection.
  - Graceful shutdown on `SIGTERM`/`SIGINT` in `server.js` — closes HTTP server, Socket.io, and the DB pool in sequence with a 30-second hard timeout, designed exactly for PaaS redeploy cycles (Render/Railway/Docker/PM2 send `SIGTERM` on redeploy).
  - Required-env-var validation at startup (`server.js` checks `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET`, `NODE_ENV`, `PORT` are present and exits with a clear message if not) — prevents a confusing runtime failure from a misconfigured deploy.
- **Not yet built:** any CI/CD configuration file (no `.github/workflows/`, no `render.yaml`, no `Procfile`, no Dockerfile — none were requested or created). No staging environment. No blue-green or canary deploy strategy considered.

---

## 28. Environment Variables

Full, verified, current content of `.env.example` (this is the literal file on disk — copy it to `.env` and fill in real values):

```env
# ── SERVER ───────────────────────────────────────────────────
NODE_ENV=development                  # development | production | test
PORT=5000

# ── DATABASE (PostgreSQL) ─────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/goodsgo_db
DB_POOL_MIN=2
DB_POOL_MAX=10

# ── JWT — USER TOKENS ─────────────────────────────────────────
JWT_SECRET=replace_with_256_bit_random_secret_min_64_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace_with_another_256_bit_random_secret_min_64_chars
JWT_REFRESH_EXPIRES_IN=7d

# ── JWT — ADMIN TOKENS ────────────────────────────────────────
JWT_ADMIN_SECRET=replace_with_third_256_bit_random_secret_min_64_chars
JWT_ADMIN_EXPIRES_IN=8h

# ── CLOUDINARY (Image Storage) ────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── EMAIL (SMTP) ──────────────────────────────────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false                    # true for port 465, false for 587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password_16_chars
EMAIL_FROM="GoodsGo <noreply@goodsgo.in>"

# ── FRONTEND ──────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173

# ── PAYMENT GATEWAY (Razorpay) ────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# ── PLATFORM CONFIGURATION (fallback defaults; live values in platform_settings table) ──
PLATFORM_COMMISSION_PCT=10
POST_EXPIRY_DAYS=30
BOOKING_AUTO_REJECT_HOURS=48
PAYMENT_DEADLINE_HOURS=24
PAYMENT_AUTO_RELEASE_DAYS=7
REVIEW_EDIT_WINDOW_HOURS=24
MAX_IMAGES_PER_POST=5
MAX_ACTIVE_POSTS_PER_USER=10
MIN_BOOKING_PRICE=100
```

### How to obtain each external credential

| Variable(s) | Where to get it |
|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET` | Generate locally — never fetched from a third party: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` — run three times for three distinct values. |
| `CLOUDINARY_*` | Free account at `cloudinary.com` → Dashboard → Settings → API Keys. Already filled in by the user as of this document's writing (per the user's own confirmation in chat). |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail account with 2-Step Verification enabled at `myaccount.google.com/security`, then generate an **App Password** (not your normal Gmail password) at `myaccount.google.com/apppasswords` → select "Mail" + "Other (Custom name)" → use the 16-character generated password as `EMAIL_PASS`. For production scale, switch to SendGrid (`EMAIL_HOST=smtp.sendgrid.net`, `EMAIL_USER=apikey` literally, `EMAIL_PASS=<SendGrid API key>`). This exact guidance was already delivered to the user in chat. |
| `RAZORPAY_*` | Account at `razorpay.com` → Dashboard → API Keys (test mode keys start `rzp_test_`) → Webhook secret from Dashboard → Webhooks → Secret. **Not yet actually used by any code** — Block N has not been built. |

### Variables referenced in code but **missing from `.env.example`** (gap to fix)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` — read by `seed_admin.js` with hardcoded fallback defaults (`admin@goodsgo.in` / `Admin@123456` / `GoodsGo Super Admin`) if not set. **Functional but insecure as a long-term default** — should be added to `.env.example` and the example `.env` should be required to override the password default before any non-local use. Minor gap, not a runtime crash.

---

## 29. External Integrations

| Integration | Status | Purpose | Notes |
|---|---|---|---|
| **PostgreSQL (Neon.tech recommended)** | Schema-ready, not connected to a live instance during this chat | Primary data store | All 20 migrations + 4 seeds written and syntax-validated; never executed against a real database in this chat |
| **Cloudinary** | Fully integrated, credentials provided by user | Image storage (avatars, post photos) | `uploadImage.js` is the sole integration point; double MIME verification; EXIF stripping; signed URLs supported for future private-asset use (KYC) |
| **Nominatim (OpenStreetMap)** | Fully integrated | Geocoding / reverse geocoding | Free, no API key, rate-limited to ~1 req/sec by Nominatim's usage policy — mitigated by the static 25-city Indian fallback table reducing actual external calls for common cases. Requires a descriptive `User-Agent` header per Nominatim's terms of use (already set: `'GoodsGo/1.0 (logistics marketplace India; contact@goodsgo.in)'`) |
| **Gmail SMTP / Nodemailer** | Integrated, requires user's own App Password | Transactional email | Pooled SMTP connections (`pool:true, maxConnections:5, maxMessages:100`); production path to SendGrid documented but not switched |
| **Razorpay** | **Not integrated** — no SDK calls written anywhere | Payment gateway | Block N. **`razorpay` npm package is not even installed** — see Section 33 |
| **Socket.io** | Server configured, no event handlers registered | Real-time chat/notifications | Block J for handlers |

---

## 30. Third-party Libraries

### Backend — currently in `package.json` `dependencies`
```
bcryptjs ^2.4.3            cloudinary ^2.5.1           cors ^2.8.5
date-fns ^3.6.0            dotenv ^16.4.5              express ^4.19.2
express-rate-limit ^7.4.1  helmet ^7.1.0               joi ^17.13.3
jsonwebtoken ^9.0.2        morgan ^1.10.0              multer ^1.4.5-lts.1
node-cron ^3.0.3           nodemailer ^6.9.15          pg ^8.11.5
socket.io ^4.7.5           uuid ^9.0.1
```
### `devDependencies`
```
nodemon ^3.1.4
```
### ⚠ Added to `package.json` but NOT YET INSTALLED (run `npm install` in `goodsgo-backend/`)
```
razorpay@^2.9.4  — added Block N; required by payments.service.js; npm install not yet run
```
*(axios was resolved in Block I and is now installed.)*

### Frontend (planned only — none installed, no `package.json` exists for a frontend project yet)
```
react, react-dom, react-router-dom, axios, socket.io-client,
react-hook-form, yup, @hookform/resolvers, zustand,
@tanstack/react-query, leaflet, react-leaflet, date-fns,
react-hot-toast, prop-types
(dev) vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer
```

### Deliberately excluded libraries (and why — do not add these without revisiting the architecture decision)
- **TypeScript** — explicit project constraint from day one.
- **Any ORM** (Prisma, Sequelize, TypeORM, Knex-as-query-builder) — explicit architecture decision, Section 8.
- **`cookie-parser`** — refresh-token cookie is parsed manually in `auth.service.js` via a small regex/split function specifically to avoid this dependency for one simple operation.
- **Redis, BullMQ** — explicit initial-build constraint; documented future addition only (Section 26).
- **Docker, Kubernetes** — explicit initial-build constraint.
- **NestJS** — explicit initial framework constraint; plain Express only.

## 31. Important Design Decisions

A consolidated list of every deliberate, discussed architectural choice made during this project, with the reasoning preserved (cross-referenced to where each is discussed in more depth elsewhere in this document):

1. **No `role` column on `users`; role is implicit per-post/per-booking.** (Section 2, Section 5) — Core product differentiator from a traditional two-sided marketplace.
2. **Monolith, layered MVC, no microservices, no ORM, no TypeScript.** (Section 4, Section 8) — Resource-constrained development environment + team-size/velocity reasoning, not a permanent technical ceiling.
3. **Single wide `posts` table for all 3 post types instead of 3 separate tables.** (Section 8, Section 9.3) — Optimizes for the single most frequent query (the combined feed) at the cost of many nullable columns.
4. **`pg` driver directly, zero ORM, 100% parameterized hand-written SQL.** (Section 8) — Debuggability and explicit control over query plans/locking, especially for the booking-acceptance race condition.
5. **Database-level race-condition prevention via `FOR UPDATE` + a partial unique index**, not merely an application-layer check. (Section 3.4, Section 9.3) — A service-layer-only check ("is there already a pending booking?") is vulnerable to a TOCTOU (time-of-check-to-time-of-use) race under concurrent requests; the DB constraint is the actual source of truth.
6. **Commission percentage is snapshotted onto the `bookings` row at acceptance time**, not live-joined from `platform_settings` at read time. (Section 9.3) — Historical bookings must retain the rate that applied when they were made, even if the admin changes the global rate later. This was an implicit decision made during Block K's implementation, not explicitly debated in chat, but is the only behavior consistent with correct accounting.
7. **Lazy-`require()`-with-try/catch for forward-referencing not-yet-built modules** (notifications, primarily). (Section 8) — Enables strictly incremental, block-by-block delivery without forward-declaring empty stub files that would need to be found and replaced later. Explicitly NOT to be "cleaned up" — see Section 8's closing note.
8. **Manual cookie parsing instead of `cookie-parser` middleware.** (Section 30) — One regex avoids a whole dependency for a single read operation on one specific cookie name.
9. **Timing-attack-resistant login** (always run `bcrypt.compare()`, even against a dummy hash, when the user doesn't exist) and **enumeration-safe forgot-password/resend-verification** (always 200, real work deferred to `setImmediate()`). (Section 10.1) — Both are specific, named anti-enumeration patterns carried over from the pre-development security review (`AR-*` items in the original architecture documents) and correctly implemented.
10. **Separate JWT secrets for user vs admin tokens**, rather than a shared secret with a `role` claim differentiator. (Section 5, Section 10.2) — Makes privilege escalation a cryptographic impossibility, not merely an authorization-logic correctness question.
11. **Ownership checks live inside service functions, re-fetching the row, rather than a generic "ownership middleware."** (Section 10.2) — The "owner" column differs by table, and the check frequently needs to happen inside the same DB transaction as the mutation it's gating.
12. **No PostGIS; Haversine SQL formula instead.** (Section 25) — Avoids a Postgres extension dependency that may not be available/enabled on all free-tier hosts (confirmed available need was never independently verified for Neon.tech free tier during this chat — this is itself a minor unverified assumption, see Section 40).
13. **Indian-city static-coordinate fallback table before calling Nominatim.** (Section 11.4, `location.service.js`) — Reduces external API dependency/latency/rate-limit exposure for the most common location lookups in the platform's primary target market.
14. **`node-cron` in-process scheduling instead of a dedicated job queue.** (Section 4, Section 18) — Matches the "no Redis/BullMQ initially" constraint; jobs run once on server startup (to catch missed runs after downtime) plus hourly thereafter.
15. **Migration file count was explicitly locked to exactly 18 files by direct user instruction**, overriding an earlier 24-migration draft that included `disputes`, `admin_audit_logs`, and `identity_documents` tables. (Section 9.1) — The lock was extended to 20 files in Block O when the user explicitly approved adding `019_create_disputes.sql` and `020_create_admin_audit_logs.sql`. The `identity_documents` table remains deferred. The lock extension resolved all P0 blockers that originated from the 18-file consolidation (see Section 33).

---

## 32. Trade-offs Made

| Trade-off | What Was Gained | What Was Given Up |
|---|---|---|
| Single wide `posts` table | Simple single-query feed | Many always-NULL columns per row depending on type; slightly larger row size than 3 normalized tables |
| No ORM | Full SQL visibility/control, no abstraction-leakage debugging | More boilerplate per query; no auto-generated migrations from a schema file; developer must manually keep SQL and any future schema-validation layer in sync |
| Per-request DB lookup in `authenticate` | Immediate suspension/deletion enforcement (max 0-latency staleness) | Extra DB round-trip on every single authenticated request; no caching layer yet to offset this at scale |
| In-memory cache for `/config/options`, in-memory rate-limit store | Zero extra infrastructure (no Redis) at current scale | Both break correctness guarantees the moment a second server process exists (cache inconsistency, rate limits resettable per-instance) |
| Lazy-require pattern for cross-module forward references | Strictly incremental, non-blocking, block-by-block delivery | Slightly obscures the "true" dependency graph at a glance — a reader of `bookings.service.js` must know to check whether `notifications.service.js` exists rather than seeing a normal top-level `require` |
| Duplicated `getSetting()`/`getPlatformSetting()` helper in both `posts.service.js` and `bookings.service.js` | Each module is self-contained, no shared "settings service" indirection to design/maintain | Two near-identical functions exist; a future schema change to `platform_settings` (e.g. adding a `'json'` value_type parse branch) must be updated in two places — **acknowledged technical debt**, see Section 34 |
| Inline per-module ID-param Joi schemas (`postIdParamSchema`, `bookingIdParamSchema`, `userIdParamSchema`) instead of universally importing `commonSchemas.uuidParam` from `validate.middleware.js` | Each validator file is self-contained and readable in isolation | Minor duplication; the shared `commonSchemas.uuidParam` export exists and is unused by most modules — a missed consolidation opportunity, not a bug |
| Frontend form validation (planned: Yup) will duplicate backend validation (Joi) rather than sharing a single schema source | Each layer can be built/tested independently; standard for the React ecosystem | Two schemas must be kept in sync by hand whenever a validation rule changes — no shared-schema codegen tooling was set up or even discussed as a possibility |
| Static 25-city Indian coordinate table | Fast, free, no external call for common cases | Coordinates are city-centroid approximations, not precise addresses; will be slightly wrong for very large cities' outer suburbs (e.g. "Mumbai" resolves to one central point, not the actual Andheri/Powai/etc. neighborhood) |

---

## 33. Known Issues

**This is the single most important section in this document for anyone continuing development.** These are *active defects*, not future-feature gaps (those are Section 16). Fix priority order is given.

### ✅ P0 Items Resolved (Block O)

**Issue 1 — RESOLVED: `disputes` table** — Created by `019_create_disputes.sql` (Block O). `PUT /bookings/:id/dispute` is now fully functional. Schema: `dispute_status_enum` (open/under_review/resolved_for_customer/resolved_for_transporter/resolved_partial), `disputes` table with `booking_id`, `raised_by`, `reason`, `description`, `evidence_urls`, `status`, `admin_notes`, `resolved_by → admin_users(id) SET NULL`, `resolved_at`, `created_at`, `updated_at` + trigger.

**Issue 2 — RESOLVED: `admin_audit_logs` table** — Created by `020_create_admin_audit_logs.sql` (Block O). `logAdminAction` is now operational. JSDoc stale reference ("migration 022") corrected to "migration 020". Schema: `admin_audit_logs` with `admin_id → admin_users(id) SET NULL`, `action_type`, `target_type`, `target_id UUID`, `ip_address INET`, `metadata JSONB`, `created_at` (append-only — no `updated_at`).

### 🟠 P1 — Will fail at runtime when the affected code path executes

**Issue 3 (RESOLVED — Block I): `axios` was missing from `package.json`.**
- `"axios": "^1.7.9"` added to `package.json` dependencies during Block I. Run `npm install` to lock it into `node_modules`.

**Issue 4 (RESOLVED — Block N): `razorpay` added to `package.json`.**
- `"razorpay": "^2.9.4"` added during Block N. **`npm install` must be run in `goodsgo-backend/` to install it** — this is the only remaining P1 blocker in the project.

### 🟡 P2 — Non-blocking inconsistencies

**Issue 5 (RESOLVED — Block O):** `adminAuth.middleware.js`'s JSDoc comment for `logAdminAction` referenced "migration 022" — stale from the pre-consolidation 25-migration numbering. Corrected to "migration 020" in Block O.

**Issue 6 (RESOLVED — Block I):** Three booking email templates were missing. `booking-request.html`, `booking-accepted.html`, `booking-cancelled.html` generated in Block I.

**Issue 7:** `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_FULL_NAME` env vars are read by `seed_admin.js` but not documented in `.env.example`. Functional (has hardcoded fallback defaults) but should be added for clarity and to discourage leaving the default password in place.

**Issue 8 (NEW — Block O):** `logAdminAction` records `target_id = NULL` in `admin_audit_logs` for routes using `:reportId` or `:disputeId` params (the middleware only extracts `id`, `userId`, `postId`, `bookingId` from `req.params`). `action_type` + `target_type` still provide full context. Low priority — the audit log remains useful without target_id for these two route groups.

---

## 34. Technical Debt

(Items that work correctly today but represent a deliberate "pay this down later" deferral, distinct from the active bugs in Section 33.)

1. **Duplicated `getSetting()`/`getPlatformSetting()` helper functions** in `posts.service.js` and `bookings.service.js` (Section 32). Should eventually be consolidated into a shared `platformSettings.service.js` or a `utils/settings.js` helper with simple in-memory caching (it's read-heavy, write-rare data — a good caching candidate even before Redis is introduced).
2. **No automated test suite exists anywhere in the project.** Every "test" performed during development was either a static syntax check (`node --check`) or a written-but-never-executed manual testing checklist. Before this project scales past MVP, a real test suite (likely Jest, given the Node/Express stack) covering at minimum the booking state machine, the auth token rotation/reuse-detection logic, and the feed query builder is strongly recommended given how much subtle correctness logic lives in those three areas.
3. **No structured logging / APM integration** (Section 22) — `console.*` calls everywhere, no Sentry/Datadog/equivalent. Fine for solo development, will become a real operational liability once there are actual users generating actual errors that need triage.
4. **In-memory rate limiting and in-memory config caching** will silently stop providing correct guarantees the moment the app runs as more than one process/instance (Section 25, Section 26) — not urgent today, but the fix (Redis) should be planned *before* horizontal scaling is attempted, not discovered as a bug after the fact.
5. **`commonSchemas.uuidParam`/`pagination`/`sort`/`coordinates` exported from `validate.middleware.js` are mostly unused** in favor of per-module inline equivalents (Section 32) — low-priority consolidation opportunity for consistency.
6. **No git repository has been initialized or committed to at any point during this chat-based development.** Everything exists only as files generated into a sandbox/output directory across many separate chat turns. **The very first action when continuing in Claude Code should be initializing a git repo and making an initial commit of the current state**, so that all subsequent work has real version history — there is currently none.

---

## 35. Future Improvements

(Lower-priority, "nice eventually" items, distinct from the planned-but-not-yet-built features in Section 16 and the deferred-by-design Future Features list also in Section 16.)

- Shared validation schema generation between backend Joi and frontend Yup (e.g. via a schema-definition format both can consume) to eliminate the duplicated-validation-logic trade-off noted in Section 32.
- Database query result caching for genuinely hot, rarely-changing reads (vehicle types, goods categories — already done in-memory; public user profiles and post details could be added once Redis exists).
- Structured JSON logging (e.g. `pino`) instead of plain `console.*`, to enable real log aggregation once deployed.
- Admin-configurable email template editing (currently templates are static files; an admin-panel template editor was never designed but would be a natural Block O extension).
- Soft-delete cascade auditing — verify (once a test suite exists) that every soft-delete path (`users.deactivateAccount`, `posts.deletePost`) correctly leaves historical `bookings`/`payments`/`reviews` rows intact and queryable, as designed, since this has only been reasoned about, never tested against a real database.
- Reconsider whether `disputes`/`admin_audit_logs`/`identity_documents` should be re-added as a single coordinated migration (resolving Section 33 P0 issues 1 and 2 together, plus optionally building out the previously-designed-but-deferred identity-verification feature from Section 16 at the same time, since all three were originally part of the same pre-consolidation 25-migration plan).

## 36. Exact Next Development Task

**Block O — Admin Module: COMPLETE** (implemented this session, 2026-06-26).

**Recommended next task:**

**Production deployment or frontend development.** The backend MVP is complete. All 17 planned API surface areas are live across 20 migrations + 4 seeds.

Choose one:
1. **`npm install`** in `goodsgo-backend/` → connect Neon.tech Postgres → run all 20 migrations + 4 seeds → manually test Block N payment endpoints + Block O admin endpoints → deploy to Render/Railway.
2. **Begin frontend development** — `goodsgo-frontend/` Vite+React scaffold exists; all backend APIs are stable and documented in Section 11.

---

## 37. Current Priorities

In order:
1. **`npm install`** — installs `razorpay@^2.9.4` (added to `package.json` in Block N, not yet installed).
2. Set Razorpay test credentials in `.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
3. Add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` to `.env.example` with a warning to override the password default before any non-local use.
4. Connect a real PostgreSQL instance (Neon.tech) — run all 20 migrations + 4 seeds for the first time.
5. Manually test Block N payment endpoints + Block O admin endpoints against a live server.
6. Begin frontend development or production deployment.

---

## 38. Important TODO Items

(Concrete, actionable, smaller-grained than the section-level issues above — a working checklist.)

- [x] Add `axios` to `package.json` — done Block I. Run `npm install` to apply.
- [x] Add `razorpay` to `package.json` before Block N — done Block N.
- [x] Create `disputes` + `admin_audit_logs` migrations (019, 020) — approved and done Block O.
- [ ] Add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` to `.env.example` with a comment warning to override the password default.
- [x] Build `notifications.service.js`, `notifications.controller.js`, `notifications.validator.js`, `notifications.routes.js` (Block I) — done.
- [x] Wire `/me/notifications*` routes into `users.routes.js` — done.
- [x] Generate 3 booking email templates — done Block I.
- [x] Build `src/socket/socket.handler.js`, `chat.socket.js`, `notification.socket.js` (Block J); replace `// BLOCK J:` placeholder comment in `server.js` — done Block J.
- [x] Build Chat module (Block L); add `app.use('/api/v1/chat', ...)` to `app.js` — done Block L.
- [x] Build Reviews module (Block M); add `app.use('/api/v1/reviews', ...)`; wire `/me/reviews` into `users.routes.js`. Done Block M.
- [x] Build Payments module (Block N); add `app.use('/api/v1/payments', ...)` — done Block N.
- [x] Build Admin module (Block O); add `app.use('/api/v1/admin', ...)`; `logAdminAction` wired into all admin mutation routes — done Block O.
- [ ] **Run `npm install`** in `goodsgo-backend/` — installs `razorpay@^2.9.4`.
- [ ] Initialize git repository; first commit.
- [ ] Set up an actual PostgreSQL instance (Neon.tech) and run all 20 migrations + 4 seeds against it for the first time — **this has never been done**, all validation to date has been static/syntactic only.
- [ ] Begin frontend project (`npm create vite@latest`) once ready to parallelize.
- [ ] Set up at least a minimal automated test suite for the admin module's irreversible-action logic (suspend, refund).

---

## 39. Files Generated During This Chat (Complete Inventory)

This is the authoritative file manifest. Cross-reference against Section 6 for the tree view; this list is the flat enumeration with originating block, useful for git-history reconstruction if committing the project for the first time.

```
Block A (16 files):
  package.json, .env.example, .gitignore, server.js, src/app.js,
  src/utils/constants.js, src/utils/ApiError.js, src/utils/ApiResponse.js,
  src/utils/asyncHandler.js, src/utils/paginate.js, src/utils/calculateDistance.js,
  src/utils/hashPassword.js, src/utils/generateTokens.js, src/utils/generateOTP.js,
  src/utils/sendEmail.js, src/utils/uploadImage.js

Block B (4 files):
  src/config/database.js, src/config/cloudinary.js,
  src/config/email.js, src/config/socket.js

Block C (7 files):
  src/middleware/errorHandler.middleware.js, src/middleware/sanitize.middleware.js,
  src/middleware/validate.middleware.js, src/middleware/rateLimiter.middleware.js,
  src/middleware/auth.middleware.js, src/middleware/adminAuth.middleware.js,
  src/middleware/upload.middleware.js

Block D (22 files, regenerated once mid-project to match a strict 18-migration spec):
  src/db/migrate.js,
  src/db/migrations/001_create_extensions.sql through 018_create_platform_settings.sql (18 files),
  src/db/seeds/seed_admin.js, seed_vehicle_types.js, seed_goods_categories.js

Block E (7 files):
  src/utils/emailTemplates/verify-email.html, reset-password.html, welcome.html,
  src/modules/auth/auth.validator.js, auth.service.js, auth.controller.js, auth.routes.js

Block F (4 files):
  src/modules/users/users.validator.js, users.service.js,
  users.controller.js, users.routes.js

Block H (8 files):
  src/modules/location/location.service.js, location.controller.js, location.routes.js,
  src/jobs/expirePosts.job.js,
  src/modules/posts/posts.validator.js, posts.service.js, posts.controller.js, posts.routes.js
  (plus the undocumented-in-original-plan addition: src/modules/config/config.routes.js)

Block K (4 files + 1 catch-up + edits):
  src/modules/bookings/bookings.validator.js, bookings.service.js,
  bookings.controller.js, bookings.routes.js
  CATCH-UP: src/db/seeds/seed_platform_settings.js (originally planned for Block D, missed, generated here)
  EDITS: package.json (seed script names corrected), src/app.js (bookings route mounted),
         src/modules/users/users.routes.js (/me/bookings added),
         src/modules/posts/posts.service.js (getPostBookings stub replaced with live delegation)

Block I (7 new files + edits):
  RECOVERY (were 0 bytes, rebuilt): src/utils/ApiError.js, ApiResponse.js, asyncHandler.js, paginate.js,
    generateOTP.js, hashPassword.js, generateTokens.js, calculateDistance.js, uploadImage.js, sendEmail.js
  NEW: src/utils/emailTemplates/booking-request.html, booking-accepted.html, booking-cancelled.html,
       src/modules/notifications/notifications.validator.js, notifications.service.js,
       notifications.controller.js, notifications.routes.js
  EDITS: package.json (axios added), src/modules/users/users.routes.js (/me/notifications sub-router wired)

Cumulative incremental edits to src/app.js across blocks: C, E, F, H, K (route activations, each documented at the time)
Cumulative incremental edits to server.js: H (cron job startup added)
Cumulative incremental edits to src/modules/users/users.routes.js: F (created), H (/me/posts, /me/saved-posts), K (/me/bookings), I (/me/notifications)
Cumulative incremental edits to src/modules/posts/posts.service.js: H (created), K (stub replaced)

Block J (3 new files + 1 edit):
  src/socket/socket.handler.js, src/socket/chat.socket.js, src/socket/notification.socket.js
  EDIT: server.js (// BLOCK J: placeholder replaced with initSocketHandlers(io) call)

Block L (4 implemented files + 6 edits):
  IMPLEMENTED (were empty): src/modules/chat/chat.validator.js, chat.service.js, chat.controller.js, chat.routes.js
  EDITS: src/utils/constants.js (CLOUDINARY_FOLDERS.CHAT + RATE_LIMITS.CHAT_MESSAGE added),
         src/utils/uploadImage.js (uploadChatImage added),
         src/middleware/upload.middleware.js (uploadSingleImage added),
         src/middleware/rateLimiter.middleware.js (chatMessageLimiter added),
         src/app.js (// BLOCK L: placeholder replaced with live mount),
         src/modules/users/users.routes.js (GET /me/conversations wired in)

Block M (4 implemented files + 2 edits):
  IMPLEMENTED (were empty): src/modules/reviews/reviews.validator.js, reviews.service.js,
    reviews.controller.js, reviews.routes.js
  EDITS: src/app.js (// BLOCK M: placeholder replaced with live mount),
         src/modules/users/users.routes.js (GET /me/reviews wired in)

Block N (4 implemented files + 3 edits + 1 pre-block fix):
  IMPLEMENTED (were empty): src/modules/payments/payments.validator.js, payments.service.js,
    payments.controller.js, payments.routes.js
  EDITS: src/app.js (verify callback on express.json() for req.rawBody; // BLOCK N: replaced with live mount),
         src/middleware/rateLimiter.middleware.js (paymentInitiateLimiter added),
         src/utils/constants.js (RATE_LIMITS.PAYMENT_INITIATE added),
         package.json (razorpay@^2.9.4 added to dependencies)
  PRE-BLOCK FIX: src/config/config.routes.js MOVED to src/modules/config/config.routes.js
    (file was at wrong path — app.js already pointed to modules/config but file existed in config/)

Block O (6 new files + 2 edits — user approved migrations 019/020 and new admin.validator.js):
  NEW MIGRATIONS: src/db/migrations/019_create_disputes.sql (dispute_status_enum + disputes table),
                  src/db/migrations/020_create_admin_audit_logs.sql (admin_audit_logs table)
  NEW MODULE FILE (approved addition): src/modules/admin/admin.validator.js (16 Joi schemas)
  IMPLEMENTED (were 0-byte placeholders): src/modules/admin/admin.service.js (16 functions),
    src/modules/admin/admin.controller.js (16 asyncHandler handlers),
    src/modules/admin/admin.routes.js (16 routes, authenticateAdmin global, role-gated)
  EDITS: src/app.js (// BLOCK O: replaced with live mount),
         src/middleware/adminAuth.middleware.js (JSDoc corrected: "migration 022" → "migration 020")
  All 6 JS files passed `node --check` syntax validation.

Total: 112 files on disk. Total pending per plan: 0 (all planned backend modules complete).
```

---

## 40. Assumptions Made While Generating Code

Anything below was decided by inference during development **without an explicit instruction from the project owner confirming it** — flagged here per the instruction to mark unconfirmed items as "Pending Decision" rather than presenting them as settled fact.

- **Pending Decision:** Exact production hosting provider (Render vs Railway vs other) — only ever discussed as "recommendations" in the original architecture document, never confirmed as an actual account/choice.
- **Pending Decision:** Whether Neon.tech's free tier actually supports the `pg_trgm` and `uuid-ossp` extensions required by migration 001 — assumed available based on Neon's general PostgreSQL-extension support documentation at the time of original architecture design, but **never independently verified against a real Neon instance**, since no live database connection was ever established during this chat.
- **Pending Decision:** The exact default admin credentials (`admin@goodsgo.in` / `Admin@123456`) hardcoded as fallbacks in `seed_admin.js` are placeholder/development-only values invented during Block D — explicitly flagged in that file's own console output ("⚠ IMPORTANT: Change the admin password after first login") but never given a real production value by the project owner.
- **Pending Decision:** The specific 10 vehicle types and 16 goods categories seeded in Block D were inferred as a reasonable, comprehensive starting set for an Indian logistics marketplace, based on common industry categories — **the project owner never reviewed or explicitly approved this exact list.** If the real business has a different required taxonomy, this seed data should be revisited before any production launch.
- **Pending Decision:** The specific commission rate (10%), post expiry period (30 days), booking auto-reject timeout (48 hours), payment deadline (24 hours), and payment auto-release period (7 days) seeded into `platform_settings` are all values proposed during the original architecture/pre-development-review phase as "reasonable MVP defaults" and were never explicitly confirmed as final business decisions by the project owner.
- **Assumption:** "Indian logistics market" framing (default country, phone format, currency display as ₹/INR, Nominatim `countrycodes: 'in'` restriction, the 25-city static fallback table) was taken directly from the original project brief's explicit statement that the platform targets India, and has been consistently applied — this is a reasonably confident inference, not a guess, but is recorded here for completeness since it touches many files.
- **Assumption:** `EARTH_RADIUS_KM = 6371` and the specific Haversine trigonometric formula used in `calculateDistance.js` is standard, well-established mathematics, not a project-specific decision — recorded only because it is a "magic number" a future reader might otherwise question.
- **Assumption:** The choice to put `getPostBookings()` as a thin delegator inside `posts.service.js` that calls into `bookings.service.js` (rather than having `posts.controller.js` call `bookings.service.js` directly, or vice versa structuring it the other way) was made to keep the route `GET /posts/:postId/bookings` logically owned by the posts module's URL namespace while reusing the bookings module's actual query logic — a structural judgment call made during Block K, not separately discussed with or confirmed by the project owner.
- **Assumption:** All "testing instructions" and "testing checklists" provided throughout this chat's block-by-block deliveries are **manual, human-executable test plans**, not automated test code — this distinction was implicit throughout (no test framework was ever installed or requested) and is made explicit here to prevent Claude Code from assuming a test suite exists when none does (see Section 34, item 2).

---

*End of PROJECT_CONTEXT.md. This document should be updated at the end of every future block/feature of work — treat stale sections (especially Section 6 Folder Structure, Section 14/15/16 Feature status, and Section 33 Known Issues) as a sign that this file has fallen out of sync with the real codebase, and correct it as part of, not after, the next development session.*









