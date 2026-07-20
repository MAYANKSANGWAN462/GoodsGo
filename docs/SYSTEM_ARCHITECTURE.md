# GoodsGo — System Architecture

> Companion to [ENGINEERING_HANDBOOK.md](./ENGINEERING_HANDBOOK.md). This
> document covers **Phase 2 (complete architecture)** and **Phase 3 (folder
> structure, recursively)**.

---

## 1. The 10,000-foot view

GoodsGo is a **modular monolith** with a decoupled SPA front end. One Node
process serves the REST API, the WebSocket layer, and the cron scheduler on a
single port. State lives in one PostgreSQL database (Neon). Binary media lives in
Cloudinary. Money moves through Razorpay. Errors flow to Sentry. Email flows
through a provider fallback chain.

```
                          ┌──────────────────────────────┐
                          │         User's Browser        │
                          │  React 19 SPA (Vite build)    │
                          │  Zustand + TanStack Query      │
                          └───────────────┬──────────────┘
                                          │ HTTPS
              REST (Axios) ───────────────┼─────────────── WebSocket (socket.io-client)
                                          │
                          ┌───────────────▼──────────────┐
                          │   Vercel (static hosting +    │
                          │   SPA rewrites + edge cache)  │
                          └───────────────┬──────────────┘
                                          │  VITE_API_URL → backend origin
                                          ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │                Render / Railway  —  Node.js process (server.js)            │
   │                                                                            │
   │  ┌─────────────┐   HTTP    ┌────────────────────────────────────────────┐ │
   │  │ http.Server │◀─────────▶│ Express app (app.js)                        │ │
   │  └──────┬──────┘           │  helmet → cors → compression → morgan →     │ │
   │         │                  │  json/urlencoded → sanitize → rate limit →  │ │
   │         │ shares port      │  /health → /api/v1/* routers → 404 →        │ │
   │         │                  │  Sentry err handler → global error handler  │ │
   │         │                  └────────────────────────────────────────────┘ │
   │  ┌──────▼───────────────┐   Each router: routes → middleware →            │
   │  │ Socket.IO (config/   │            controller → service → DB            │
   │  │ socket.js singleton) │                                                 │
   │  │  rooms: user:<id>,   │   ┌───────────────────────────────────────────┐ │
   │  │  conv:<id>           │   │ node-cron (jobs/expirePosts.job.js)        │ │
   │  └──────────────────────┘   │  hourly: expire posts + auto-reject books  │ │
   │                             └───────────────────────────────────────────┘ │
   └───────┬───────────────┬───────────────┬───────────────┬──────────────────┘
           │ pg pool       │ SDK           │ SDK           │ HTTPS
           ▼               ▼               ▼               ▼
   ┌──────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐
   │ Neon Postgres│ │ Cloudinary  │ │  Razorpay   │ │ Email: Gmail API /    │
   │ (SSL, pooled)│ │ (images/CDN)│ │ (payments)  │ │ Brevo / SMTP fallback │
   └──────────────┘ └─────────────┘ └─────────────┘ └──────────────────────┘
                                          │
                                          ▼ webhooks (payment.captured, …)
                                    back to /api/v1/payments/webhook

   Cross-cutting: Sentry (@sentry/node backend, @sentry/react frontend)
   captures errors + traces from both tiers.
```

### Why this shape?

- **Monolith, not microservices.** At MVP scale, one deployable is dramatically
  cheaper to build, reason about, and operate. Domain boundaries are enforced in
  *code* (the `modules/` folders) so a later extraction is mechanical, not a
  rewrite. (ADR-001 in TECHNOLOGY_DECISIONS.)
- **Socket.IO shares the HTTP port.** `server.js` creates one `http.Server` from
  the Express app and hands it to Socket.IO. No second port, no second process,
  no cross-service auth. The tradeoff: horizontal scaling later needs the Redis
  adapter + sticky sessions (see SCALABILITY_GUIDE).
- **In-process cron.** `node-cron` runs inside the web process. Simple and free;
  the tradeoff is that with >1 instance the job runs N times (idempotency saves
  correctness but wastes work) — the fix at scale is a single worker or a
  distributed lock.
- **SPA + API split.** The frontend is a static bundle on a CDN (Vercel); the
  backend is a stateful Node process. They communicate only over HTTPS + WSS.
  This keeps the front end infinitely cacheable and the back end simple.

---

## 2. The request lifecycle (REST)

Trace a representative authenticated write — `POST /api/v1/bookings`:

```
1.  Browser: usePosts/useBookings hook calls bookings.service.js (frontend)
2.  Axios request interceptor attaches: Authorization: Bearer <accessToken>
    (access token held in memory in Zustand, NOT localStorage)
3.  Vercel serves SPA; the XHR goes to VITE_API_URL (the backend origin)
4.  Express middleware chain (order matters — see app.js):
      helmet (security headers)
      cors (origin allow-list; credentials:true for the refresh cookie)
      compression (gzip responses > 1 kB)
      morgan (request log)
      express.json({ limit: '10kb', verify → captures rawBody for /webhook })
      sanitizeInputs (strip HTML/null bytes, block prototype pollution)
      apiLimiter (100 req/min/IP on /api/*)
5.  Router: bookings.routes.js
      authenticate         → verifies JWT (JWT_SECRET), loads user from DB,
                             rejects suspended/deleted (closes the 15-min window)
      requireEmailVerified → 403 if email not verified
      bookingLimiter       → 10/hour per USER (keyed on req.user.id)
      validate(schema)     → Joi: strip unknown, coerce, collect all errors
      controller.createBooking (wrapped in asyncHandler)
6.  Controller: thin. Pulls req.user.id + req.body, calls the service.
7.  Service: bookings.service.createBooking — the business logic:
      loads post, checks "not own post" + "post active",
      INSERT booking (DB partial-unique index blocks duplicate active booking),
      transaction: insert status-history row,
      emitToUser(owner, 'booking_status_changed', …)  (Socket.IO)
      setImmediate(notify(owner))                       (async notification+email)
8.  Response: res.status(201).json(new ApiResponse(201, 'Created.', booking))
9.  Any thrown ApiError → asyncHandler → global errorHandler → JSON envelope
10. Sentry captures unexpected (non-operational) errors
11. Frontend: Axios response interceptor unwraps the { success, data, … } envelope;
    TanStack Query caches it; a 401 TOKEN_EXPIRED triggers a silent refresh-token call
```

### The response envelope

Every success uses `ApiResponse`:

```json
{ "success": true, "statusCode": 201, "message": "Created.", "data": { … }, "meta": { … } }
```

Every error uses the `errorHandler` shape:

```json
{ "success": false, "message": "…", "code": "MACHINE_CODE", "errors": [ { "field": "email", "message": "…" } ] }
```

The frontend's single Axios interceptor unwraps this once, so no call site parses
the envelope by hand.

---

## 3. The real-time lifecycle (Socket.IO)

Socket.IO is **authenticated by an application-level event, not the handshake**:

```
1.  Client connects (socket.io-client). Socket starts UNAUTHENTICATED.
2.  Client emits 'authenticate' { token: <accessToken> }.
3.  socket.handler.js:
      verifyAccessToken(token)                 (JWT_SECRET)
      live DB check: user active & not deleted  (mirrors auth.middleware)
      socket.userId = decoded.id
      socket.join('user:<userId>')             (personal notification room)
      emit 'authenticated'
      register chat + notification handlers ON THIS SOCKET
4.  Every domain handler starts with `if (!socket.userId) return` (belt-and-suspenders).
5.  Chat: client emits 'join_conversation' → server re-verifies participant in DB →
      socket.join('conv:<id>'). 'send_message' inserts the row, updates the
      conversation preview, and io.to('conv:<id>').emit('new_message', …).
6.  Notifications flow server→client: any service calls
      notifications.service.createNotification → emitToUser(userId, 'notification', …)
      which targets the 'user:<id>' room (all the user's tabs/devices).
7.  Disconnect: Socket.IO auto-removes the socket from all rooms. No manual cleanup.
```

Rooms:
- `user:<uuid>` — one per user; every device/tab of that user joins it; used for
  notifications and booking/payment status pushes.
- `conv:<uuid>` — one per open conversation; both participants join it; used for
  messages, typing indicators, read receipts.

Health parameters (`config/socket.js`): `pingInterval 25s`, `pingTimeout 60s`,
`maxHttpBufferSize 1 MB`, transports `['websocket','polling']` (WebSocket first,
long-poll fallback for hostile proxies).

Full internals — handshake, upgrade, heartbeats, reconnection, scaling with the
Redis adapter + sticky sessions — are in
[SERVICES_AND_INFRASTRUCTURE.md § Socket.IO](./SERVICES_AND_INFRASTRUCTURE.md).

---

## 4. Component-by-component interactions

### Frontend ↔ API
Axios over HTTPS. Access token in memory (Zustand `useAuthStore`); refresh token
in an httpOnly cookie the browser sends automatically to `/api/v1/auth/*`. In
local dev the Vite proxy forwards `/api` and `/socket.io` to `localhost:5000`,
avoiding cross-origin cookie friction.

### API ↔ Database
`pg` connection **pool** (`config/database.js`, max 10 — sized to Neon's free
tier). Two access patterns: `query(text, params)` for autocommit statements, and
`getClient()` for explicit `BEGIN/COMMIT/ROLLBACK` transactions (used by
accept/cancel/complete/pay flows and anything touching multiple tables). Slow
queries (>100 ms) are logged in dev. SSL is required in production.

### API ↔ Cloudinary
Multer buffers uploads **in memory** (never disk). `utils/uploadImage.js`
verifies **magic bytes** (not just the declared MIME), strips EXIF, resizes per
asset type, and streams the buffer to Cloudinary. The DB stores the `secure_url`
+ `public_id` (the public_id is required to delete/replace later). KYC docs go to
a **private** folder accessed only via signed URLs.

### API ↔ Razorpay
On booking accept the amount + commission split are snapshotted onto the booking.
On pay, `payments.service.initiatePayment` creates a Razorpay **order**; the
frontend opens the checkout widget with `RAZORPAY_KEY_ID`; on success the client
posts the signature to `/payments/verify` which recomputes
`HMAC-SHA256(order|payment, KEY_SECRET)` with `timingSafeEqual`. Independently,
Razorpay calls `/payments/webhook` (HMAC over the **raw** body) as a second,
authoritative confirmation path. Refunds go back through the SDK.

### API ↔ Socket.IO
Services never import the Socket.IO server directly beyond the two thin helpers
`emitToUser` / `emitToConversation` in `config/socket.js`. This centralizes the
room-naming convention and makes the socket layer swappable.

### API ↔ Sentry
Initialized first in `server.js` (before other requires) so its OpenTelemetry
integration can auto-instrument `http` and `pg`. `Sentry.setupExpressErrorHandler`
runs *before* the app's error handler so Sentry sees raw errors. Entirely no-op
when `SENTRY_DSN` is unset (dev/CI).

### API ↔ Email
`config/email.js` `sendMail()` picks a provider by configuration:
**Gmail API (OAuth2 over HTTPS)** → **Brevo (HTTPS)** → **SMTP (nodemailer)**.
The HTTPS providers exist because free hosts (Render/Railway) block outbound SMTP
ports. Emails are sent via `setImmediate` (fire-and-forget) so they never block
the API response.

### API ↔ Cron
`jobs/expirePosts.job.js` runs on startup and hourly at `:05`. It (a) expires
posts past `expires_at` and warns those expiring within 24h, and (b) auto-rejects
`pending` bookings older than `BOOKING_AUTO_REJECT_HOURS`, writing history rows
and firing notifications.

---

## 5. Folder Structure (Phase 3) — recursive tour

### 5.1 Backend — `goodsgo-backend/`

```
goodsgo-backend/
├── server.js          # Process entry: env validation, Sentry, http.Server,
│                      #   Socket.IO attach, socket handlers, cron start,
│                      #   graceful shutdown, unhandled-rejection guards.
├── src/
│   ├── app.js         # Express app: middleware chain, /health, route mounting,
│   │                  #   404, Sentry + global error handler. Exports app only.
│   ├── config/        # Adapters to the outside world (DB, Socket, email, media)
│   ├── middleware/    # Cross-cutting request concerns (auth, validate, limit, …)
│   ├── utils/         # Pure helpers + shared classes + constants + email templates
│   ├── db/            # migrations/ (SQL), seeds/ (JS), migrate.js (runner)
│   ├── jobs/          # node-cron scheduled maintenance
│   ├── socket/        # Socket.IO event handlers (auth lifecycle, chat, notif)
│   └── modules/       # One folder per business domain (the heart of the app)
├── .env / .env.example
├── railway.json       # Nixpacks build + start "npm run migrate && npm start"
├── package.json
└── (diagnostic scripts: e2e-test.js, check-*.js, test-db.js, purge-test-data.js)
```

**Why `server.js` and `src/app.js` are separate.**
`app.js` exports a *pure Express app* with no side effects (no `listen`, no
sockets, no cron). `server.js` wires the runtime around it. This separation means
`app` can be imported by an integration test and exercised with `supertest`
without opening a port, starting cron, or connecting sockets. It also isolates
"what the app *is*" (routes + middleware) from "how the process *runs*"
(lifecycle, signals, monitoring).

#### `src/config/` — why it exists
Every file here is the **single configured instance** of an external dependency,
exported as a singleton so the rest of the app never re-configures it.

- `database.js` — the `pg` Pool + `query` / `getClient` / `checkConnection`.
  *Responsibility:* own all DB connectivity and the parameterized-query
  discipline. Everything that touches Postgres imports from here.
- `socket.js` — `initSocket` (called once in `server.js`), `getIO`, and the
  `emitToUser` / `emitToConversation` room helpers. *Responsibility:* own the
  Socket.IO server singleton and the room-naming convention.
- `email.js` — the provider-fallback `sendMail` + SMTP transporter + Gmail OAuth
  token cache + Brevo client. *Responsibility:* own "how a byte of email leaves
  the building," independent of *what* the email says.
- `cloudinary.js` — configures and exports the Cloudinary v2 SDK once.
  *Responsibility:* own media-service credentials. No other file calls
  `cloudinary.config()`.

*Communicates with:* `utils/` (constants) and is consumed by `modules/*` services
and `socket/*`.

#### `src/middleware/` — why it exists
Concerns that apply across many routes, factored out so route files stay
declarative. See PROJECT_DEEP_DIVE for each file; the set is: `auth`
(user JWT + email-verified guard), `adminAuth` (admin JWT + role hierarchy +
audit logger), `rateLimiter` (per-endpoint limiters), `validate` (Joi factory +
shared schemas), `upload` (Multer wrappers + file guards), `sanitize` (input
cleaning), `errorHandler` (the single global error formatter).
*Communicates with:* `utils/` (ApiError, constants) and `config/database` (the
auth middlewares do a live user/admin lookup).

#### `src/utils/` — why it exists
Pure, dependency-light helpers and shared classes with no HTTP knowledge, so they
are trivially testable and reusable:
`ApiError` / `ApiResponse` (the response contract), `asyncHandler` (promise
catch), `generateTokens` (JWT sign/verify/hash), `hashPassword` (bcrypt),
`generateOTP` (crypto tokens), `uploadImage` (Cloudinary upload + magic bytes),
`calculateDistance` (Haversine + SQL builder), `paginate`, `sendEmail`
(templated senders), `constants.js` (the frozen source of truth), and
`emailTemplates/*.html`.
*Communicates with:* `config/` (cloudinary, email) and is consumed everywhere.

#### `src/db/` — why it exists
Owns the *schema as code*. `migrations/001…020.sql` are plain SQL applied in
filename order by `migrate.js`; `seeds/*.js` populate reference tables + the
initial admin idempotently. Keeping migrations as raw SQL (not an ORM DSL) means
the schema is transparent and portable. See [DATABASE_GUIDE.md](./DATABASE_GUIDE.md).

#### `src/jobs/` — why it exists
Isolates *time-driven* work (as opposed to request-driven work) so it can later
be moved to a dedicated worker without touching request code.

#### `src/socket/` — why it exists
Isolates *event-driven* real-time work. `socket.handler.js` owns the connection +
auth lifecycle and delegates to `chat.socket.js` and `notification.socket.js`.
Handlers are registered *inside* the authenticate callback so they cannot exist
on an unauthenticated socket.

#### `src/modules/` — why it exists (and why it's split this way)
The application's business domains, each a self-contained vertical slice. Every
module (except tiny ones) has the **same four files**:

```
modules/<domain>/
  <domain>.routes.js      # HTTP surface: paths + middleware chains only
  <domain>.validator.js   # Joi schemas for this domain's inputs
  <domain>.controller.js  # Thin adapter: req/res ⇄ service; no business logic
  <domain>.service.js     # ALL business logic + SQL for this domain
```

Domains: `auth`, `users`, `posts`, `location`, `config`, `bookings`, `chat`,
`reviews`, `payments`, `notifications`, `admin`.

**Why separated by domain (not by layer)?** Grouping *by feature* keeps
everything you need to change one capability in one folder — the opposite of
"all controllers here, all models there," which scatters a single change across
the tree. It also makes the eventual microservice extraction a copy-paste of a
folder.

**Why the four-file split *within* a module?** It enforces the layering rule
mechanically:
- Routes can only *wire* middleware and controllers → no logic leaks into routing.
- Controllers can only *translate* HTTP ⇄ service calls → no SQL leaks into HTTP.
- Services own logic + SQL → the only place that talks to the DB → the only place
  you must audit for correctness and injection safety.
- Validators isolate input contracts → schemas are reusable and testable.

**How modules communicate.** Cross-module calls happen **service→service**, never
route→route. Examples: `users.routes` mounts sub-resource controllers from
`posts`, `bookings`, `chat`, `reviews`, `notifications`; `bookings.service` and
`payments.service` `require` `notifications.service` (lazily, to tolerate boot
order) and `config.service` (cached platform settings); `admin.service` delegates
payment actions to `payments.service`.

### 5.2 Frontend — `goodsgo-frontend/`

```
goodsgo-frontend/
├── index.html                # Vite entry HTML
├── vite.config.js            # React + Tailwind + Sentry plugins; dev proxy
├── vercel.json               # SPA rewrites, asset cache headers, security headers
├── eslint.config.js          # ESLint 9 flat config
└── src/
    ├── main.jsx              # Bootstraps React; eager theme init (no FOUC)
    ├── App.jsx               # Router + React.lazy route-level code splitting
    ├── index.css             # Tailwind + design tokens + dark mode + animations
    ├── assets/               # Logos, illustrations, placeholders
    ├── constants/            # routes, bookingStatuses, postTypes, vehicle/goods
    ├── context/              # AuthContext, SocketContext, NotificationContext
    ├── stores/               # Zustand: useAuthStore, useAdminStore, useSocketStore, useThemeStore
    ├── services/             # One Axios service file per backend module + api.js (interceptors)
    ├── hooks/                # TanStack Query wrappers: useAuth, usePosts, useBookings, useChat, …
    ├── components/           # Feature components + components/common/ design system
    ├── pages/                # Route pages (auth, marketplace, posts, bookings, chat, profile, admin, …)
    └── utils/                # formatters, validators, errorParser, cloudinaryUrl, storage, …
```

**Why this layout?**
- `services/` mirrors backend modules 1:1 so the API surface is discoverable and
  each file owns exactly the endpoints of one domain. `api.js` holds the shared
  Axios instance with the request interceptor (attach access token) and response
  interceptor (unwrap envelope, silent refresh on 401).
- `hooks/` wraps services in TanStack Query so components get caching,
  background refetch, loading/error state, and mutation invalidation for free —
  components never call Axios directly.
- `stores/` (Zustand) holds **client** state (auth token in memory, admin token
  in sessionStorage, theme in localStorage, socket instance). **Server** state is
  TanStack Query's job — the two are deliberately not mixed.
- `context/` provides app-wide singletons (the authenticated socket connection,
  the notification stream) to the tree.
- `components/common/` is the design system (Button, Card, Modal, Input, …) using
  semantic Tailwind tokens (`bg-surface`, `text-text`) so dark mode works
  automatically. Feature folders (`bookings/`, `chat/`, `posts/`, …) compose
  those primitives.
- `App.jsx` uses `React.lazy` + `Suspense` for **route-level code splitting**, so
  the initial bundle is a shell and each page loads on demand (measured: initial
  JS dropped from ~796 kB to ~454 kB, ~143 kB gzip; idle-prefetch warms the
  marketplace/login chunks).

**Guards** (`components/guards/`): `ProtectedRoute` (requires user auth),
`GuestRoute` (redirects logged-in users away from login/register), `AdminRoute`
(requires admin token). These map to the backend's three auth surfaces.

---

## 6. Data flow summary (who owns what state)

| State | Where it lives | Why |
|---|---|---|
| Access token | Frontend memory (Zustand) | XSS-safe-ish (not in localStorage); short-lived (15 min) |
| Refresh token | httpOnly cookie (browser) + SHA-256 hash (DB) | JS can't read it; DB breach can't replay it |
| Admin token | sessionStorage (frontend) | Survives reloads within a tab; 8h expiry; no refresh flow |
| Server/domain data | PostgreSQL (source of truth) + TanStack Query cache | One writer, cached reads, invalidated on mutation + socket events |
| Media | Cloudinary (URL + public_id in DB) | CDN delivery; DB keeps the pointer |
| Money state | `payments` table + Razorpay | DB is the ledger; Razorpay is the rail |
| Real-time presence | Socket.IO rooms (in memory) | Ephemeral; rebuilt on reconnect |
| Runtime config | `platform_settings` table (60s cached) | Admin-tunable without redeploy |

---

## 7. Where to go next

- Per-file and per-module detail → [PROJECT_DEEP_DIVE.md](./PROJECT_DEEP_DIVE.md)
- Schema → [DATABASE_GUIDE.md](./DATABASE_GUIDE.md)
- Endpoints & events → [API_REFERENCE.md](./API_REFERENCE.md)
- Why each technology → [TECHNOLOGY_DECISIONS.md](./TECHNOLOGY_DECISIONS.md)
