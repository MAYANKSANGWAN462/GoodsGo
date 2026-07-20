# GoodsGo — Engineering Handbook (Master Index)

> **Purpose of this document set.** This is the complete internal engineering
> handbook for GoodsGo. It is written so that a senior engineer joining the
> project — or the original author returning after five years — can fully
> understand, maintain, extend, debug, optimize, deploy, scale, and *defend*
> every engineering decision without needing anyone to explain it in person.
>
> Everything here is grounded in the actual source code of the repository as it
> stands, not in idealized descriptions. Where the handbook describes an
> aspiration or a not-yet-built improvement, it says so explicitly.

---

## 0. How to read this handbook

The handbook is split into focused documents. Read them in whatever order suits
your task, but if you are new, read them top to bottom.

| # | Document | What it answers |
|---|----------|-----------------|
| 1 | **ENGINEERING_HANDBOOK.md** (this file) | What is GoodsGo, why it exists, who it's for, the business model, and the roadmap. The map to everything else. |
| 2 | [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | The end-to-end architecture, request/data-flow diagrams, and a recursive tour of every folder. |
| 3 | [PROJECT_DEEP_DIVE.md](./PROJECT_DEEP_DIVE.md) | File-by-file documentation and per-module (Auth, Posts, Bookings, …) deep dives. |
| 4 | [DATABASE_GUIDE.md](./DATABASE_GUIDE.md) | Every table, column, index, constraint, enum, transaction, and locking strategy. |
| 5 | [API_REFERENCE.md](./API_REFERENCE.md) | Every REST endpoint and Socket.IO event: auth, input, output, errors, rate limits. |
| 6 | [SECURITY_GUIDE.md](./SECURITY_GUIDE.md) | Every security mechanism, attack vector, and mitigation. |
| 7 | [TECHNOLOGY_DECISIONS.md](./TECHNOLOGY_DECISIONS.md) | Why each technology was chosen, alternatives rejected, dependency reference, and ADRs. |
| 8 | [SERVICES_AND_INFRASTRUCTURE.md](./SERVICES_AND_INFRASTRUCTURE.md) | Deep guides for every external service: Razorpay, Cloudinary, Sentry, Neon, email, Socket.IO. |
| 9 | [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md) | Throughput, bottlenecks, concurrency limits, caching and Redis opportunities. |
| 10 | [FAILURE_ANALYSIS.md](./FAILURE_ANALYSIS.md) | Every failure mode, its symptoms, blast radius, recovery, and mitigation. |
| 11 | [SCALABILITY_GUIDE.md](./SCALABILITY_GUIDE.md) | What breaks (and what to do) at 100 → 1,000 → 10k → 100k → 1M users. |
| 12 | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | CI/CD, environments, secrets, rollback, disaster recovery, monitoring. |
| 13 | [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md) | Current limitations, technical debt, and the improvement backlog. |
| 14 | [INTERVIEW_GUIDE.md](./INTERVIEW_GUIDE.md) | Every interview question this project can generate, with model answers. |

> **Cross-references.** Documents link to each other. When a topic is owned by
> another document (e.g. the booking state machine belongs to PROJECT_DEEP_DIVE
> but is summarized in DATABASE_GUIDE), the summary links to the owner.

---

## 1. Project Overview (Phase 1)

### 1.1 What is GoodsGo?

GoodsGo is a **two-sided logistics marketplace for the Indian market**. The
tagline is *"BlaBlaCar, but for goods instead of passengers."* It connects two
kinds of people:

- **Shippers** — individuals or small businesses that need to move goods
  (furniture, machinery, produce, household items) from one place to another.
- **Transporters** — people who own or operate vehicles (trucks, tempos,
  pickups, containers) and have spare cargo capacity.

The signature insight is the **return journey**. A truck that delivers a load
from Delhi to Jaipur usually drives back *empty*. That empty return leg is
wasted capacity — fuel and driver time paid for, nothing earned. GoodsGo lets a
transporter advertise that return leg so a shipper who needs goods moved along
that route can book it cheaply, and the transporter earns money on a trip they
were making anyway.

Technically, GoodsGo is delivered as **two applications** in one repository:

- `goodsgo-backend/` — a Node.js / Express **REST + Socket.IO** API server
  backed by PostgreSQL.
- `goodsgo-frontend/` — a **React 19 / Vite** single-page application.

Every user has **one account** and can act as either a shipper or a transporter
depending on the kind of post they create. The platform earns a **configurable
commission** (default 10%) on every completed, escrow-paid booking.

### 1.2 What problem does it solve?

The Indian road-freight market is enormous, fragmented, and inefficient:

1. **Empty return trips (deadhead miles).** A very large fraction of truck
   kilometres in India are run empty on return legs. This is pure economic and
   environmental waste — burned diesel, lost driver-hours, higher per-trip cost.
2. **No trusted discovery layer.** Small transporters find loads through phone
   calls, brokers (commission-hungry middlemen), and word of mouth. Shippers
   find trucks the same way. There is no single searchable marketplace with
   trust signals.
3. **No trust or accountability.** Cash deals with strangers mean no ratings, no
   recourse when goods are damaged, no proof of who agreed to what.
4. **No safe money handling.** Advance payments to an unknown transporter are
   risky; paying only on delivery is risky for the transporter. There is no
   neutral escrow.

GoodsGo attacks all four: a **combined searchable feed** (discovery), **ratings
+ reviews + KYC + cancellation tracking** (trust), an **append-only booking
audit trail + dispute system** (accountability), and **escrow-style payments via
Razorpay** with platform-held funds released on completion (safe money).

### 1.3 Why was this idea chosen?

- **Real, large, underserved market.** Freight matching is a proven model
  globally (Convoy, Uber Freight, Blackbuck, Rivigo in India) but the
  *return-journey / spare-capacity* angle for small and mid operators is
  under-productized.
- **It is a genuinely hard software problem.** It exercises real money (escrow),
  real trust (ratings, KYC), concurrent state machines (two people racing to
  accept/withdraw a booking), and real-time communication (chat, live
  notifications). That makes it an excellent showcase of full-stack engineering
  depth — it is deliberately *not* a CRUD toy.
- **Lean-by-design economics.** The entire system is sized to run on free or
  near-free cloud tiers (Neon Postgres, Cloudinary, Render/Vercel), so it can be
  built and demonstrated end-to-end without infrastructure spend.

### 1.4 Existing industry problems (in depth)

| Problem | Consequence today | How GoodsGo addresses it |
|---|---|---|
| Deadhead (empty return) miles | ~30–40% of freight-km run empty; higher prices | `return_journey` post type surfaces spare return capacity |
| Broker-dominated matching | Middlemen take 5–15%; opaque pricing | Direct shipper↔transporter match; transparent platform commission |
| No trust signals | Damaged goods, no-shows, fraud | Ratings, two-sided reviews, KYC flag, cancellation count on profile |
| Unsafe payments | Advance-payment fraud, non-payment | Razorpay escrow: platform holds funds, releases on completion |
| No dispute recourse | He-said/she-said; cash disputes | Append-only status history + formal disputes with admin resolution |
| Fragmented communication | WhatsApp/phone, no record | In-app real-time chat tied to each booking, archived for evidence |

### 1.5 Existing competitors

- **Global freight-tech:** Uber Freight, Convoy (shut 2023), Transfix, Loadsmart.
- **Indian freight-tech:** BlackBuck, Rivigo, Porter (intra-city), TruckSuvidha,
  FreightTiger, Vahak (closest analogue — a truck-load marketplace).
- **Adjacent inspiration:** BlaBlaCar (long-distance ride-sharing that fills
  empty *passenger* seats).

GoodsGo's differentiator versus these is the explicit, first-class **return-leg
capacity** model combined with a **single-account, low-friction, escrow-backed**
marketplace aimed at small/independent operators rather than enterprise fleets.

### 1.6 Difference from BlaBlaCar

| Dimension | BlaBlaCar | GoodsGo |
|---|---|---|
| What is matched | Empty **passenger seats** on a planned car trip | Empty **cargo capacity** on a planned vehicle trip |
| Cargo | People (self-loading, self-unloading) | Goods (need weight/dimensions/fragility, pickup/delivery addresses) |
| Trust needs | Moderate (personal safety) | High (goods value, damage liability, delivery proof) |
| Money | Cost-sharing, low value | Commercial freight value, escrow, commission, refunds/disputes |
| Post types | One (driver offering seats) | **Three** (`need_transport`, `vehicle_available`, `return_journey`) |
| Lifecycle | Book → ride → done | Booking **state machine** (9 states) + payment escrow + dispute path |
| Roles | Driver / passenger | Shipper / transporter, and *which is which flips by post type* |

The role-flip is the subtle part: for a `need_transport` post the **post owner
is the shipper** and the **requester is the transporter**; for
`vehicle_available` / `return_journey` it is the reverse. The booking and payment
services encode this explicitly (see PROJECT_DEEP_DIVE → Bookings).

### 1.7 Why GoodsGo is useful

- **For transporters:** monetize otherwise-wasted return trips and spare
  capacity; build a public reputation; get paid safely via escrow.
- **For shippers:** cheaper transport (you're buying capacity that already
  exists), searchable options, trust signals, dispute recourse.
- **For the ecosystem:** fewer empty trucks → lower emissions and lower freight
  cost overall.

### 1.8 Target users & personas

**Persona A — Ravi, the independent truck owner (Transporter).**
Owns one mini-truck. Regularly runs Delhi→Jaipur deliveries and returns empty.
Wants to fill the return leg. Not tech-savvy; needs a simple "post my return
trip, get requests, accept the best one, get paid" flow. Uses `return_journey`
and `vehicle_available` posts.

**Persona B — Meera, the small-business shipper (Shipper/Customer).**
Runs a furniture workshop. Needs to send finished pieces to customers in nearby
cities a few times a month. Cares about cost, careful handling (fragile goods),
and reliability. Uses `need_transport` posts and browses `vehicle_available` /
`return_journey` posts.

**Persona C — Anil, the fleet dispatcher (Power Transporter).**
Coordinates several vehicles. Uses `vehicle_available` posts heavily, juggles
many concurrent bookings, relies on chat and notifications.

**Persona D — Priya, the platform moderator/admin (Internal).**
Reviews reported posts, resolves disputes, suspends bad actors, releases or
refunds payments, and tunes platform settings (commission %, expiry days). Uses
the separate admin panel with role-based access.

### 1.9 Real-world use cases

1. **Return-leg fill.** Ravi posts a `return_journey` (Jaipur→Delhi, 500 kg free,
   ₹3,000). Meera books it for a furniture consignment. Money is escrowed on
   accept, released on delivery.
2. **On-demand transport.** Meera posts `need_transport` (Delhi→Agra, 200 kg,
   fragile, budget ₹2,000–3,000). Several transporters request; she accepts the
   best-rated one; the rest are auto-rejected.
3. **Advertised capacity.** Anil posts `vehicle_available` (container, Mumbai→Pune,
   available Friday). Multiple shippers can book partial capacity until he closes
   it (note: `vehicle_available`/`return_journey` posts stay `active` after an
   accept, unlike `need_transport` which becomes `booked`).
4. **Dispute.** Goods arrive damaged. The shipper raises a dispute on the
   completed booking; an admin reviews the chat + status history and issues a
   partial refund.

### 1.10 Business workflow (happy path)

```
Register → verify email → create/browse posts → send booking request
     → owner accepts (price agreed, commission snapshotted, conversation opens,
       payment deadline set) → shipper pays via Razorpay (funds escrowed)
     → transporter marks in-progress (pickup) → shipper confirms complete
     → payment auto-release timer starts → both leave reviews
     → (optional) dispute → admin resolves → refund/release
```

### 1.11 Value proposition

- **To transporters:** *"Never drive back empty. Turn spare capacity into income,
  and get paid safely."*
- **To shippers:** *"Find trusted transport at capacity prices, with escrow
  protection and a record of everything."*
- **To the platform:** a commission on every completed booking, with the money
  flow (escrow) creating a natural, defensible position in the transaction.

### 1.12 Scalability vision

The current architecture is a deliberately lean **modular monolith** (one Node
process, one Postgres, in-process Socket.IO and cron). This is the correct shape
for 0→~10k users. The vision is a staged evolution — add Redis (caching + the
Socket.IO adapter + a job queue), then a CDN and read replicas, then extract the
highest-load domains (chat, notifications, payments) into services — *only when
metrics demand it*. See [SCALABILITY_GUIDE.md](./SCALABILITY_GUIDE.md) for the
full 100→1M user progression, and the ADRs in
[TECHNOLOGY_DECISIONS.md](./TECHNOLOGY_DECISIONS.md) for why the monolith was
chosen first.

### 1.13 Future roadmap (headline)

Near-term (harden the MVP): automated test suite, Redis for the Socket.IO
adapter + caching, real payout rails (Razorpay Route), push notifications,
PostGIS for geo-search. Mid-term: mobile apps, KYC automation, dynamic pricing,
analytics/observability stack. Long-term: ML-based match recommendations,
route/price optimization, and selective microservice extraction. The detailed,
prioritized backlog lives in [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md).

---

## 2. The Stack at a Glance

| Layer | Technology | Notes |
|---|---|---|
| Backend runtime | Node.js ≥ 20, CommonJS, Express 4 | No TypeScript by design |
| Database | PostgreSQL via `pg` (no ORM) | Hand-written parameterized SQL, plain SQL migrations |
| Real-time | Socket.IO 4 (server) / socket.io-client (web) | Shares the HTTP port; in-process |
| Auth | `jsonwebtoken` (3 separate secrets), `bcryptjs` (cost 12) | Access JWT + rotating refresh cookie + separate admin JWT |
| Validation | Joi (backend), Yup + React Hook Form (frontend) | |
| Payments | Razorpay SDK | Escrow model, HMAC verification, webhooks |
| File storage | Cloudinary (via Multer memory uploads) | MIME + magic-byte verification, EXIF stripping |
| Email | Nodemailer SMTP → Brevo HTTP → Gmail API (priority) | Fallback chain to survive blocked SMTP ports |
| Scheduled jobs | node-cron (in-process, hourly) | Post expiry + booking auto-reject |
| Error monitoring | Sentry (`@sentry/node`, `@sentry/react`) | Optional; no-op without DSN |
| Frontend | React 19, Vite 7, React Router 7, Tailwind 4 | Route-level code splitting |
| Frontend state | Zustand (client) + TanStack Query 5 (server) + Axios | |
| Hosting | Vercel (frontend), Render/Railway (backend), Neon (DB) | Free/low-cost tiers |
| CI | GitHub Actions (lint, syntax-check, build, `npm audit`) | No CD yet — platforms auto-deploy from Git |

**Deliberate non-choices** (each is an ADR — see TECHNOLOGY_DECISIONS):
No TypeScript, no ORM, no Redis (yet), no Docker, no microservices. Type safety
is provided by Joi/Yup schemas, JSDoc, and `Object.freeze`n constant objects.

---

## 3. Repository Map (top level)

```
Goods Go/
├── README.md                         # Public-facing project readme
├── GoodsGo.postman_collection.json   # Importable API collection
├── docs/                             # ← THIS HANDBOOK
├── .github/
│   ├── workflows/                    # backend-ci, frontend-ci, security-audit
│   ├── DEPLOYMENT.md                 # Step-by-step deployment runbook
│   └── pull_request_template.md
├── goodsgo-backend/                  # Node/Express API (see SYSTEM_ARCHITECTURE)
└── goodsgo-frontend/                 # React/Vite SPA (see SYSTEM_ARCHITECTURE)
```

The full recursive folder tour is in
[SYSTEM_ARCHITECTURE.md § Folder Structure](./SYSTEM_ARCHITECTURE.md).

---

## 4. Conventions you must follow

These are the invariants the codebase relies on. Breaking them is how bugs and
security holes get introduced.

1. **Backend layering is strict:** `routes → middleware → controller → service →
   database`. No SQL in controllers, no business logic in routes.
2. **All SQL is parameterized** (`$1, $2, …`). User input is *never* string-
   interpolated into SQL. The only interpolated values are hardcoded column names
   from whitelists (see `buildHaversineSQL`, `ALLOWED_POST_SORT_COLUMNS`).
3. **All thrown errors are `ApiError` instances.** The global error handler
   formats them; anything else becomes a generic 500.
4. **Every async route handler is wrapped in `asyncHandler()`** so rejected
   promises reach the error handler instead of hanging the request.
5. **Enums/status strings come from `utils/constants.js`** (frozen objects) —
   never hardcode them elsewhere.
6. **Ownership is re-fetched from the DB, never trusted from the client.**
7. **Backend is CommonJS with JSDoc on exports; frontend is ESM with PropTypes
   on components.**
8. **Route ordering:** literal paths (`/search`, `/read-all`,
   `/messages/image`) are declared *before* parameterized siblings (`/:id`) so
   Express doesn't capture the literal as a param.

---

## 5. A note on secrets (read before touching `.env`)

The repository's `goodsgo-backend/.env` contains **real, live secrets** (JWT
secrets, DB URL, Cloudinary/Razorpay/Gmail credentials, and an admin password).
This handbook documents environment variables using placeholders and the
committed `.env.example` — it never reproduces real secret values, and neither
should any document, screenshot, or PR.

**Action item:** the seed/admin password observed in the working `.env`
(`ADMIN_PASSWORD` / the value `GoodsGo@2026Admin`) should be treated as
**compromised the moment it appears in any shared context** and rotated. Any
credential that has been pasted into chat, a ticket, or a doc must be rotated —
deletion later does not undo exposure. See
[SECURITY_GUIDE.md § Secrets management](./SECURITY_GUIDE.md).
