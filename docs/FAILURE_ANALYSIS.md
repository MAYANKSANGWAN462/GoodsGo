# GoodsGo — Failure Analysis (Phase 11)

> Every plausible failure mode: symptoms, blast radius (impact), recovery, how
> it's monitored today, and future mitigation. Ordered roughly by likelihood ×
> impact. "Fails closed" means the system rejects rather than doing something
> unsafe.

---

## How the system is built to fail safely (design invariants)

- **Graceful shutdown** (`server.js`): SIGTERM drains in-flight requests, closes
  sockets, and ends the pool before exit (30s force-timeout) — deploys don't drop
  requests or leave half-finished transactions.
- **Transactions + row locks**: multi-table changes are atomic (`BEGIN/COMMIT/
  ROLLBACK`); `accept` uses `SELECT … FOR UPDATE` — a crash mid-flow rolls back.
- **Fail closed on money**: missing Razorpay secrets → reject, never validate an
  empty-keyed HMAC.
- **Idempotency**: migrations, seeds, webhooks, mark-read, and auto-reject are
  safe to repeat.
- **DB is source of truth; sockets are an accelerator**: a missed live event is
  recovered on the next REST fetch.
- **Global guards**: `unhandledRejection` is logged (process continues);
  `uncaughtException` logs and exits (the platform restarts it).

---

## Failure catalogue

### 1. Database unavailable (Neon down / network partition / pool exhausted)
**Symptoms:** `/health` returns 503; queries throw; `connectionTimeoutMillis` (5s)
errors; requests hang then fail. **Impact:** near-total — almost every endpoint
needs the DB. **Recovery:** the pool reconnects automatically; Neon
auto-recovers; if pool-exhausted, load shedding + fixing the slow query/leak.
**Monitoring:** `/health` (uptime probe), pool `error` logs, Sentry.
**Mitigation:** raise `DB_POOL_MAX`, add PgBouncer/replicas, ensure every
`getClient()` releases in `finally` (leak prevention), circuit-breaker + friendly
"try again" UI.

### 2. Neon idle cold-start
**Symptoms:** the first request after idle is slow (hundreds of ms–seconds).
**Impact:** occasional latency spike, not an outage. **Recovery:** automatic after
warm-up. **Mitigation:** a keep-warm ping (cron/uptime monitor), or a paid plan
without auto-suspend.

### 3. Cloudinary unavailable
**Symptoms:** uploads 4xx/5xx; existing images still load (served from CDN cache).
**Impact:** partial — image upload/delete only; text flows unaffected. The DB
write is gated on a successful upload, so **no dangling rows**. `deleteImage`
swallows errors (orphans possible). **Monitoring:** upload error logs, Sentry.
**Mitigation:** retry with backoff, an orphan-sweep job, a fallback storage
provider.

### 4. Razorpay / payment gateway unavailable
**Symptoms:** `/initiate` → 502; checkout can't open; webhooks delayed.
**Impact:** new payments blocked; **bookings/chat continue** (payment is a
separate step). **Recovery:** the `/verify` and webhook paths are redundant — if
one is missed, the other completes the payment; `gateway_payment_id UNIQUE` +
idempotent handlers prevent double-apply. **Mitigation:** initiate idempotency
keys, reconciliation job that polls Razorpay for orphaned orders, clear retry UX.

### 5. Backend host (Render/Railway) down or restarting
**Symptoms:** API + WebSocket unreachable; SPA loads (CDN) but calls fail.
**Impact:** total API outage. **Recovery:** platform auto-restart
(`restartPolicyMaxRetries: 5`); graceful shutdown avoids dropped requests on
deploy; SPA shows error states. **Mitigation:** multi-instance + health-checked
load balancing (needs Redis for sockets/limits), multi-region later.

### 6. Frontend host (Vercel) down
**Symptoms:** SPA won't load. **Impact:** users can't reach the app even if the
API is healthy. **Recovery:** Vercel's global edge is highly available; instant
rollback/promote. **Mitigation:** rare; a status page + cached shell.

### 7. Socket disconnects / flapping
**Symptoms:** live updates stop; chat feels laggy. **Impact:** degraded real-time
only — data is safe (persisted; REST recovers it). **Recovery:** socket.io-client
auto-reconnects with backoff, re-`authenticate`s and re-`join`s rooms; heartbeats
(25s/60s) detect dead sockets. **Mitigation:** at scale, Redis adapter + sticky
sessions so reconnects land coherently across instances.

### 8. Network latency / slow clients
**Symptoms:** slow responses; long uploads. **Impact:** UX only. **Mitigation:**
compression (on), CDN (on), keyset pagination, lazy image loading (on).

### 9. High traffic / thundering herd
**Symptoms:** pool waits, rising p95, 429s from rate limiters. **Impact:**
degraded latency, some requests shed. **Recovery:** rate limiters protect the
core; the pool queues. **Mitigation:** Redis cache to cut DB hits, horizontal
scale, autoscaling, a queue for spiky side effects.

### 10. Server crash (uncaught exception)
**Symptoms:** process exits; brief outage until restart. **Impact:** in-flight
requests on that instance fail. **Recovery:** `uncaughtException` handler logs +
exits; platform restarts; graceful shutdown on controlled stops. **Mitigation:**
Sentry alerting, multi-instance so one crash isn't a full outage.

### 11. Memory leak
**Symptoms:** RSS climbs, GC thrashes, eventual OOM/restart. **Likely sources:**
un-released DB clients (guarded by the `finally` convention), growing in-memory
caches/limiter maps, socket listener buildup. **Monitoring:** platform memory
metrics, Sentry. **Mitigation:** enforce `client.release()`, move
caches/limits/sockets to Redis, periodic restarts as a stopgap.

### 12. Disk full
**Symptoms:** writes fail. **Impact:** low — the app uses **memory storage** for
uploads (no disk writes) and a managed DB; only logs/temp use disk.
**Mitigation:** log rotation/shipping; the architecture is largely stateless
on disk.

### 13. Cron failure / duplication
**Symptoms:** stale posts/bookings not cleaned; or (multi-instance) jobs run N×.
**Impact:** low — idempotent, self-heals next run; "run on boot" catches missed
windows. **Mitigation:** move cron to a single worker or guard with a distributed
lock (Redis) when scaling out.

### 14. Email delivery failure
**Symptoms:** verification/reset/booking emails not received; spam-foldered.
**Impact:** onboarding friction (can't verify) — but **flows don't block** (send
is fire-and-forget; user can resend). **Recovery:** the provider fallback chain
(Gmail API → Brevo → SMTP) survives blocked SMTP ports; `verifyEmailConnection`
surfaces misconfig at boot; `/diagnose-email` debugs it. **Mitigation:** a
dedicated ESP + verified domain (DKIM), a retry queue, bounce handling.

### 15. OAuth / Gmail refresh-token expiry
**Symptoms:** Gmail path 401s; email falls back to Brevo/SMTP or fails.
**Root cause seen in practice:** an *unpublished* Google OAuth app expires refresh
tokens in 7 days. **Mitigation (applied):** publish the OAuth app to production so
the refresh token is long-lived; monitor token-refresh errors.

### 16. Expired JWT (normal, not a failure)
**Symptoms:** 401 `TOKEN_EXPIRED`. **Handling:** the frontend interceptor silently
calls `/refresh-token` once and retries; only a failed refresh sends the user to
login. `/auth/login` is excluded from the interceptor so a bad login doesn't loop.

### 17. Refresh-token compromise / session theft
**Symptoms:** a revoked token is replayed. **Handling:** **reuse detection** —
presenting an already-revoked token revokes *all* the user's tokens
(`reuse_detected`), clears the cookie, logs a security warning, and forces
re-login for everyone. Rotation limits any stolen token to one use. **Mitigation:**
device/session listing + explicit "log out all", anomaly alerts.

### 18. Large file uploads / upload abuse
**Symptoms:** rejected uploads; RAM pressure under many parallel large files.
**Handling:** Multer size (5 MB) + count (5) limits (413/400), MIME + magic-byte
checks, `uploadLimiter` (20/hr/IP). **Mitigation:** direct-to-Cloudinary signed
uploads (bypass the server buffer) at scale.

### 19. Race conditions
**Symptoms:** two accepts, duplicate bookings, double payment. **Handling:**
`SELECT … FOR UPDATE` on accept; the **partial unique index** on active bookings;
`gateway_payment_id UNIQUE` + idempotent webhooks. These are the deliberate
race-safety mechanisms — see DATABASE_GUIDE §5.

### 20. Deadlocks / DB contention
**Symptoms:** PG deadlock errors; slow transactions. **Handling:** transactions
are short and lock rows in a consistent order (booking then post); contention is
low at MVP volume. **Mitigation:** keep transactions minimal, consistent lock
ordering, retry-on-deadlock wrapper, monitor `pg_stat_activity`.

### 21. Nominatim rate-limit / block
**Symptoms:** geocoding 429/blocked. **Impact:** geocode + nearby degrade.
**Mitigation:** cache results, respect the usage policy (User-Agent, ≤1 req/s),
move to a paid geocoder or self-hosted Nominatim.

### 22. Sentry / monitoring unavailable
**Symptoms:** no error visibility. **Impact:** operational blindness, not user-
facing (capture is best-effort/async). **Mitigation:** provider redundancy;
platform logs as a backstop.

### 23. Migration failure on deploy
**Symptoms:** `npm run migrate` errors → deploy fails (start command chains
migrate && start). **Impact:** deploy blocked (a *good* fail — bad schema doesn't
go live). **Recovery:** migrations are idempotent + forward-only; fix forward with
a corrective migration. **Mitigation:** **snapshot Neon before destructive
migrations**; test migrations on a Neon branch first.

---

## Incident playbook (quick reference)

1. **Check `/health`** — DB up? If 503, it's the database.
2. **Check Sentry** — new error spike? Group + stack trace point to the code.
3. **Check the platform dashboard** — instance up, recent deploy, memory/CPU?
4. **Roll back** if a recent deploy correlates (Vercel promote / Render redeploy
   last-good — see DEPLOYMENT_GUIDE §rollback).
5. **Payments:** reconcile via Razorpay dashboard; the webhook/verify redundancy +
   unique constraint mean state converges.
6. **DB schema:** never hand-edit prod; write a corrective forward migration;
   restore from a Neon snapshot only as a last resort.
