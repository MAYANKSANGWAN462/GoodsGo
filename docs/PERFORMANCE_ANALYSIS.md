# GoodsGo — Performance Analysis (Phase 10)

> Expected throughput, resource use, per-subsystem bottlenecks, realistic
> concurrency limits, breaking points, and the optimization ladder (caching,
> Redis, queues, CDN, scaling). Figures are engineering estimates for the current
> architecture (single Node instance, Neon free-tier Postgres, in-process
> Socket.IO + cron), not benchmarks — treat them as reasoning tools and validate
> with load tests before relying on them.

---

## 1. The shape of the workload

GoodsGo is **I/O-bound, not CPU-bound**. Almost every request is "validate →
one-or-few Postgres queries → serialize JSON." The CPU-heavy spots are narrow and
known: **bcrypt** (cost 12, ~300 ms) on register/login/password-change, and
**image processing** (offloaded to Cloudinary, so it's *their* CPU, not ours).
Node's single-threaded event loop handles I/O-bound concurrency well precisely
because the bottleneck is waiting on Postgres/Cloudinary/Razorpay, not computing.

**Consequence:** the first hard ceiling is almost always the **database
connection pool (max 10 on Neon free tier)**, followed by DB compute, not Node CPU.

---

## 2. Per-subsystem analysis

### 2.1 Database (the primary bottleneck)
- **Pool size 10.** With ~10–30 ms/query, one connection serves ~30–100
  queries/sec; ten connections ⇒ a few hundred to ~1,000 queries/sec ceiling
  *if* queries are fast and short. Long transactions (accept/complete) hold a
  connection for their whole duration, reducing effective concurrency.
- **Strengths:** every list query is indexed and paginated; partial indexes keep
  hot indexes small; the feed avoids joins via denormalization.
- **Weak spots:**
  - **OFFSET pagination** degrades on deep pages (`OFFSET 10000` scans+discards).
  - **Haversine in SQL** computes trig per row for `/nearby` — fine at tens of
    thousands of posts, expensive at hundreds of thousands.
  - The **per-request auth DB lookup** (one PK lookup per authenticated request)
    is cheap (~1–3 ms) but multiplies with traffic.
  - `COUNT(*)` for pagination totals scans matching rows.
- **Neon idle auto-suspend:** the first request after idle pays a cold wake
  (hundreds of ms to seconds).

### 2.2 API / Node process
- Event loop handles thousands of concurrent *idle* connections; throughput is
  gated by downstream I/O and the pool. Compression adds a little CPU but saves
  bandwidth (measured 63–72% response shrink).
- **bcrypt** is the one place a burst of auth requests can saturate CPU — 10
  simultaneous logins ≈ 3 s of pure hashing. Rate limits (10/15min) blunt this.

### 2.3 Sockets
- Each connection is a small, persistent memory footprint; thousands per instance
  are feasible. Every `send_message` does 2 DB writes (insert + preview update) —
  so chat throughput is also **DB-bound**. `maxHttpBufferSize` caps payloads.
- **Scale limit:** all room state is in one process's memory (single instance).

### 2.4 Image uploads
- Memory storage means each in-flight upload holds up to 5 MB in RAM; 20 parallel
  large uploads ≈ 100 MB. The `uploadLimiter` (20/hr/IP) bounds this. The actual
  resize/store is Cloudinary's cost, not ours; our latency is the buffer-to-
  Cloudinary transfer.

### 2.5 Payments
- Low volume, but each initiate/verify/refund is a synchronous call to Razorpay
  (hundreds of ms). The webhook path is cheap. Not a throughput bottleneck; a
  **latency + external-dependency** concern.

### 2.6 Notifications & email
- Notifications are a DB insert + a socket emit (fast). Email is sent via
  `setImmediate` (off the response path) but each send is a blocking HTTPS call to
  the provider inside that deferred task — a burst of critical-event emails could
  back up. **Fix:** a queue (BullMQ) + worker.

### 2.7 Cron
- Hourly, bounded work; negligible steady-state cost. With multiple instances it
  runs redundantly (idempotent but wasteful).

---

## 3. Realistic concurrency & breaking points

| Metric | Rough estimate (current single instance) |
|---|---|
| Concurrent *connected* socket clients | thousands (memory-bound) |
| Sustained API req/s | low hundreds before the pool saturates |
| Peak logins/s | ~a few/s before bcrypt saturates CPU |
| Feed reads/s | good while pages are shallow + indexes hot |
| First bottleneck | **DB pool (10) + Neon compute** |
| Second bottleneck | Node CPU under auth/bcrypt bursts; upload RAM |
| Third bottleneck | single-instance socket/cron/rate-limit state |

**Breaking points to expect, in order:**
1. Pool exhaustion under a read spike → requests queue for a connection →
   latency climbs → `connectionTimeoutMillis` (5s) failures.
2. Neon compute/connection ceiling → slow queries, cold-start latency after idle.
3. Deep-page OFFSET + Haversine scans as data grows.
4. Single-instance limits (can't scale sockets/rate limits horizontally without
   Redis).

---

## 4. Optimization ladder (do these in order, when metrics justify)

### 4.1 Cheap wins (no new infra)
- Raise `DB_POOL_MAX` once on a bigger DB plan (the single biggest lever).
- Convert hot list endpoints to **keyset (cursor) pagination**.
- Cache `COUNT(*)` or use estimated counts for huge feeds.
- Ensure the frontend leans on TanStack Query caching + the existing
  `f_auto/q_auto` Cloudinary transforms + route code-splitting (already done).

### 4.2 Add Redis (the highest-leverage single addition)
Redis unlocks four things at once (ADR-011):
- **Cache** the per-request user lookup (5-min TTL, invalidate on suspend/delete)
  and platform settings/config — removes a DB hit from every authenticated call.
- **Distributed rate limiting** (`rate-limit-redis`) — correct across instances.
- **Socket.IO Redis adapter** — enables horizontal scaling of the real-time tier.
- **Job queue** (BullMQ) — move email + notification fan-out + heavy tasks off the
  request path and give them retries.

### 4.3 Database scaling
- **Read replicas** for feed/profile reads; primary for writes.
- **Connection pooler** (PgBouncer / Neon pooling) when connections (not CPU) cap.
- **PostGIS** (`geography` + GiST) to replace Haversine at high post volume.
- **Partition** append-heavy tables (`messages`, `notifications`,
  `admin_audit_logs`, `booking_status_history`) by time; archive cold data.

### 4.4 CDN & edge
- The frontend is already CDN-hosted (Vercel) with immutable asset caching;
  images are already CDN-delivered (Cloudinary). Add HTTP caching headers to
  public GETs (`/config/options`, public profiles) and consider edge caching.

### 4.5 Horizontal scaling
- Run multiple backend instances behind a load balancer **once Redis is in
  place** (adapter + distributed rate limit + shared cache) and cron is moved to a
  single worker or guarded by a distributed lock. See SCALABILITY_GUIDE.

---

## 5. Measurement plan (before optimizing)

You cannot optimize what you don't measure. Establish:
- **Sentry performance tracing** (already wired, 10% sampling) → p95 latency per
  route + slow spans.
- **Slow-query logging** (already logged >100 ms in dev) → promote to prod with a
  threshold, or use Neon's query insights.
- **Load tests** (k6/Artillery) against the feed, login, booking-accept, and chat
  send paths to find the real pool-saturation point.
- **Pool metrics** (`pool.totalCount/idleCount/waitingCount`) exposed on an admin
  or metrics endpoint.

Only then apply § 4 in order — most systems never need past 4.2/4.3.
