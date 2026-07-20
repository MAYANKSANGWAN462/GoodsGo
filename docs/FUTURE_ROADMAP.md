# GoodsGo — Improvements & Future Roadmap (Phase 15)

> Current limitations, technical debt, and the prioritized improvement backlog:
> code quality, architecture, security, performance, scalability, UX, premium
> features, AI/ML, and the operational stack. Each item says *what*, *why*, and
> *when* (which user stage / trigger).

---

## 1. Current limitations (honest inventory)

| Area | Limitation | Impact |
|---|---|---|
| Testing | **No automated test framework.** CI does syntax-check + build only; there's a manual `e2e-test.js` + Postman collection | Refactors are risky; regressions can slip |
| Real-time scale | Socket.IO is in-process (single instance); no Redis adapter/sticky sessions | Can't scale the backend horizontally yet |
| Rate limiting | In-memory per instance | Weakens with >1 instance |
| Caching | Only small in-memory caches (config 60s, options 10min) | Every authed request hits the DB for the user lookup |
| DB | Neon free-tier 10-connection cap; OFFSET pagination; Haversine geo in SQL | First scale bottleneck; deep-page + geo cost |
| Payouts | `releasePayment` records release; **no real automated payout rail** | Transporter settlement is manual/dashboard |
| Email | Provider fallback chain works, but no verified sending domain/DKIM, no retry queue | Deliverability + resilience gaps at volume |
| Geocoding | Public Nominatim (strict usage policy) | Rate-limit risk at scale |
| Observability | Errors (Sentry) only — no metrics/dashboards/alerting/SLOs | Limited operational insight |
| Security | No MFA, no account lockout, `/auth/diagnose-email` debug route, 7 pre-existing `npm audit` findings | See SECURITY_GUIDE § 11 |
| Push | No web/mobile push notifications | Users miss events when offline |
| Cron | Runs per instance (redundant at scale) | Wasted work multi-instance |

---

## 2. Technical debt (pay down first)

1. **Automated tests** — Jest/Vitest unit tests for services (auth rotation,
   booking state machine, payment HMAC), plus Supertest integration tests against
   `app` (which is exported precisely for this), plus Playwright E2E for critical
   flows. Wire as a required CI gate. *Highest-value debt.*
2. **Remove/guard the `/auth/diagnose-email` debug endpoint** in production.
3. **Resolve `npm audit` findings** (3 moderate, 4 high pre-existing) and add
   **Dependabot** for ongoing updates.
4. **Structured logging** (pino) with request IDs to replace ad-hoc `console`.
5. **Rotate the seeded admin password** and any exposed secret (SECURITY_GUIDE).
6. **Orphan-media sweep** job (Cloudinary deletes are best-effort).

---

## 3. Code-quality improvements

- **Gradual TypeScript** migration (start with `utils/` + services) once tests
  exist to catch regressions.
- **Repository/query layer** (or Knex) to reduce hand-written SQL boilerplate
  while keeping raw SQL for locking/hot paths.
- **OpenAPI/Swagger** generated from the Joi schemas — living API docs + typed
  clients.
- **Shared constants package** so frontend and backend enums can't drift.

---

## 4. Architecture improvements

- **Redis** (the pivotal addition): cache (user lookup, settings), distributed
  rate limiting, Socket.IO adapter, and a **job queue** (BullMQ) for email +
  notification fan-out. *Trigger: ~10k users / multi-instance.*
- **Event-driven side effects** — publish domain events (booking.accepted,
  payment.completed) and let notifications/email/analytics subscribe, decoupling
  the write path.
- **Extract the real-time, notifications, payments, and search domains** into
  services when they need independent scaling/ownership (the `modules/*`
  boundaries make this mechanical). *Trigger: ~1M users.*
- **Split the HTTP tier from the WebSocket tier** so they scale independently.

---

## 5. Security improvements
(Full list in SECURITY_GUIDE § 11.) Priority: MFA/TOTP (at least for admins),
progressive account lockout/captcha, `rate-limit-redis`, remove the debug email
route, Dependabot, KYC document-access logging, a WAF/bot protection, and
field-level PII encryption.

---

## 6. Performance & scalability improvements
(See PERFORMANCE_ANALYSIS § 4 and SCALABILITY_GUIDE.) In order: bigger pool + paid
Neon, keyset pagination, HTTP caching on public GETs, Redis cache, read replicas +
pooler, PostGIS for geo, table partitioning + archival, CDN/edge, autoscaling.

---

## 7. User-experience improvements

- **Web/mobile push notifications** (FCM/web-push) + email digests + notification
  preferences.
- **Native mobile apps** (React Native reusing the API) — the target users are
  mobile-first transporters.
- **Richer negotiation** — counter-offers on bookings instead of a single agreed
  price.
- **Live tracking** — optional GPS/status updates during in-progress deliveries.
- **Saved searches + alerts** — notify when a matching post appears on a route.
- **Ratings depth** — review responses, most-recent-weighted aggregates,
  photo reviews.
- **Onboarding** — guided flows, KYC self-service, trust badges.

---

## 8. Premium / monetization features

- **Featured/boosted posts** (paid visibility in the feed).
- **Subscription tiers** for power transporters (higher post limits, analytics,
  priority support).
- **Insurance add-on** on high-value shipments.
- **Instant/guaranteed payouts** (financing on top of escrow).
- **Verified/Pro badges** tied to KYC + performance.
- **API access** for fleet operators to post/manage programmatically.

---

## 9. AI / ML opportunities

- **Match recommendations** — rank posts for a user by route fit, price, rating,
  reliability (start with heuristics + embeddings, then learned ranking).
- **Dynamic pricing** — suggest fair prices from historical bookings, route,
  season, vehicle, and demand.
- **Fraud/anomaly detection** — flag suspicious accounts/bookings/payments.
- **Route optimization** — chain multiple loads onto one trip; optimize return
  legs.
- **Trust scoring** — a composite score from ratings, cancellations, KYC,
  disputes.
- **LLM assist** — draft post descriptions, auto-categorize goods, summarize
  disputes for admins, and power a support chatbot. *(If/when building LLM
  features, use the latest Claude models via the Anthropic API — see the project's
  claude-api reference.)*
- **Content moderation** — auto-screen images/descriptions before they hit the
  report queue.

---

## 10. Operational stack (observability, analytics)

- **Metrics + dashboards** (Prometheus/Grafana or a managed APM): latency, error
  rate, pool saturation, socket counts, queue depth.
- **Distributed tracing** across services (once decomposed).
- **Product analytics** (funnels: register→verify→post→book→pay→review; retention;
  cohort analysis) via a warehouse + BI, or a product-analytics tool.
- **SLOs + alerting + on-call** as scale and revenue justify.
- **Backup/restore drills** and a formal DR runbook.

---

## 11. Suggested sequencing (the pragmatic order)

1. **Tests + CI gate + remove debug route + rotate secrets + Dependabot**
   (de-risk everything else).
2. **Structured logging + basic metrics + backup drill** (see what's happening).
3. **Redis** (cache + limits + socket adapter + job queue) → enables horizontal
   scale.
4. **Keyset pagination + HTTP caching + read replica** (DB headroom).
5. **Real payout rail + verified email domain + push notifications** (product
   completeness).
6. **PostGIS + partitioning** (data scale) and **service extraction** (org/scale)
   — only when metrics demand it.
7. **AI/ML + premium features** (growth), on top of a now-solid foundation.

The throughline: **harden and observe the monolith first; add Redis as the single
highest-leverage scaling investment; decompose and add intelligence last, driven
by real metrics rather than anticipation.**
