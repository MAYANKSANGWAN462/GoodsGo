<div align="center">

# 🚚 GoodsGo

### A logistics marketplace for India — *BlaBlaCar, but for goods, not passengers*

Connect people who need goods transported with transporters who have spare vehicle
capacity — especially on **return journeys**, so trucks don't drive back empty.

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2020-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-0C2451?logo=razorpay&logoColor=white)](https://razorpay.com)
[![License](https://img.shields.io/badge/License-Proprietary-lightgrey)](#license)

</div>

---

## Table of Contents

- [What is GoodsGo?](#what-is-goodsgo)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [API Overview](#api-overview)
- [Documentation](#documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What is GoodsGo?

GoodsGo is a **two-sided logistics marketplace** for the Indian market. It connects:

- **Shippers** — people/businesses that need to move goods (furniture, machinery,
  produce, household items), and
- **Transporters** — vehicle owners (trucks, tempos, pickups, containers) with
  spare cargo capacity.

The signature insight is the **return journey**: a truck that delivers Delhi→Jaipur
usually drives back empty. GoodsGo lets a transporter sell that return leg, so
shippers get cheaper transport and transporters earn on a trip they were making
anyway — less deadhead mileage, lower cost, lower emissions.

Every user has **one account** and acts as a shipper or transporter depending on
the kind of post they create. The platform earns a **configurable commission** on
every completed, escrow-paid booking.

The repository contains two applications:

- **`goodsgo-backend/`** — a Node.js / Express **REST + Socket.io** API server.
- **`goodsgo-frontend/`** — a **React 19 / Vite** single-page application.

> New here? Start with the [Engineering Handbook](./docs/ENGINEERING_HANDBOOK.md),
> then the [System Architecture](./docs/SYSTEM_ARCHITECTURE.md).

---

## Key Features

- **Three post types in one feed** — `need_transport` (goods needing a vehicle),
  `vehicle_available` (vehicle ready for cargo), and `return_journey` (transporter
  wants a load for the trip back). All share one `posts` table with a discriminator
  column and a single combined feed with filters (location radius, vehicle type,
  goods category, weight, price, dates, full-text search) and pagination.
- **Booking state machine** — 9 states
  (`pending → accepted → in_progress → completed`, with `rejected` / `withdrawn` /
  `auto_rejected` / `cancelled` / `disputed` branches), price negotiation on accept,
  an **append-only status-history audit trail**, and **race-condition-safe
  acceptance** via `SELECT … FOR UPDATE` row locks inside a transaction plus a
  partial-unique index that blocks duplicate active bookings.
- **Escrow-style payments via Razorpay** — the shipper pays on acceptance, the
  platform holds funds and records commission, funds are released on completion (or
  refunded/released by an admin). HMAC-SHA256 signature verification on both the
  checkout callback and webhooks, with **fail-closed** behavior if secrets are
  absent.
- **Real-time chat** — one conversation is auto-created per accepted booking (text
  + image messages over Socket.io), with locking/archiving that mirrors the booking
  lifecycle.
- **In-app + email + real-time notifications** — stored in the database, pushed
  live to connected users over Socket.io, with email for critical booking events.
- **Two-sided reviews** — after completion both parties may leave one role-scoped
  review each; user rating aggregates recalculate on every review write/delete.
- **Admin panel** — separate authentication (its own JWT secret and `admin_users`
  table; three-tier roles: **moderator / admin / super_admin**) covering user
  suspension, post moderation, report handling, dispute resolution, payment
  release/refund, runtime platform settings, and an admin action **audit log**.
- **Auth & security** — JWT access tokens (held in memory on the frontend) +
  **rotating refresh tokens** in httpOnly cookies with **reuse detection**, bcrypt
  (cost 12), email verification, password reset, per-endpoint rate limiting, input
  sanitization, **parameterized SQL everywhere**, Helmet CSP, and anti-enumeration
  patterns on auth endpoints.
- **Geocoding** — forward/reverse geocoding via the OpenStreetMap Nominatim API;
  nearby-post search uses Haversine distance computed in SQL.
- **Background jobs** — an hourly in-process `node-cron` job expires stale posts and
  auto-rejects stale pending bookings.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js ≥ 20, CommonJS, Express 4 |
| Database | PostgreSQL via `pg` — **no ORM** (hand-written parameterized SQL, plain SQL migrations) |
| Real-time | Socket.io 4 (server) / socket.io-client (frontend) |
| Auth | `jsonwebtoken` (separate user / refresh / admin secrets), `bcryptjs` |
| Validation | Joi (backend), Yup + React Hook Form (frontend) |
| Payments | Razorpay SDK (escrow model, HMAC verification, webhooks) |
| File storage | Cloudinary (Multer memory uploads with MIME + magic-byte verification, EXIF stripping) |
| Email | Nodemailer with a provider fallback chain: **Gmail API → Brevo → SMTP** |
| Error monitoring | Sentry (`@sentry/node`, `@sentry/react`) — optional, no-op without a DSN |
| Scheduled jobs | node-cron (in-process, hourly) |
| Frontend | React 19, Vite 7, React Router DOM 7, Tailwind CSS 4 |
| Frontend state/data | Zustand (client state), TanStack React Query 5 (server state), Axios |
| UI utilities | react-hot-toast, PropTypes, date-fns |
| Hosting | Vercel (frontend) · Render/Railway (backend) · Neon (database) · Cloudinary (media) |
| CI | GitHub Actions (lint, syntax-check, build, `npm audit`) |

> **Deliberate non-choices:** no TypeScript, no ORM, no Redis, no Docker — a
> lean-by-design architecture sized to run on free/low-cost cloud tiers. Type safety
> is achieved through Joi/Yup schemas, JSDoc, and frozen constant objects. See the
> [Architecture Decision Records](./docs/TECHNOLOGY_DECISIONS.md).

---

## Architecture

```
                 User's Browser  (React 19 SPA — Zustand + React Query)
                        │  HTTPS (REST via Axios)  +  WebSocket (socket.io-client)
                        ▼
                 Vercel  (static SPA + edge CDN + SPA rewrites)
                        │  VITE_API_URL → backend origin
                        ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │  Render / Railway — one Node process (server.js)                        │
   │   Express app  ──  helmet → cors → compression → sanitize → rate-limit  │
   │                    → /api/v1/* routers → error handler                  │
   │   Socket.io (shares the HTTP port) · node-cron (hourly maintenance)     │
   │   Layering: routes → middleware → controller → service → database       │
   └───────┬───────────────┬───────────────┬───────────────┬─────────────────┘
           ▼               ▼               ▼               ▼
     Neon Postgres     Cloudinary       Razorpay      Email (Gmail API/
     (pooled, SSL)     (images/CDN)     (escrow)       Brevo/SMTP over HTTPS)

   Cross-cutting: Sentry error monitoring on both tiers.
```

Full diagrams and the request/real-time lifecycles:
[System Architecture](./docs/SYSTEM_ARCHITECTURE.md) ·
[ER diagram](./docs/ER_DIAGRAM.md).

---

## Project Structure

```
Goods Go/
├── README.md                          # You are here
├── CONTRIBUTING.md                    # Contribution rules + Day-1 onboarding checklist
├── GoodsGo.postman_collection.json    # Importable API collection
├── docs/                              # Full engineering handbook (17 documents)
├── .github/
│   ├── workflows/                     # backend-ci · frontend-ci · security-audit
│   └── DEPLOYMENT.md                  # Step-by-step deployment runbook
├── goodsgo-backend/
│   ├── server.js                      # Entry: env validation, HTTP + Socket.io, cron, graceful shutdown
│   └── src/
│       ├── app.js                     # Express app: middleware chain, routes, error handler
│       ├── config/                    # DB pool, Socket.io, email, Cloudinary
│       ├── middleware/                # auth, validation, rate limiting, uploads, sanitize, errors
│       ├── utils/                     # constants, ApiError/ApiResponse, tokens, hashing, uploads
│       ├── db/                        # migrations/ (001–020) · seeds/ · migrate.js
│       ├── jobs/                      # hourly post expiry + booking auto-reject
│       ├── socket/                    # Socket.io handlers (auth, chat, notifications)
│       └── modules/                   # One folder per domain: auth, users, posts, location,
│                                      #   config, bookings, chat, reviews, payments,
│                                      #   notifications, admin (validator/service/controller/routes)
└── goodsgo-frontend/
    ├── vite.config.js                 # Dev server :5173, proxies /api + /socket.io to :5000
    └── src/
        ├── components/                # Feature components + components/common/ design system
        ├── pages/                     # Route pages (auth, marketplace, posts, bookings, chat, admin, …)
        ├── services/                  # Axios service per backend module (+ api.js interceptors)
        ├── hooks/                     # React Query wrappers
        ├── stores/                    # Zustand (auth, admin, theme, socket)
        ├── context/                   # Auth / Socket / Notification providers
        └── constants/                 # Route paths, statuses, post types, etc.
```

---

## Getting Started

### Prerequisites

- **Node.js ≥ 20** and npm
- A **PostgreSQL** database (the project targets [Neon](https://neon.tech)'s free
  tier; any Postgres works — migration `001` installs the required extensions)
- A **Cloudinary** account (image uploads)
- A **Razorpay** account (payments; test keys work for development)
- Email credentials (a Gmail app password for local SMTP is simplest)

### 1. Clone & install

```bash
git clone https://github.com/MAYANKSANGWAN462/GoodsGo.git
cd "Goods Go"

cd goodsgo-backend && npm install
cd ../goodsgo-frontend && npm install
```

### 2. Configure environment

Create `goodsgo-backend/.env` from `.env.example` and fill in the values (see
[Environment Variables](#environment-variables)). Generate each JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Create `goodsgo-frontend/.env` and leave `VITE_API_URL` **empty** for local dev
(requests go through the Vite proxy to `localhost:5000`).

### 3. Run migrations & seeds

```bash
cd goodsgo-backend
npm run migrate      # applies src/db/migrations/001–020 in order (idempotent)
npm run seed:all     # vehicle types, goods categories, platform settings, admin user
```

> ⚠️ **Override `ADMIN_PASSWORD`** before seeding — never keep the placeholder, and
> rotate it if it has ever been shared.

### 4. Start the apps

```bash
# Terminal 1 — backend → http://localhost:5000
cd goodsgo-backend && npm run dev

# Terminal 2 — frontend → http://localhost:5173
cd goodsgo-frontend && npm run dev
```

Open <http://localhost:5173>. The backend health check is at
<http://localhost:5000/health>.

---

## Environment Variables

The backend **refuses to start** unless the required variables are present. Full
catalogue (purpose, who reads it, sensitivity):
[Services & Infrastructure → Environment Variables](./docs/SERVICES_AND_INFRASTRUCTURE.md#9-environment-variables-section-j--full-catalogue).

**Required (backend):**

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | HTTP port (use `5000` for local — the frontend dev proxy expects it) |
| `DATABASE_URL` | PostgreSQL connection string (SSL in production) |
| `JWT_SECRET` | Secret for user access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (**must differ** from `JWT_SECRET`) |
| `JWT_ADMIN_SECRET` | Separate secret for admin tokens |

**Common optional (backend):** `JWT_*_EXPIRES_IN`, `FRONTEND_URL`,
`DB_POOL_MIN/MAX`, `CLOUDINARY_*`, `EMAIL_*` / `BREVO_API_KEY` / `GMAIL_*`,
`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`,
`ADMIN_EMAIL/PASSWORD/FULL_NAME`, `SENTRY_DSN`, `BOOKING_AUTO_REJECT_HOURS`.

**Frontend:** `VITE_API_URL` (empty for local dev; the deployed backend URL in
production), and optionally `VITE_SENTRY_DSN` + build-time
`SENTRY_AUTH_TOKEN/ORG/PROJECT`.

> 🔒 Never commit `.env` (it is git-ignored). Never paste real secret values into
> issues, PRs, or docs — see [Security → Secrets](./docs/SECURITY_GUIDE.md#10-secrets-management).

---

## Scripts

**Backend** (`goodsgo-backend/`):

| Script | Purpose |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Production start (`node server.js`, graceful SIGTERM handling) |
| `npm run migrate` | Apply SQL migrations |
| `npm run seed:all` | Run all seed scripts (also: `seed:vehicles`, `seed:categories`, `seed:settings`, `seed:admin`, `seed:demo`) |

**Frontend** (`goodsgo-frontend/`):

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server on :5173 with API/WebSocket proxy |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

---

## API Overview

All endpoints are versioned under **`/api/v1`** and use a consistent envelope:
`{ success, message, data, meta, errors, code }`. A ready-to-import **Postman
collection** is at the repo root (`GoodsGo.postman_collection.json`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check (server + DB) |
| `POST` | `/api/v1/auth/{register,login,logout,refresh-token}` | Account + session |
| `POST` | `/api/v1/auth/{forgot-password,reset-password,verify-email,resend-verification}` | Email/password flows |
| `POST` | `/api/v1/auth/admin/login` | Admin login (separate JWT) |
| `GET/PUT/DELETE` | `/api/v1/users/me` | Own profile (+ avatar, password, sub-resources) |
| `GET` | `/api/v1/users/:userId` | Public profile |
| `GET/POST` | `/api/v1/posts` | Marketplace feed (filters + pagination) / create |
| `GET` | `/api/v1/posts/{search,nearby}` | Full-text / geo-radius search |
| `GET/PUT/DELETE` | `/api/v1/posts/:postId` | Post detail, edit, delete (+ status, save, report) |
| `POST/GET` | `/api/v1/bookings` | Create / list bookings |
| `PUT` | `/api/v1/bookings/:id/{accept,reject,withdraw,cancel,mark-in-progress,complete,dispute}` | State transitions |
| `GET/POST` | `/api/v1/chat/:id/messages` (+ `/messages/image`) | Chat history / send |
| `POST` | `/api/v1/reviews` | Leave a review on a completed booking |
| `POST` | `/api/v1/payments/{initiate,verify,webhook}` | Razorpay order, verify, webhooks |
| `GET` | `/api/v1/location/{geocode,reverse-geocode}` | Nominatim geocoding |
| `GET` | `/api/v1/config/options` | Reference data (vehicle types, goods categories) |
| `*` | `/api/v1/admin/...` | Admin panel (role-gated + audited) |

Real-time events (chat, typing, read receipts, notifications, status changes) are
delivered over **Socket.io** on the same port. Full reference:
[API Reference](./docs/API_REFERENCE.md).

---

## Documentation

This repository ships a complete engineering handbook in [`docs/`](./docs/README.md):

| Document | Covers |
|---|---|
| [Engineering Handbook](./docs/ENGINEERING_HANDBOOK.md) | Overview, personas, business model, conventions |
| [System Architecture](./docs/SYSTEM_ARCHITECTURE.md) | Diagrams, request/real-time lifecycles, folder tour |
| [Project Deep Dive](./docs/PROJECT_DEEP_DIVE.md) | File-by-file + per-module documentation |
| [Database Guide](./docs/DATABASE_GUIDE.md) | Tables, indexes, constraints, transactions, locking |
| [ER Diagram](./docs/ER_DIAGRAM.md) | Mermaid entity–relationship diagram |
| [API Reference](./docs/API_REFERENCE.md) | Every REST endpoint + Socket.io event |
| [Security Guide](./docs/SECURITY_GUIDE.md) | Every mechanism, attack, mitigation |
| [Technology Decisions](./docs/TECHNOLOGY_DECISIONS.md) | Comparisons, dependency reference, ADRs |
| [Services & Infrastructure](./docs/SERVICES_AND_INFRASTRUCTURE.md) | Razorpay, Cloudinary, Sentry, Neon, email, Socket.io, env vars |
| [Performance](./docs/PERFORMANCE_ANALYSIS.md) · [Failure](./docs/FAILURE_ANALYSIS.md) · [Scalability](./docs/SCALABILITY_GUIDE.md) | Bottlenecks, failure modes, 100→1M users |
| [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) | CI/CD, platforms, rollback, monitoring |
| [Future Roadmap](./docs/FUTURE_ROADMAP.md) | Limitations, tech debt, AI/ML backlog |
| [Interview Guide](./docs/INTERVIEW_GUIDE.md) | Categorized Q&A with model answers |
| [Bookings — Line by Line](./docs/modules/BOOKINGS_LINE_BY_LINE.md) | A worked example of every core pattern |

---

## Testing

There is **no automated test framework yet** (a known item of technical debt — see
the [roadmap](./docs/FUTURE_ROADMAP.md)). What exists today:

- `goodsgo-backend/e2e-test.js` — a manual end-to-end journey script:
  `node e2e-test.js` against a running local server + database.
- Diagnostic scripts: `test-db.js`, `check-db-tables.js`, `check-seeds.js`,
  `check-rate-limit.js`, `purge-test-data.js`.
- The Postman collection for manual API exercise.

CI (GitHub Actions) validates every push/PR: backend syntax-check + `npm audit`,
frontend lint + build + `npm audit`, and a weekly dependency scan.

---

## Deployment

| Component | Platform | Notes |
|---|---|---|
| Frontend | **Vercel** | Static SPA on the edge CDN; `vercel.json` handles SPA rewrites + asset caching |
| Backend | **Render** (or Railway) | `railway.json` runs `npm run migrate && npm start`; health-checked at `/health` |
| Database | **Neon** | Serverless Postgres, SSL, connection-pooled |
| Media | **Cloudinary** | Images + CDN + transforms |
| Email | **Gmail API / Brevo (HTTPS)** | Free hosts block SMTP ports, so email sends over HTTPS |

Deploys happen automatically via each platform's native GitHub integration.
Step-by-step runbook: [`.github/DEPLOYMENT.md`](./.github/DEPLOYMENT.md);
concepts + rollback/DR: [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md).

---

## Roadmap

Near-term hardening and highest-leverage improvements:

- ✅ Core marketplace, bookings, escrow payments, chat, reviews, admin panel
- ⏳ Automated test suite (unit + integration + E2E) as a CI gate
- ⏳ **Redis** — Socket.io adapter (horizontal scale), distributed rate limiting,
  caching, and a background-job queue
- ⏳ Real payout rails (Razorpay Route), web/mobile push notifications
- ⏳ PostGIS for geo-search, keyset pagination, read replicas
- 🔭 Native mobile apps, ML match recommendations & dynamic pricing, service
  extraction

Full, prioritized backlog: [Future Roadmap](./docs/FUTURE_ROADMAP.md).

---

## Contributing

Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** — it includes a Day-1
onboarding checklist and the non-negotiable architecture rules. In short:

- Strict backend layering: `routes → middleware → controller → service → database`
  (no SQL in controllers, no business logic in routes).
- All SQL parameterized; all thrown errors are `ApiError`; every async handler
  wrapped in `asyncHandler()`.
- Backend is CommonJS with JSDoc on exports; frontend is ESM with PropTypes.
- No TypeScript, ORM, Redis, or Docker — these are deliberate decisions (discuss
  first).
- Branch off `develop`; conventional commits (`type(scope): description`); CI must
  pass.

---

## License

Proprietary — © GoodsGo. All rights reserved. (Update this section if you adopt an
open-source license.)
