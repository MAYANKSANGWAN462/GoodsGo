# GoodsGo — Interview Preparation Guide (Phase 14)

> Every question this project can plausibly generate, categorized, with an **ideal
> answer**, a **deep explanation**, **follow-ups** the interviewer will ask next,
> **common mistakes**, and a **practical example** from the codebase. Answer from
> the real design — the strongest answers cite *why* a tradeoff was made, not just
> *what* the code does.

**How to use this:** for each question, first give the one-paragraph ideal
answer, then be ready to go deeper when they follow up. Interviewers reward "I
chose X over Y because Z, and here's when I'd revisit it."

---

## A. Architecture

**A1. Walk me through the overall architecture.**
*Ideal:* A React/Vite SPA on a CDN talks over HTTPS + WebSocket to a Node/Express
modular monolith on Render, backed by one Neon Postgres. Socket.IO shares the HTTP
port; cron runs in-process. External services: Cloudinary (media), Razorpay
(payments/escrow), Sentry (errors), an email fallback chain. Domains are isolated
as `modules/*` (routes→controller→service→DB) so a later microservice split is
mechanical. *Deep:* explain the request lifecycle (middleware chain → guard →
validate → controller → service → DB → envelope). *Follow-ups:* Why a monolith?
Why share the socket port? How do modules communicate? *Mistake:* reciting folders
without explaining the *layering discipline* and *why*. *Example:* SYSTEM_
ARCHITECTURE § 2.

**A2. Why a modular monolith and not microservices?**
*Ideal:* At MVP scale one deployable is far cheaper to build, reason about, and
operate; premature microservices add network hops, distributed transactions, and
ops burden for no benefit. Boundaries are enforced *in code* (`modules/*`) so
extraction later is copy-a-folder, not a rewrite. *Follow-up:* When would you
split? (When a domain — chat, payments — needs independent scaling/ownership.)
*Mistake:* claiming microservices are "more scalable" unconditionally.

**A3. How is layering enforced?** *Ideal:* Four files per module: routes wire
middleware, controllers translate HTTP⇄service, services own logic+SQL, validators
own Joi. No SQL in controllers, no logic in routes. *Example:* PROJECT_DEEP_DIVE.

---

## B. Frontend

**B1. Client state vs server state — how do you manage each?**
*Ideal:* Zustand for **client** state (auth token in memory, admin token in
sessionStorage, theme in localStorage, socket); TanStack Query for **server**
state (caching, background refetch, mutation invalidation). Keeping them separate
means components never hand-roll fetch/cache. *Follow-up:* Why not Redux? (Too
much boilerplate when server state is delegated to Query.) *Mistake:* putting
server data in Zustand and re-inventing caching.

**B2. Where do you store the JWT and why?**
*Ideal:* Access token **in memory** (Zustand), not localStorage, to reduce XSS
theft surface, plus a 15-min TTL. The refresh token is an **httpOnly cookie** JS
can't read. *Follow-up:* What happens on refresh/reload? (Access token is lost;
the app silently calls `/refresh-token` using the cookie.) *Mistake:* "localStorage
is fine" — it's readable by any XSS.

**B3. How does silent token refresh work?** *Ideal:* An Axios response interceptor
catches 401 `TOKEN_EXPIRED`, calls `/auth/refresh-token` once, retries the original
request; `/auth/login` is excluded so a bad login doesn't loop. *Example:*
`services/api.js`.

**B4. How did you optimize the bundle?** *Ideal:* Route-level code splitting with
`React.lazy` + `Suspense` (initial JS ~796→454 kB, ~143 kB gzip shell) + idle
prefetch of likely-next chunks + Cloudinary `f_auto/q_auto` + lazy image loading
+ backend gzip. *Mistake:* only mentioning minification.

**B5. How does dark mode work without duplicating styles?** *Ideal:* Semantic
Tailwind tokens (`bg-surface`, `text-text`) with a `.dark` variant; the theme
store toggles the class on `<html>` and is initialized before first render to
avoid FOUC.

---

## C. Backend

**C1. Why no ORM?** *Ideal:* Transparency and full access to PG features (partial
indexes, `FOR UPDATE`, trigram/tsvector, `= ANY`), no hidden N+1s. Cost is
boilerplate + manual mapping, mitigated by a consistent `query()` wrapper and
service layer. *Follow-up:* Downsides? (More code; no compile-time query safety.)

**C2. How do you prevent SQL injection without an ORM?** *Ideal:* **Every** query
is parameterized (`$1,$2`); user input is never concatenated. The only interpolated
values are hardcoded column names from whitelists (`ALLOWED_POST_SORT_COLUMNS`,
`buildHaversineSQL` args). PG enums add a DB-level constraint. *Mistake:* thinking
ORMs are inherently injection-proof (raw fragments still leak).

**C3. What does `asyncHandler` do and why is it necessary?** *Ideal:* Express 4
doesn't catch rejected promises from async handlers — the request would hang.
`asyncHandler` wraps them so rejections reach `next(err)` → the global error
handler. *Example:* `utils/asyncHandler.js`.

**C4. How does your error handling work?** *Ideal:* One `ApiError` class + factory
methods; a single global error handler maps `ApiError`, JWT errors, **PG error
codes** (23505→409, etc.), Multer, JSON-parse, payload-too-large, CORS; hides
internals in production (`isOperational`). Success uses `ApiResponse`. *Follow-up:*
How does the frontend consume it? (Single interceptor unwraps the envelope.)

**C5. How are background jobs handled?** *Ideal:* `node-cron` in-process, hourly:
expire posts + auto-reject stale bookings; idempotent; runs on boot to catch
missed windows. *Follow-up:* Multi-instance problem? (Runs N× — fix with a single
worker / Redis lock.)

---

## D. Database

**D1. Walk me through the booking state machine and how you make `accept`
concurrency-safe.**
*Ideal:* 9 states with a defined transition graph; every transition is
transactional and writes an append-only history row. `accept` opens a
transaction, does `SELECT … FOR UPDATE` on the booking row (serializing concurrent
accepts), re-checks status is `pending`, sets price/commission/deadline, and for
`need_transport` marks the post `booked` + auto-rejects other pending requests +
creates the conversation — all atomic. The **partial unique index** on
`(post_id, requester_id) WHERE status IN (pending,accepted,in_progress)` prevents
duplicate active bookings even under a race. *Follow-up:* Why FOR UPDATE and not
just the app check? (App checks have a TOCTOU race; the lock + unique index close
it.) *Mistake:* "I check then insert" without a lock/constraint. *Example:*
DATABASE_GUIDE § 5.

**D2. Why UUID primary keys?** *Ideal:* Non-enumerable (can't guess `/users/2`),
shard/merge-friendly, generated by the DB (`uuid_generate_v4`). Tradeoff: larger
than ints, random insert order (mitigated by the workload here). *Follow-up:*
Index bloat? (Acceptable at this scale; UUIDv7 would help ordering later.)

**D3. Explain your indexing strategy.** *Ideal:* Every index maps to a real query;
**partial indexes** (`WHERE active`, `WHERE unread`, `WHERE pending`) keep hot
indexes tiny; GIN trigram + `to_tsvector` give search without a search engine.
*Follow-up:* How verify usage? (`EXPLAIN`/`EXPLAIN ANALYZE`.)

**D4. Where did you denormalize and why is it safe?** *Ideal:* `users.rating`/
`total_reviews`, `conversations.last_message_*` — to avoid per-view aggregation;
kept correct by centralizing writes in one service function. *Mistake:* denormalizing
without a single writer.

**D5. Postgres vs Mongo for this?** *Ideal:* Relational + money + multi-table ACID
+ `FOR UPDATE` + constraints → Postgres. Mongo fits schemaless/high-write logs, not
a financial marketplace. *Example:* TECHNOLOGY_DECISIONS § 2.3.

**D6. How do migrations work and how do you roll back?** *Ideal:* Idempotent SQL
files applied in order on deploy; **forward-only** — rollback = a new corrective
migration; snapshot Neon before destructive changes; test on a Neon branch.

---

## E. Security

**E1. Explain your auth model end to end.** *Ideal:* Three secrets/domains: user
access JWT (15 min, memory), rotating refresh token (7d, httpOnly cookie, only the
SHA-256 hash stored in DB), separate admin JWT (8h, different secret + table).
Login is constant-time (bcrypt runs even for unknown emails). Refresh rotates +
detects reuse. *Follow-up:* below.

**E2. What is refresh-token rotation + reuse detection?** *Ideal:* Every refresh
revokes the old token and issues a new one (a stolen token is good for one use).
If an already-revoked token is presented, that's a theft signal → revoke ALL the
user's tokens and force re-login. *Mistake:* long-lived non-rotating refresh
tokens.

**E3. How do you prevent user-email enumeration?** *Ideal:* Login uses a dummy
bcrypt hash for unknown emails (constant time) + one generic error;
forgot-password/resend always return 200 with all work deferred; not-yours lookups
return 404 not 403. *Follow-up:* Register does reveal duplicates — why? (Deliberate
UX tradeoff; the registrant needs to know to log in; the attacker already has the
email.)

**E4. How is payment verification secured?** *Ideal:* HMAC-SHA256 on `/verify`
(`order|payment`) and on the webhook (raw body), both with `timingSafeEqual`, and
**fail closed** if the secret is unset (an empty-keyed HMAC is forgeable). Dedup
via `gateway_payment_id UNIQUE` + idempotent handlers. *Mistake:* trusting the
client's "payment success" without verifying the signature server-side.

**E5. How do you handle file-upload security?** *Ideal:* MIME filter + **magic-byte**
verification (a renamed shell fails), memory storage (no disk/path traversal),
size/count limits, EXIF stripping, private folder + signed URLs for KYC.

**E6. SQL injection / XSS / CSRF defenses?** *Ideal:* Parameterized SQL +
whitelisted columns; global input sanitization + Helmet CSP + React escaping;
Bearer-token API (not ambient) + httpOnly+sameSite+path-scoped refresh cookie +
CORS allow-list. *Example:* SECURITY_GUIDE.

---

## F. Performance

**F1. What's your first bottleneck and why?** *Ideal:* The DB connection pool (10,
Neon free tier) + DB compute — the app is I/O-bound; Node's event loop isn't the
limit. bcrypt is the one CPU hotspot (rate-limited). *Follow-up:* First fix?
(Bigger pool/paid DB, then Redis cache to cut the per-request user lookup.)

**F2. How would you cut database load?** *Ideal:* Cache the per-request user
lookup (Redis, 5-min TTL, invalidate on suspend), cache settings/config, keyset
pagination, read replicas, PostGIS for geo. *Mistake:* caching without an
invalidation story.

**F3. Deep pagination problem?** *Ideal:* `OFFSET N` scans+discards N rows; switch
hot lists to keyset/cursor pagination on `(created_at, id)`.

---

## G. System Design

**G1. Design the real-time chat.** *Ideal:* Socket.IO, app-level auth event (not
handshake), rooms `conv:<id>` (both participants) + `user:<id>` (notifications);
messages persisted (DB is truth) and broadcast; typing/read relayed to the other
party; images via REST+Cloudinary. Scale: Redis adapter + sticky sessions.
*Follow-up:* How recover missed messages? (REST history fetch — sockets only
accelerate.)

**G2. Design the escrow payment flow.** *Ideal:* Snapshot price+commission on
accept; create Razorpay order on pay; verify HMAC; hold funds; release on
completion (or refund on dispute). Redundant confirmation (verify + webhook),
idempotent, unique gateway id. *Follow-up:* What if the browser closes mid-pay?
(The webhook completes it.)

**G3. Design the marketplace feed.** *Ideal:* One `posts` table, three types via a
discriminator; a dynamic parameterized query with whitelisted sort, partial/GIN
indexes, Haversine radius, pagination; `optionalAuth` enriches with a saved-flag.
Scale: PostGIS + keyset + caching + search engine. *Mistake:* separate tables per
type (kills the single feed query).

**G4. How would you scale to 1M users?** *Ideal:* SCALABILITY_GUIDE — Redis first
(cache/limits/socket adapter/queue), then replicas/pooler/PostGIS/partitioning,
then extract chat/notifications/payments/search, shard, event bus, K8s,
multi-region. *Mistake:* jumping to microservices/K8s at low scale.

---

## H. Deployment / DevOps

**H1. Describe your CI/CD.** *Ideal:* GitHub Actions runs CI (backend syntax-check
+ audit; frontend lint + build + audit; weekly security scan) with no deploy
secrets; Vercel + Render deploy via native Git integration. `railway.json` runs
`migrate && start` and gates traffic on `/health`. *Follow-up:* Why not Actions
CD? (Keeps secrets out of CI; platforms give zero-config deploys + rollback.)

**H2. How do you roll back?** *Ideal:* Vercel promote last-good (instant); Render
redeploy last-good (~30s, graceful shutdown avoids dropped requests); DB is
forward-only → corrective migration + pre-change snapshots.

**H3. Why did you move off Railway for email?** *Ideal:* Free tiers block outbound
SMTP ports; email moved to HTTPS providers (Gmail API/Brevo) on port 443; a real
production-published Google OAuth app keeps the refresh token long-lived. *Great
"war story" answer* — shows real debugging.

---

## I. Scalability

**I1. Single biggest scaling investment?** *Ideal:* Redis — simultaneously unlocks
horizontal scale (Socket.IO adapter + sticky sessions), distributed rate limiting,
caching, and a job queue. *Mistake:* naming K8s/microservices first.

**I2. What's stateful and blocks horizontal scaling today?** *Ideal:* In-memory
rate-limit state, in-memory caches, and in-process Socket.IO room state; plus cron
running per instance. Move to Redis + single-worker/locked cron; the HTTP tier is
otherwise stateless (JWT, no sessions, no disk).

---

## J. Business / Problem Solving

**J1. What problem does GoodsGo solve and how is it different from BlaBlaCar?**
*Ideal:* Fills empty **cargo** capacity (esp. return legs) vs empty passenger
seats; higher trust/money stakes → escrow, two-sided reviews, KYC, disputes; three
post types; a role that flips by post type. *Example:* ENGINEERING_HANDBOOK § 1.6.

**J2. How does the platform make money?** *Ideal:* Configurable commission on every
completed, escrow-paid booking (snapshotted at accept so later changes don't
rewrite history). Future: featured posts, subscriptions, insurance, instant payouts.

**J3. A hard bug/decision you're proud of?** *Ideal:* Pick one — the accept-race
(`FOR UPDATE` + partial unique index), the payment fail-closed HMAC, or the
SMTP-blocked-ports email pivot. Explain the symptom, the root cause, and the fix.

**J4. Biggest weakness of the project and how you'd fix it?** *Ideal:* No automated
tests. I'd add service unit tests (auth/booking/payment), Supertest integration
(the app is exported for this), and Playwright E2E, gated in CI — *before* the next
big feature. Honesty + a concrete plan reads as senior.

---

## K. Rapid-fire (know these cold)

- **JWT vs sessions?** Stateless scale vs easy revocation; we bridge with short
  TTL + rotating refresh.
- **Why bcrypt cost 12?** ~300 ms/hash — slow enough to resist brute force, fast
  enough for UX; never below 12.
- **Why store only the refresh-token hash?** A DB breach can't replay sessions.
- **Why `setImmediate` for email/notifications?** Keep side effects off the
  response path.
- **Why `SELECT … FOR UPDATE`?** Serialize concurrent booking accepts.
- **Why fail closed on missing payment secrets?** An empty-keyed HMAC is forgeable.
- **Why partial indexes?** Keep hot indexes tiny (only active/unread/pending rows).
- **Why `optionalAuth`?** Public reads that enrich (saved flag) when logged in.
- **Why route-order literals before `:params`?** Express matches in order; else it
  captures the literal as a param.
- **Why the email provider fallback chain?** Free hosts block SMTP ports; HTTPS
  providers (Gmail API/Brevo) work on 443.
- **Why UUIDs?** Non-enumerable, shard-friendly.
- **Why Zustand + React Query, not Redux?** Split client/server state, minimal
  boilerplate.

---

## L. Questions to ask THEM (shows seniority)

- How do you decide when to extract a service from a monolith?
- What's your approach to testing money/escrow flows?
- How do you handle secret rotation and incident response?
- What observability do you consider table-stakes before scaling?

**Meta-advice:** every answer should end with a tradeoff and a "when I'd revisit
it." That's the difference between describing code and demonstrating engineering
judgment — which is what this project is designed to showcase.
