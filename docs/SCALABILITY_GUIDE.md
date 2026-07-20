# GoodsGo — Scalability Guide (Phase 12)

> What happens — and what to do — at each order of magnitude of users. The
> architecture is a lean modular monolith by design; this is the deliberate,
> staged path to scale it. **Golden rule: scale in response to metrics, not
> anticipation.** Most stages here are never reached; knowing them prevents
> premature complexity.

Assume a rough activity profile: users browse the feed, a fraction create posts,
a smaller fraction book, and booked pairs chat + pay. Reads dominate writes.

---

## Stage 1 — ~100 users (MVP, current architecture)

**State:** single Node instance (Render/Railway), Neon free-tier Postgres (pool
10), in-process Socket.IO + cron, Cloudinary/Razorpay/Sentry free tiers.
**Bottlenecks:** none real. Occasional Neon cold-start latency after idle.
**Actions:** nothing structural. Add a keep-warm ping if cold-starts annoy;
finish an automated test suite; confirm Sentry + `/health` monitoring.
**Cost:** ~free to a few dollars/month.

---

## Stage 2 — ~1,000 users

**Bottlenecks:** the DB **connection pool (10)** and Neon compute begin to matter
during peaks; the per-request auth DB lookup multiplies; deep-page OFFSET starts
to show on large feeds.
**Actions (cheap, no re-architecture):**
- Move Neon to a **paid plan** and raise `DB_POOL_MAX` (biggest single lever).
- Add **HTTP caching** on public GETs (`/config/options`, public profiles).
- Switch hot lists to **keyset (cursor) pagination**.
- Ensure indexes are used (`EXPLAIN` the feed/nearby queries under real data).
**Still single instance** — that's fine here.
**Cost:** tens of dollars/month.

---

## Stage 3 — ~10,000 users

This is the **inflection point where Redis becomes worthwhile** (ADR-011). It
unlocks four things at once:
1. **Cache** the per-request user lookup (5-min TTL, invalidate on suspend/delete)
   and platform settings → removes a DB hit from every authenticated request.
2. **Distributed rate limiting** (`rate-limit-redis`) → correct across instances.
3. **Socket.IO Redis adapter** (+ **sticky sessions** at the LB) → the real-time
   tier can finally run on more than one instance.
4. **Job queue** (BullMQ) → move email + notification fan-out off the request path
   with retries.

**Other actions:**
- Introduce a **load balancer + 2–3 backend instances** (now safe, given Redis).
- Move **cron to a single dedicated worker** (or guard with a Redis lock) so it
  doesn't run redundantly per instance.
- Add a **read replica** for feed/profile reads.
- Watch `messages`/`notifications` growth; plan partitioning.
**Bottlenecks resolved:** connection ceiling (pooler + replica), single-instance
sockets/limits (Redis), email backpressure (queue).
**Cost:** low hundreds/month.

---

## Stage 4 — ~100,000 users

**Bottlenecks:** write-path DB load; Haversine geo scans at high post volume;
append-heavy tables growing large; media bandwidth; email volume.
**Actions:**
- **PgBouncer / Neon pooling** in front of Postgres; multiple **read replicas**;
  route reads/writes explicitly.
- **PostGIS** (`geography` + GiST) to replace SQL Haversine for `/nearby`.
- **Partition** `messages`, `notifications`, `booking_status_history`,
  `admin_audit_logs` by time; **archive** completed/cold data to cheap storage.
- **CDN/edge caching** for public content; keep media on Cloudinary CDN (or move
  to S3+CloudFront if bandwidth cost dominates).
- **Dedicated ESP** (SES/SendGrid) with a verified sending **domain** (DKIM) and
  a mail queue with bounce handling.
- **Autoscaling** backend instances; consider separating the **real-time tier**
  (sockets) from the **HTTP tier** so they scale independently.
- Add **observability**: metrics (Prometheus/Grafana or a managed APM), structured
  logs, dashboards, SLOs/alerts — beyond error-only Sentry.
**Cost:** low-to-mid thousands/month.

---

## Stage 5 — ~1,000,000 users

At this scale you selectively **decompose the monolith** — but only the domains
that need independent scaling/ownership. The `modules/*` boundaries make this a
extraction, not a rewrite.

**Likely extractions (highest load first):**
- **Chat/real-time service** — connection-heavy; its own fleet + Redis (or a
  managed realtime like Ably) + its own datastore/partitioning.
- **Notifications service** — high fan-out; queue-driven; add web push/FCM.
- **Payments service** — isolate the money path for compliance, auditing, and
  independent reliability; add reconciliation + a real payout system (Razorpay
  Route).
- **Search/feed** — move to Elasticsearch/OpenSearch or Postgres FTS on dedicated
  nodes; precompute/cache feeds.

**Data tier:**
- **Sharding** or Citus/distributed Postgres for the largest tables; per-service
  databases where extraction happens.
- Aggressive **caching layers** (Redis cluster) and **CDN** everywhere.
- **Event-driven architecture** (Kafka/queues) between services for decoupling
  and back-pressure.

**Platform:**
- **Containerize** (Docker) + orchestrate (**Kubernetes** or a managed
  equivalent); multi-region for latency + resilience; blue/green or canary
  deploys; full **observability** (tracing across services, SLOs, on-call).
**Cost:** significant; matched by revenue at this scale.

---

## The scaling ladder at a glance

| Users | Add | Primary bottleneck removed |
|---|---|---|
| 100 | (nothing) | — |
| 1,000 | Paid DB + bigger pool, HTTP cache, keyset pagination | Pool/compute headroom |
| 10,000 | **Redis** (cache + limits + socket adapter + queue), LB + few instances, read replica, single-worker cron | Single-instance limits, DB hit per request |
| 100,000 | Pooler, replicas, PostGIS, partitioning/archival, CDN edge, dedicated ESP, autoscaling, metrics | Write load, geo scans, table bloat, email volume |
| 1,000,000 | Extract chat/notifications/payments/search, shard DB, event bus, K8s, multi-region, full observability | Monolith coupling, single-DB ceiling |

---

## Principles that make this cheap to grow

- **Domain-isolated modules** → extraction is mechanical.
- **Stateless HTTP tier** (JWT auth, no server sessions, no disk state) → trivial
  to replicate once sockets/limits move to Redis.
- **DB is the source of truth; sockets accelerate** → the real-time tier can be
  scaled/replaced without risking data.
- **Idempotency + transactions + unique constraints** → correctness holds under
  concurrency and retries as you add instances.
- **Managed services** (Neon, Cloudinary, Vercel) → each scales on its own curve
  without you operating it.

The single most important early investment is **Redis at Stage 3** — it
simultaneously unblocks horizontal scaling, distributed rate limiting, caching,
and background jobs. Everything after that is incremental.
