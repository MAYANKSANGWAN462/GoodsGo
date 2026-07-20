# GoodsGo — Technology Decisions, Dependencies & ADRs

> Phase 6 (technology choices + comparisons), Section K (full dependency
> reference), and Section L (Architecture Decision Records). For each technology:
> why it was selected, its advantages/limits, the alternatives considered, why
> they were rejected, and when to reconsider.

---

## 1. Guiding philosophy

GoodsGo optimizes for **maximum capability on minimum infrastructure spend and
minimum operational complexity**, while keeping the door open to scale. Concretely:
one language (JavaScript) across the stack; a modular monolith over microservices;
managed free-tier services over self-hosted infrastructure; explicit, transparent
code (hand-written SQL, frozen constants) over heavy frameworks/ORMs. Type safety
is bought with Joi/Yup + JSDoc + `Object.freeze`, not TypeScript. Every one of
these is a conscious tradeoff, recorded as an ADR in § 4.

---

## 2. Technology-by-technology (Phase 6)

### 2.1 JavaScript (not TypeScript)
**Why:** one language across front and back; zero build step on the backend;
faster iteration for a solo/small team; no type-gymnastics for SQL rows.
**Advantages:** simplicity, speed, universal tooling.
**Disadvantages:** no compile-time type safety; refactors are riskier.
**Mitigations in code:** Joi/Yup schemas validate all boundaries; JSDoc on every
export; `Object.freeze` enums; strict layering limits blast radius.
**When to reconsider:** team growth or a maturing domain — a gradual TS migration
(start with `utils/` and services) becomes worthwhile. **ADR-002.**

### 2.2 Node.js + Express 4
**Why:** the JS runtime; Express is the de-facto minimal, unopinionated HTTP
framework with the largest middleware ecosystem — a perfect fit for the explicit
`routes→controller→service` layering.
**Alternatives & rejection:** *Fastify* (faster, schema-first) — Express's
ecosystem/familiarity won for MVP; Fastify is a reasonable future swap.
*NestJS* (structured, DI, TS-first) — too heavy/opinionated and TS-coupled for
this lean brief. *Koa/Hapi* — smaller ecosystems.
**When to reconsider:** if raw per-request throughput becomes the bottleneck,
Fastify; if the team wants enforced structure + DI, NestJS.

### 2.3 PostgreSQL (via `pg`, no ORM)
**Why:** relational data with money, multi-table transactions, strong
constraints, and rich querying (partial indexes, GIN/trigram, enums, `FOR UPDATE`
locking) — exactly what a marketplace with escrow and state machines needs.
**Why no ORM:** transparency (the SQL *is* the logic), full access to
PG-specific features (partial indexes, `FOR UPDATE`, trigram, `= ANY`), no
hidden N+1s, no ORM leaky abstractions. Cost: more boilerplate, manual mapping.
**PostgreSQL vs MongoDB:**

| | PostgreSQL (chosen) | MongoDB |
|---|---|---|
| Data shape | Highly relational (users↔posts↔bookings↔payments) | Document/denormalized |
| Transactions | Mature multi-row ACID, `FOR UPDATE` | Multi-doc txns exist but weaker fit |
| Money/escrow | `DECIMAL`, constraints, ledger integrity | Riskier for financial invariants |
| Search | trigram + tsvector built-in | Needs Atlas Search |
| Verdict | **Fits a transactional marketplace** | Better for schemaless/high-write logs |

**ORM alternatives rejected:** Prisma (great DX, but hides SQL, extra build/gen,
weaker on partial indexes + `FOR UPDATE`), Sequelize/TypeORM (heavier, historically
leaky), Knex (query builder — closer, but raw SQL was clearer here).
**When to reconsider:** if hand-written SQL becomes a productivity drag, adopt
Knex or a thin repository layer; keep raw SQL for the hot/locking paths.

### 2.4 Neon.tech (managed Postgres)
**Why:** serverless Postgres with a real free tier, instant provisioning,
branching, and standard `pg` compatibility.
**Neon vs Supabase vs RDS:** Supabase bundles auth/storage/realtime we don't need
(we roll our own); RDS is powerful but not free and more ops. Neon's free-tier
**10-connection cap** is the notable constraint (hence pool max 10). **ADR-006.**
**When to reconsider:** connection ceiling or compute limits → Neon paid tier
(pooling, replicas) or RDS/Cloud SQL.

### 2.5 Socket.IO 4
**Why:** real-time chat + live notifications with automatic reconnection,
rooms/namespaces, and transport fallback (WebSocket → long-poll) for hostile
proxies — batteries included vs raw WebSocket.
**Socket.IO vs raw WebSocket (`ws`):** raw `ws` is lighter but you re-implement
reconnection, heartbeats, rooms, acks, fallback. Socket.IO's room model maps
perfectly to `user:<id>` / `conv:<id>`.
**Scaling caveat:** in-process today; multi-instance needs the **Redis adapter**
(cross-instance broadcast) + **sticky sessions**. **ADR-004** / SCALABILITY_GUIDE.
**When to reconsider:** if you outgrow it, managed realtime (Ably/Pusher) or
raw `ws` + a custom protocol.

### 2.6 JWT + rotating refresh (not server sessions)
**Why:** stateless access tokens scale horizontally with no shared session store;
the security gaps (no revocation, theft) are closed with short TTL + DB-backed
rotating refresh tokens + reuse detection.
**JWT vs server sessions:**

| | JWT + refresh (chosen) | Server sessions |
|---|---|---|
| State | Stateless access token | Requires session store (Redis/DB) |
| Horizontal scale | Trivial | Needs shared/sticky store |
| Revocation | Via short TTL + refresh rotation | Immediate (delete session) |
| Complexity | Rotation/reuse logic | Store + expiry management |

**vs managed auth (Auth0/Clerk/Firebase/Supabase Auth):** rejected to avoid
vendor lock-in and cost, and because auth is core enough to own (custom escrow
roles, admin domain). **ADR-003.** **When to reconsider:** if MFA/social/enterprise
SSO become priorities, a managed provider saves time.

### 2.7 Razorpay
**Why:** India-first payment gateway (UPI, cards, netbanking, wallets), strong
docs, order/verify/webhook/refund APIs, no monthly fee.
**vs Stripe/PayPal/Cashfree/PhonePe:** Stripe's India support for domestic
methods (esp. UPI) is weaker; Cashfree/PhonePe are viable Indian alternatives —
Razorpay's maturity + docs won. **ADR-005** / SERVICES_AND_INFRASTRUCTURE §
Razorpay. **Lock-in:** the gateway layer is isolated in `payments.service`, so a
swap is contained.

### 2.8 Cloudinary
**Why:** upload + storage + on-the-fly transforms + global CDN + `f_auto/q_auto`
optimization, all on a usable free tier — one service replaces S3 + CloudFront +
an image pipeline.
**vs S3/Firebase Storage/Azure Blob:** those are storage-only; you'd build
resizing/optimization/CDN yourself. Cloudinary's transforms + CDN are the value.
**Lock-in:** the DB stores `public_id`s; migrating means re-uploading and
rewriting URLs — a contained but real cost. SERVICES_AND_INFRASTRUCTURE §
Cloudinary.

### 2.9 Nodemailer + Brevo + Gmail API (fallback chain)
**Why the chain:** free hosts block outbound SMTP ports, so SMTP alone fails in
production. `sendMail` prefers **Gmail API (OAuth2 over HTTPS)** → **Brevo
(HTTPS)** → **SMTP** (local dev). This gives reliable delivery on port 443 and
perfect deliverability for a Gmail sender (SPF/DKIM/DMARC align). **ADR-007** /
SERVICES_AND_INFRASTRUCTURE § Email.

### 2.10 Sentry
**Why:** error monitoring + tracing + release/source-map support for both tiers,
auto-instrumenting `http` and `pg`, with a free tier. No-op without a DSN.
**vs Datadog/New Relic/Grafana+Prometheus/LogRocket:** heavier/pricier or
metrics-first; Sentry is the best error-first fit for this scale.
SERVICES_AND_INFRASTRUCTURE § Sentry.

### 2.11 Frontend: React 19 + Vite 7 + React Router 7 + Tailwind 4
- **React 19:** dominant ecosystem, component model, huge hiring pool.
  **React vs Next.js:** Next adds SSR/SSG + a Node server; GoodsGo is an
  authenticated app behind login (SEO irrelevant) that benefits from a pure static
  SPA on a CDN — Next's server runtime would add cost/complexity for no gain.
  **ADR-008.** Reconsider if public SEO landing/marketing pages become important.
- **Vite 7:** instant dev server (native ESM) + fast Rollup builds + first-class
  React/Tailwind/Sentry plugins. **vs CRA** (deprecated, slow) / **Webpack**
  (heavier config).
- **React Router 7:** client routing; `vercel.json` rewrites all paths to
  `index.html` for the SPA.
- **Tailwind 4:** utility-first styling with semantic design tokens enabling
  automatic dark mode; no CSS-in-JS runtime cost.

### 2.12 Zustand + TanStack Query (not Redux)
**Zustand** for minimal **client** state (auth token, admin token, theme,
socket); **TanStack Query** for **server** state (caching, background refetch,
mutation invalidation). This split means components never hand-roll fetch/cache
logic. **vs Redux(-Toolkit):** far less boilerplate; Redux's global store is
overkill when server state is delegated to Query. **ADR-009.**

### 2.13 Hosting: Vercel + Render/Railway
- **Vercel** (frontend): purpose-built for SPA/Vite, global edge CDN, instant
  rollbacks, generous free tier, Git-push deploys. **vs Netlify** (near-equal) /
  self-host (more ops).
- **Render/Railway** (backend): simple Git-push Node hosting with health checks
  and managed TLS. The project **migrated Railway→Render** because both free tiers
  block outbound SMTP (proven), which is why email moved to HTTPS providers. **vs
  Heroku** (pricier since free tier ended) / **AWS/GCP/Azure** (powerful, more
  ops) / **Docker VPS/K8s** (max control, max ops). **ADR-010.**
- **GitHub Actions** (CI): native to the repo, free minutes, simple YAML. **vs
  Jenkins/GitLab CI/CircleCI/Travis** — no separate infra to run. DEPLOYMENT_GUIDE.

---

## 3. Complete dependency reference (Section K)

### 3.1 Backend `dependencies`
| Package | Why it's here | Where used | Alternatives / notes |
|---|---|---|---|
| `express` | HTTP framework | `app.js`, all routes | Fastify, Koa, Nest |
| `pg` | Postgres driver + pooling | `config/database.js` | postgres.js; ORMs |
| `socket.io` | Real-time server | `config/socket.js`, `socket/*` | raw `ws`, Ably |
| `jsonwebtoken` | Sign/verify JWTs | `utils/generateTokens.js` | jose |
| `bcryptjs` | Password hashing (cost 12) | `utils/hashPassword.js` | native `bcrypt`, argon2 |
| `joi` | Request validation | `middleware/validate`, `*/validator.js` | zod, yup, express-validator |
| `razorpay` | Payment SDK (orders/refunds) | `payments.service.js` | direct REST calls |
| `cloudinary` | Media upload/CDN/transform | `config/cloudinary.js`, `utils/uploadImage.js` | AWS SDK + S3 |
| `multer` | Multipart parsing (memory storage) | `middleware/upload.middleware.js` | busboy, formidable |
| `nodemailer` | SMTP email transport | `config/email.js` | provider SDKs |
| `helmet` | Security headers + CSP | `app.js` | manual headers |
| `cors` | CORS allow-list | `app.js` | manual |
| `compression` | gzip responses | `app.js` | reverse-proxy gzip |
| `express-rate-limit` | Per-endpoint throttling | `middleware/rateLimiter` | rate-limiter-flexible |
| `morgan` | Request logging | `app.js` | pino-http |
| `node-cron` | Scheduled jobs | `jobs/expirePosts.job.js` | Agenda, BullMQ, platform cron |
| `dotenv` | Load `.env` | `server.js` | platform env only |
| `@sentry/node` | Error/trace monitoring | `server.js`, `app.js` | Datadog, New Relic |
| `axios` | Outbound HTTP (e.g. geocoding) | location + utilities | native `fetch` (used for email) |
| `date-fns` | Date utilities | services | dayjs, luxon |
| `uuid` | UUID generation (app side) | tokens/misc | `crypto.randomUUID` (also used) |

### 3.2 Backend `devDependencies`
| Package | Why |
|---|---|
| `nodemon` | Auto-restart on file change in `npm run dev` |

### 3.3 Frontend `dependencies`
| Package | Why | Alternatives |
|---|---|---|
| `react`, `react-dom` | UI runtime | Vue, Svelte, Solid |
| `react-router-dom` | Client routing | TanStack Router |
| `@tanstack/react-query` | Server-state cache/sync | SWR, RTK Query |
| `zustand` | Client state | Redux Toolkit, Jotai |
| `axios` | HTTP client + interceptors | fetch |
| `socket.io-client` | Real-time client | native WS |
| `react-hook-form` + `@hookform/resolvers` | Forms + validation binding | Formik |
| `yup` | Form schema validation | zod |
| `tailwindcss` + `@tailwindcss/vite` | Styling + tokens/dark mode | CSS Modules, styled-components |
| `react-hot-toast` | Toast notifications | sonner, react-toastify |
| `date-fns` | Dates | dayjs |
| `prop-types` | Runtime prop typing (no TS) | TypeScript |
| `@sentry/react` | Frontend error monitoring | LogRocket |

### 3.4 Frontend `devDependencies`
| Package | Why |
|---|---|
| `vite`, `@vitejs/plugin-react` | Build tool + React (Fast Refresh) |
| `@sentry/vite-plugin` | Upload source maps to Sentry, delete `.map` from `dist` |
| `eslint` + `@eslint/js` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `globals` | Linting (flat config) |
| `@types/react`, `@types/react-dom` | Editor IntelliSense (JSDoc/TS-in-editor) |

---

## 4. Architecture Decision Records (Section L)

Format: *Context → Options → Decision → Consequences → Reconsider when.*

**ADR-001 — Modular monolith over microservices.**
*Context:* MVP, small team, cost-sensitive. *Options:* monolith / microservices /
serverless functions. *Decision:* one deployable, domains isolated as
`modules/*`. *Consequences:* fast to build/operate, one DB transaction boundary;
scaling is coarse-grained. *Reconsider:* when a domain (chat, payments) has
independent scaling/ownership needs → extract that folder.

**ADR-002 — JavaScript, not TypeScript.** *Decision:* JS + Joi/Yup + JSDoc +
frozen constants. *Consequences:* fast iteration; weaker refactor safety.
*Reconsider:* team/domain growth → gradual TS.

**ADR-003 — Custom JWT auth over managed auth.** *Decision:* own the auth stack
(access JWT + rotating refresh + separate admin domain). *Consequences:* full
control, no lock-in/cost; we carry the security burden. *Reconsider:* if MFA/SSO/
social become priorities.

**ADR-004 — Socket.IO in-process, sharing the HTTP port.** *Consequences:* simple,
cheap, single-auth; horizontal scale needs Redis adapter + sticky sessions.
*Reconsider:* at multi-instance scale.

**ADR-005 — Razorpay as the gateway.** *Decision:* India-first, order/verify/
webhook/refund, gateway isolated in one service. *Reconsider:* multi-country →
Stripe/multi-gateway.

**ADR-006 — Neon serverless Postgres.** *Consequences:* free, instant, branchable;
10-connection cap drives pool sizing. *Reconsider:* connection/compute ceilings.

**ADR-007 — Email provider fallback chain (Gmail API → Brevo → SMTP).**
*Context:* free hosts block SMTP ports. *Decision:* prefer HTTPS providers.
*Consequences:* reliable delivery on 443; more config surface. *Reconsider:* at
volume → dedicated ESP (SES/SendGrid) with a verified domain.

**ADR-008 — SPA (React+Vite) over Next.js.** *Context:* app is behind login; SEO
irrelevant. *Decision:* static SPA on a CDN. *Reconsider:* if public/marketing
SEO pages matter → Next/Astro.

**ADR-009 — Zustand + TanStack Query over Redux.** *Decision:* split client vs
server state. *Consequences:* minimal boilerplate. *Reconsider:* rarely — this
scales well.

**ADR-010 — Vercel + Render/Railway + Neon, no Docker.** *Context:* minimize ops
+ cost. *Decision:* managed PaaS, Git-push deploys, no containers. *Consequences:*
near-zero ops; less portability; migrated Railway→Render over SMTP-port blocking.
*Reconsider:* when you need custom runtimes, multi-region, or fine control →
Docker + a VPS/K8s.

**ADR-011 — No Redis (yet).** *Context:* one instance, low volume. *Decision:*
defer Redis. *Consequences:* rate-limit + cache + socket state are in-memory
per-instance. *Reconsider:* the moment you run >1 backend instance (needed for the
Socket.IO adapter, distributed rate limiting, shared cache, and a job queue).

**ADR-012 — Hand-written SQL migrations, forward-only.** *Decision:* idempotent
SQL files applied on deploy. *Consequences:* transparent + portable; no
auto-rollback (snapshot before destructive changes).
