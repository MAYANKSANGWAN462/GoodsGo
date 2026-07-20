# GoodsGo — Services & Infrastructure Deep Dive

> External services, SDKs, and infrastructure explained from beginner to
> production level: what each is, why GoodsGo needs it, its lifecycle in this
> codebase, config, failure handling, limits, alternatives, and when to replace
> it. Also: the Socket.IO internals deep dive and the full environment-variable
> catalogue.

Each service follows the same template: **What → Why here → Lifecycle in code →
Config → Limits/pricing → Failure & recovery → Alternatives & when to replace.**

---

## 1. Razorpay (payments)

**What.** An India-first payment gateway: accepts UPI, cards, netbanking, and
wallets; provides Orders, Payments, Refunds, and Webhooks APIs. No monthly fee;
per-transaction pricing.

**Why here.** GoodsGo runs an **escrow** model: the shipper pays on booking
acceptance, the platform holds the funds and records its commission, and funds are
released to the transporter on completion (or refunded on dispute). Razorpay is the
rail that moves the money; the `payments` table is the ledger.

**Lifecycle in code** (`payments.service.js`):
1. **Order creation** (`initiatePayment`): validates the caller is the shipper,
   the booking is `accepted` and within `payment_deadline`; creates a Razorpay
   **order** for `amount×100` paise; inserts a `payments` row (`pending`,
   `gateway_order_id`); returns `{ orderId, amount, currency, key, paymentRowId }`.
2. **Checkout:** the frontend opens Razorpay's Standard Checkout with
   `RAZORPAY_KEY_ID` (public) and the order; the user pays.
3. **Verification** (`verifyPayment`): the client posts
   `{ orderId, paymentId, signature }`; the server recomputes
   `HMAC-SHA256(orderId|paymentId, RAZORPAY_KEY_SECRET)` and compares with
   `crypto.timingSafeEqual`; marks the payment `completed` (transaction), emits
   `PAYMENT_STATUS_CHANGED`, notifies. Idempotent.
4. **Webhook** (`handleWebhook`): Razorpay independently POSTs
   `payment.captured` / `payment.failed` / `refund.processed` to
   `/payments/webhook`; the server verifies HMAC over the **raw body** vs
   `RAZORPAY_WEBHOOK_SECRET` and applies the state change idempotently. **Always
   returns 200** so Razorpay's retry logic doesn't hammer on errors. This is the
   safety net if the browser closes before `/verify`.
5. **Release/Refund:** admin-only (`releasePayment`, `refundPayment`). Refund
   calls the Razorpay refund API; release currently records the escrow release
   (actual payouts are manual / via Razorpay Route/Dashboard at current scope).

**Config.** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
Test keys for dev; live keys after KYC. Webhook events to subscribe:
`payment.captured`, `payment.failed`, `refund.processed`.

**Security.** HMAC on both paths, `timingSafeEqual`, **fail closed** if secrets
absent, `gateway_payment_id UNIQUE` for dedup, server-computed amounts only. See
SECURITY_GUIDE § 8.

**Limits/pricing.** Per-transaction fee; requires Razorpay KYC for live mode;
Indian entity/bank account needed for settlements.

**Failure & recovery.** Order-create failure → 502 to the client (retryable).
Webhook down/lost → the `/verify` path still completes the payment; conversely if
`/verify` is missed, the webhook completes it. Refund API failure → 502, admin
retries. If Razorpay is fully down, new payments can't be initiated but existing
bookings/chat continue (payments are decoupled from booking state up to the pay
step). See FAILURE_ANALYSIS § payment gateway.

**Alternatives & when to replace.** Stripe (weaker India domestic/UPI), Cashfree,
PhonePe, PayU. The gateway is isolated in `payments.service`, so a swap is
contained. Replace if expanding beyond India or if fees/routing demand
multi-gateway.

---

## 2. Cloudinary (media)

**What.** A media platform: upload API, storage, on-the-fly image transformations
(resize/crop/format/quality), a global CDN, and signed-URL access control.

**Why here.** GoodsGo needs avatars, post images, chat images, and private KYC
documents — stored, optimized, and delivered fast worldwide. Cloudinary replaces
"S3 + CloudFront + an image pipeline" with one service on a usable free tier.

**Lifecycle in code** (`utils/uploadImage.js`, `config/cloudinary.js`):
- **Upload:** Multer buffers the file **in memory** → `verifyMagicBytes` confirms
  the real file type → EXIF stripped (`flags:strip_profile`, privacy) → resized
  per asset type (avatars 400×400 face-crop; posts ≤1200×900; chat ≤1200×900; KYC
  ≤2000×2000, `type:private`) with `quality:auto`/`fetch_format:auto` → streamed
  to a folder (`goodsgo/avatars|posts|chat|kyc`). The DB stores `secure_url` +
  `public_id`.
- **Delivery:** the frontend builds optimized URLs (`utils/cloudinaryUrl.js`,
  `f_auto/q_auto/w_`) with `loading="lazy"`.
- **Delete/replace:** `deleteImage(public_id)` (logs, never throws — a Cloudinary
  error must not abort the primary DB op; orphans can be swept later). Avatars
  overwrite by `public_id` to save quota.
- **Private KYC:** `generateSignedUrl` issues time-limited signed URLs; public
  URLs are never used for the KYC folder.

**Config.** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`;
`secure:true` (HTTPS URLs). Missing creds → warn at boot, uploads fail clearly.

**Limits/pricing.** Free tier caps monthly credits (storage + transforms +
bandwidth). Heavy image traffic will exhaust it → paid tier.

**Failure & recovery.** Upload failure surfaces as a 4xx/5xx to the client
(retryable); the DB write is gated on a successful upload, so no dangling rows.
Delete failure is swallowed (orphan cleanup is a future sweep job). If Cloudinary
is down, image uploads fail but text flows continue.

**Alternatives & when to replace.** AWS S3 (+ CloudFront + Lambda/Sharp for
transforms), Firebase Storage, Azure Blob, imgix/Imagekit. Replace if bandwidth
cost dominates or you need to consolidate on AWS. Migration cost: re-upload +
rewrite the stored `public_id`s/URLs.

---

## 3. Sentry (error monitoring & tracing)

**What.** Application monitoring: captures exceptions with stack traces, groups
them, tracks releases, supports source maps and performance tracing/breadcrumbs,
and alerts.

**Why here.** A production app with money and real-time flows needs to *know* when
something breaks in a user's browser or on the server, with enough context to fix
it, without shipping verbose logs.

**Lifecycle in code.**
- **Backend** (`server.js`): `Sentry.init` runs **before all other requires** so
  its OpenTelemetry integration auto-instruments `http` and `pg`.
  `tracesSampleRate` is 0.1 in prod (stay in free tier), 1.0 in dev.
  `Sentry.setupExpressErrorHandler(app)` runs **before** the global error handler
  so Sentry sees the raw error. **Entirely no-op without `SENTRY_DSN`** (dev/CI).
- **Frontend** (`@sentry/react` + `@sentry/vite-plugin`): the Vite plugin uploads
  source maps on production builds *and deletes the `.map` files from `dist`* so
  maps are never shipped to users; only active when `SENTRY_AUTH_TOKEN` is set.

**Config.** Backend: `SENTRY_DSN`. Frontend: `VITE_SENTRY_DSN`, and build-time
`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

**Limits/pricing.** Free tier caps monthly events; sampling keeps trace volume
bounded.

**Failure & recovery.** Sentry being unavailable never affects request handling
(capture is best-effort/async). Missing DSN → monitoring silently disabled.

**Alternatives.** Datadog / New Relic (heavier, metrics+APM, pricier),
Grafana + Prometheus + Loki (self-host, metrics-first), LogRocket (session
replay). Sentry is the best error-first fit at this scale; add metrics/APM later.

---

## 4. Neon.tech (PostgreSQL)

**What.** Serverless, managed PostgreSQL with instant provisioning, database
branching, autoscaling compute, and standard `pg` wire compatibility.

**Why here.** A real Postgres (all the features in DATABASE_GUIDE) on a free tier,
with SSL, no server to manage.

**Lifecycle in code.** `config/database.js` builds a `pg.Pool` from
`DATABASE_URL` with SSL in production; `query()`/`getClient()` are the only DB
entry points; `checkConnection()` powers `/health`. Migrations run on deploy
(`railway.json` start command).

**Config.** `DATABASE_URL` (SSL connection string), `DB_POOL_MIN/MAX` (max
defaults to 10 = Neon free-tier connection ceiling).

**Limits.** Free tier: **10 concurrent connections**, limited compute/storage,
and compute may **auto-suspend when idle** (first query after idle pays a cold
wake). These shape pool size and the "first request slow" behavior.

**Failure & recovery.** Pool `error` events are logged; the pool reconnects
automatically. `/health` returns 503 when the DB is unreachable (load balancers
back off). Graceful shutdown drains the pool. See FAILURE_ANALYSIS § DB
unavailable.

**Alternatives.** Supabase (bundles more than we need), AWS RDS / Cloud SQL
(powerful, paid, more ops), self-hosted Postgres. Move to Neon paid (pooling +
replicas) or RDS when connections/compute cap out.

---

## 5. Email (Gmail API → Brevo → SMTP)

**What.** Transactional email: verification links, password resets, welcome,
booking event notifications.

**Why the fallback chain.** Free hosts (Render/Railway) **block outbound SMTP
ports (25/465/587)** to prevent spam — so plain nodemailer SMTP times out in
production. `config/email.js` `sendMail()` therefore picks a provider by
configuration:
1. **Gmail API (OAuth2 over HTTPS, port 443)** — preferred: works where SMTP is
   blocked, and a `gmail.com` sender gets perfect deliverability (Google itself
   sends it, so SPF/DKIM/DMARC align). Uses `GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN`;
   caches the short-lived access token until ~5 min before expiry.
2. **Brevo (HTTP API, port 443)** — fallback: 300 emails/day free to any recipient.
3. **SMTP (nodemailer)** — local dev (Gmail app password), or any host that allows
   SMTP.

**Lifecycle in code.** Emails are sent via `setImmediate` (fire-and-forget) from
`auth.service` and notification flows so they never block the API response. HTML
templates live in `utils/emailTemplates/*.html`; `utils/sendEmail.js` provides
`sendVerificationEmail` / `sendPasswordResetEmail` / `sendWelcomeEmail`.
`verifyEmailConnection()` runs at startup to surface SMTP misconfig early (it does
not block boot). `/auth/diagnose-email` reports provider status (remove in prod).

**Config.** Gmail: `GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN` (+ `EMAIL_USER` sender).
Brevo: `BREVO_API_KEY`. SMTP: `EMAIL_HOST/PORT/SECURE/USER/PASS/FROM`.

**Failure & recovery.** Send failures are logged, not surfaced to the user (they
don't block the flow — e.g. registration still succeeds even if the verification
email fails; the user can resend). Publish the Google OAuth app to **production**
so the refresh token doesn't expire every 7 days (a lesson learned during
deployment).

**Alternatives.** AWS SES, SendGrid, Mailgun, Postmark — a dedicated ESP with a
verified sending **domain** is the right move at volume (better deliverability,
higher quotas, DKIM on your own domain).

---

## 6. Socket.IO — internals deep dive (Section I/B real-time)

**What it is.** A real-time bidirectional library on top of the WebSocket
protocol (with an HTTP long-poll fallback), adding rooms, acknowledgements,
automatic reconnection, and heartbeats — things raw WebSocket makes you build.

**Connection lifecycle & handshake.**
1. The client opens an **Engine.IO** session: an HTTP request negotiates
   transport. With `transports:['websocket','polling']`, it tries WebSocket
   first; if a proxy/firewall blocks the WS upgrade, it falls back to HTTP
   long-polling.
2. **Upgrade:** if it started on polling, Engine.IO upgrades to a persistent
   WebSocket (`allowUpgrades:true`).
3. **Application auth:** GoodsGo does **not** authenticate at the handshake — the
   socket connects *unauthenticated*, then the client emits `authenticate {token}`.
   `socket.handler.js` verifies the JWT, does a live DB check, sets `socket.userId`,
   joins the `user:<id>` room, and only then registers chat/notification handlers.
   Failing auth emits `auth_error` and disconnects.

**Rooms & namespaces.** GoodsGo uses the **default namespace** and two room
conventions: `user:<uuid>` (per user; every device/tab joins; targets for
notifications and status pushes) and `conv:<uuid>` (per conversation; both
participants join on open; targets for messages/typing/read). `emitToUser` /
`emitToConversation` centralize the naming.

**Events.** All event names are constants (`SOCKET_EVENTS`) to prevent
client/server typos. Client→server events (`send_message`, `typing_*`,
`mark_read`, `messages_read`, `join/leave_conversation`) each re-verify ownership
against the DB — the client payload is never trusted. Server→client events
(`new_message`, `notification`, `*_status_changed`, `user_updated`, …) are pushed
by services via the room helpers.

**Reconnect logic.** socket.io-client auto-reconnects with backoff; on reconnect
the client re-emits `authenticate` and re-`join`s open conversations (rooms are
lost on disconnect). Because messages are also persisted in the DB and fetched via
REST, a missed live event is recovered on the next history fetch — the socket is
an accelerator, not the source of truth.

**Heartbeats.** `pingInterval:25s` / `pingTimeout:60s`: the server pings every
25s; if no pong within 60s the client is declared dead and the socket is cleaned
up (rooms auto-removed).

**Payload safety.** `maxHttpBufferSize:1MB` caps message size (large-payload DoS
defence). Image messages are **not** sent over the socket — they go through the
REST + Cloudinary path; socket `send_message` forces `type:'text'`.

**Scaling challenges (why it's a scale risk).** Socket.IO state (which socket is
in which room) is **in the process memory of one instance**. With multiple backend
instances behind a load balancer:
- You need **sticky sessions** (so a client's polling/WS requests keep hitting the
  same instance), and
- The **Redis adapter** (`@socket.io/redis-adapter`) so an `emitToUser` on
  instance A reaches that user's socket on instance B.
Neither exists yet (single instance). This is the primary blocker to horizontal
scaling — see SCALABILITY_GUIDE and ADR-004/ADR-011.

**Future scalability.** Add Redis adapter + sticky sessions; later, consider a
dedicated real-time tier or managed realtime (Ably/Pusher) if connection counts
dominate.

**Alternatives.** Raw `ws` (lighter, DIY everything), SSE (server→client only),
managed realtime (Ably/Pusher/Supabase Realtime).

---

## 7. Nominatim / OpenStreetMap (geocoding)

**What.** A free forward/reverse geocoding API over OpenStreetMap data.
**Why here.** Turn addresses into coordinates (and back) for post locations and
nearby search, at zero cost. **Lifecycle:** `location.service` calls Nominatim;
`utils/calculateDistance` computes Haversine radius filters in SQL.
**Limits/risks:** Nominatim's public endpoint has a **strict usage policy** (≈1
req/s, required User-Agent, no heavy bulk use). At scale this is a hard limit →
self-host Nominatim or switch to a paid geocoder (Google/Mapbox/HERE) and cache
results. See FAILURE_ANALYSIS.

---

## 8. GitHub + GitHub Actions (source + CI)

Covered in depth in [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md). In short: source
of truth + three CI workflows (backend syntax-check/audit, frontend lint/build/
audit, weekly security audit). Vercel and Render/Railway deploy via their **native
Git integration**, not through Actions (no CD workflow yet).

---

## 9. Environment variables (Section J) — full catalogue

Documented from `.env.example`. **Never commit real values.** The server exits at
startup if any **Required** var is missing.

| Variable | Req? | Purpose | Read by | If missing |
|---|---|---|---|---|
| `NODE_ENV` | ✅ | `development`/`production` — toggles SSL, CORS strictness, cookie flags, logging | everywhere | server exits |
| `PORT` | ✅ | HTTP port (dev proxy expects 5000) | `server.js` | server exits |
| `DATABASE_URL` | ✅ | Postgres SSL connection string | `config/database.js` | server exits |
| `JWT_SECRET` | ✅ | User access-token secret | `generateTokens` | server exits |
| `JWT_REFRESH_SECRET` | ✅ | Refresh-token secret (distinct) | `generateTokens` | server exits |
| `JWT_ADMIN_SECRET` | ✅ | Admin-token secret (distinct) | `generateTokens` | server exits |
| `JWT_EXPIRES_IN` | – | Access TTL (default `15m`) | `generateTokens` | defaults |
| `JWT_REFRESH_EXPIRES_IN` | – | Refresh TTL (default `7d`) | `generateTokens` | defaults |
| `JWT_ADMIN_EXPIRES_IN` | – | Admin TTL (default `8h`) | `generateTokens` | defaults |
| `FRONTEND_URL` | – | CORS/CSP origin + email link base (default `localhost:5173`) | `app.js`, `socket.js`, `auth.service` | localhost default |
| `DB_POOL_MIN` / `DB_POOL_MAX` | – | Pool bounds (max default 10) | `config/database.js` | defaults |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | – | Media credentials | `config/cloudinary.js` | uploads fail (warns at boot) |
| `EMAIL_HOST/PORT/SECURE/USER/PASS/FROM` | – | SMTP settings | `config/email.js` | SMTP path unavailable |
| `BREVO_API_KEY` | – | Brevo HTTP email fallback | `config/email.js` | Brevo path skipped |
| `GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN` | – | Gmail API (preferred email path) | `config/email.js` | Gmail path skipped |
| `RAZORPAY_KEY_ID` | – | Razorpay public key (also sent to client) | `payments.service` | payments unavailable |
| `RAZORPAY_KEY_SECRET` | – | Razorpay secret (HMAC) | `payments.service` | verify **fails closed** |
| `RAZORPAY_WEBHOOK_SECRET` | – | Webhook HMAC secret | `payments.service` | webhook **fails closed** |
| `ADMIN_EMAIL/PASSWORD/FULL_NAME` | – | Initial super-admin seed | `seed_admin.js` | seed uses placeholders (**override & rotate**) |
| `SENTRY_DSN` | – | Backend error monitoring | `server.js`, `app.js` | monitoring disabled |
| `BOOKING_AUTO_REJECT_HOURS` | – | Cron auto-reject window (default 48) | `expirePosts.job.js` | defaults |
| `VITE_API_URL` (frontend) | – | Backend origin (empty = dev proxy) | frontend build | dev proxy / broken prod |
| `VITE_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` (frontend) | – | Frontend Sentry + source-map upload | Vite build | monitoring/maps disabled |

Security levels: the JWT secrets, `DATABASE_URL`, `*_KEY_SECRET`,
`*_WEBHOOK_SECRET`, `GMAIL_*`, `EMAIL_PASS`, and `ADMIN_PASSWORD` are **high
sensitivity** — treat any exposure as a rotation trigger (SECURITY_GUIDE § 10).
`RAZORPAY_KEY_ID` and `VITE_*` are intentionally public.
