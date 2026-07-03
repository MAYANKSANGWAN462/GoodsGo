# GoodsGo

GoodsGo is a logistics marketplace for the Indian market, inspired by BlaBlaCar but for **goods instead of passengers**. It connects people who need goods transported with transporters who have spare vehicle capacity — especially on **return journeys**, so trucks don't drive back empty after a delivery. Every user has a single account and can act as a customer or a transporter depending on the kind of post they create; the platform earns a configurable commission on every completed, escrow-paid booking.

The repository contains two applications: a Node.js/Express REST + Socket.io backend (`goodsgo-backend/`) and a React single-page app (`goodsgo-frontend/`).

## Key Features

- **Three post types in one marketplace feed** — `need_transport` (goods needing a vehicle), `vehicle_available` (vehicle ready for cargo), and `return_journey` (transporter wants a load for the trip back). All share one `posts` table with a discriminator column and a single combined feed with filters (location radius, vehicle type, goods category, weight, price, dates, full-text search) and pagination.
- **Booking state machine** — 9 states (`pending → accepted → in_progress → completed`, with `rejected` / `withdrawn` / `auto_rejected` / `cancelled` / `disputed` branches), price negotiation on accept, an append-only status history audit trail, and race-condition-safe acceptance via `SELECT ... FOR UPDATE` row locks inside a transaction.
- **Escrow-style payments via Razorpay** — customer pays on acceptance, the platform holds funds and records commission, funds are released on completion (or refunded/released by an admin). Includes HMAC signature verification for both checkout callbacks and webhooks.
- **Real-time chat** — one conversation is auto-created per accepted booking (text + image messages over Socket.io), with conversation locking/archiving mirroring the booking lifecycle.
- **In-app + email + real-time notifications** — stored in the database, pushed live to connected users over Socket.io, with email for critical booking events.
- **Two-sided reviews** — after completion, both parties may leave one review each; user rating aggregates are recalculated on every review write/delete.
- **Admin panel** — separate authentication (own JWT secret and `admin_users` table, three-tier roles: moderator / admin / super_admin) covering user suspension, post moderation, report handling, dispute resolution, payment release/refund, platform settings, and an admin action audit log.
- **Auth & security** — JWT access tokens (in-memory on the frontend) + rotating refresh tokens in httpOnly cookies, bcrypt (cost 12), email verification, password reset, per-endpoint rate limiting, input sanitization, parameterized SQL everywhere, Helmet CSP, and anti-enumeration patterns on auth endpoints.
- **Geocoding** — forward/reverse geocoding via the OpenStreetMap Nominatim API; nearby-post search uses Haversine distance in SQL.
- **Background jobs** — an hourly in-process `node-cron` job expires stale posts and auto-rejects stale pending bookings.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js ≥ 20, CommonJS, Express 4 |
| Database | PostgreSQL via `pg` (no ORM — hand-written parameterized SQL, plain SQL migrations) |
| Real-time | Socket.io 4 (server) / socket.io-client (frontend) |
| Auth | `jsonwebtoken` (separate user/refresh/admin secrets), `bcryptjs` |
| Validation | Joi (backend), Yup + React Hook Form (frontend) |
| Payments | Razorpay SDK |
| File storage | Cloudinary (via Multer uploads with MIME + magic-byte verification) |
| Email | Nodemailer (SMTP) |
| Scheduled jobs | node-cron |
| Frontend | React 19, Vite 7, React Router DOM 7, Tailwind CSS 4 |
| Frontend state/data | Zustand (client state), TanStack React Query 5 (server state), Axios |
| UI utilities | react-hot-toast, PropTypes, date-fns |

The project deliberately uses **JavaScript only (no TypeScript)**, no ORM, no Redis, and no Docker — a lean-by-design architecture sized to run on free/low-cost cloud tiers (Neon.tech Postgres, Cloudinary, Render/Railway). Type safety is achieved through Joi/Yup schemas, JSDoc, and frozen constant objects.

## Project Structure

```
Goods Go/
├── GoodsGo.postman_collection.json # Postman collection for the API
├── goodsgo-backend/
│   ├── server.js                   # Entry point: env validation, HTTP + Socket.io, cron jobs, graceful shutdown
│   ├── e2e-test.js                 # Manual end-to-end journey test script
│   ├── check-*.js, test-db.js      # One-off diagnostic scripts (DB tables, seeds, rate limits)
│   └── src/
│       ├── app.js                  # Express app: middleware chain, route mounting, error handler
│       ├── config/                 # Database pool, Socket.io setup
│       ├── middleware/             # Auth, validation, rate limiting, sanitization, uploads, error handler
│       ├── utils/                  # Constants, ApiError/ApiResponse, tokens, hashing, image upload
│       ├── db/
│       │   ├── migrations/         # 001–020 plain SQL migrations, applied in filename order
│       │   ├── seeds/              # Vehicle types, goods categories, platform settings, admin user
│       │   └── migrate.js          # Migration runner
│       ├── jobs/                   # expirePosts.job.js (hourly post expiry + booking auto-reject)
│       ├── socket/                 # Socket.io handlers (auth, chat, notifications)
│       └── modules/                # One folder per domain, each with validator/service/controller/routes:
│                                   #   auth, users, posts, location, config, bookings,
│                                   #   chat, reviews, payments, notifications, admin
└── goodsgo-frontend/
    ├── vite.config.js              # Dev server on :5173, proxies /api and /socket.io to :5000
    └── src/
        ├── components/             # Feature components + shared components/common/
        ├── pages/                  # Route pages (auth, marketplace, posts, bookings, chat, profile, admin, …)
        ├── services/               # Axios service functions — one file per backend module
        ├── hooks/                  # Custom hooks (React Query wrappers etc.)
        ├── stores/                 # Zustand stores (user auth, admin auth, theme)
        ├── context/                # React context providers
        └── constants/              # Route paths, booking statuses, etc.
```

## Prerequisites

- **Node.js ≥ 20** (declared in `goodsgo-backend/package.json` `engines`) and npm
- **PostgreSQL** database (the project targets Neon.tech's free tier, but any Postgres works; migration 001 installs the required extensions)
- A **Cloudinary** account (image uploads: avatars, post images, chat images)
- A **Razorpay** account (payments; test keys work for development)
- SMTP credentials (email verification, password reset, booking emails) — e.g. a Gmail app password

## Setup & Installation

### 1. Clone and install

```bash
git clone <repository-url>
cd "Goods Go"

cd goodsgo-backend && npm install
cd ../goodsgo-frontend && npm install
```

### 2. Configure backend environment

Create `goodsgo-backend/.env` (note: the checked-in `.env.example` is currently empty, so use the tables below). The server validates the **required** variables at startup and exits if any is missing:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for user access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Secret for refresh tokens (must differ from `JWT_SECRET`) |
| `JWT_ADMIN_SECRET` | ✅ | Separate secret for admin tokens |
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | ✅ | HTTP port (e.g. `5000` — the frontend dev proxy expects 5000) |
| `JWT_EXPIRES_IN` | — | User access-token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | — | Refresh-token lifetime |
| `JWT_ADMIN_EXPIRES_IN` | — | Admin token lifetime |
| `FRONTEND_URL` | — | Frontend origin for CORS/CSP (defaults to `http://localhost:5173`) |
| `DB_POOL_MIN` / `DB_POOL_MAX` | — | Connection pool bounds (pool max defaults to 10) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | — | Cloudinary credentials (needed for any image upload) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_SECURE` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | — | SMTP settings for outgoing email |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | — | Razorpay API keys and webhook signing secret |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_FULL_NAME` | — | Credentials used by the admin seed script (placeholder defaults exist in `seed_admin.js` — always override them) |
| `BOOKING_AUTO_REJECT_HOURS` | — | Hours before pending bookings are auto-rejected by the cron job |

### 3. Configure frontend environment

`goodsgo-frontend/.env`:

| Variable | Description |
|---|---|
| `VITE_API_URL` | Leave **empty** for local dev (requests go through the Vite proxy to `localhost:5000`). Set to the deployed backend URL in production. |

### 4. Run migrations and seeds

```bash
cd goodsgo-backend
npm run migrate     # applies src/db/migrations/001–020 in order
npm run seed:all    # vehicle types, goods categories, platform settings, admin user
```

Individual seeds are also available: `seed:vehicles`, `seed:categories`, `seed:settings`, `seed:admin`. All seeds are idempotent.

### 5. Start the app

```bash
# Terminal 1 — backend (http://localhost:5000)
cd goodsgo-backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd goodsgo-frontend
npm run dev
```

Open http://localhost:5173. The backend health check is at http://localhost:5000/health.

## Usage & Scripts

**Backend** (`goodsgo-backend/`):

| Script | Purpose |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Start in production mode (`node server.js`) |
| `npm run migrate` | Apply SQL migrations |
| `npm run seed:all` | Run all seed scripts |

**Frontend** (`goodsgo-frontend/`):

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server on :5173 with API/WebSocket proxy |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

For production, run the backend with `npm start` (it handles `SIGTERM` gracefully for platforms like Render/Railway) and serve the frontend's `dist/` build with `VITE_API_URL` pointing at the deployed API.

## API Overview

All endpoints are versioned under `/api/v1`. Responses use a consistent envelope: `{ success, message, data, meta, errors, code }`. A ready-to-import **Postman collection** is at the repo root (`GoodsGo.postman_collection.json`). Main endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check (server + DB status) |
| POST | `/api/v1/auth/register` · `/login` · `/logout` | Account registration, login, logout |
| POST | `/api/v1/auth/refresh-token` | Rotate refresh token, issue new access token |
| POST | `/api/v1/auth/forgot-password` · `/reset-password` | Password reset flow |
| GET/POST | `/api/v1/auth/verify-email` (+ `/resend-verification`) | Email verification |
| POST | `/api/v1/auth/admin/login` | Admin login (separate JWT secret) |
| GET/PUT/DELETE | `/api/v1/users/me` | Own profile: read, update, deactivate |
| PUT | `/api/v1/users/me/password` | Change password |
| POST/DELETE | `/api/v1/users/me/avatar` | Upload / remove avatar |
| GET | `/api/v1/users/me/{posts,saved-posts,bookings,conversations,reviews,notifications}` | Own sub-resources |
| GET | `/api/v1/users/:userId` | Public profile |
| GET/POST | `/api/v1/posts` | Marketplace feed (filters + pagination) / create post |
| GET | `/api/v1/posts/search` · `/posts/nearby` | Full-text search / geo radius search |
| GET/PUT/DELETE | `/api/v1/posts/:postId` | Post detail, edit, delete |
| PUT | `/api/v1/posts/:postId/status` | Change post status |
| POST | `/api/v1/posts/:postId/save` · `/report` | Save/unsave, report a post |
| GET | `/api/v1/posts/:postId/bookings` | Booking requests on own post |
| POST/GET | `/api/v1/bookings` | Create booking request / list own bookings |
| PUT | `/api/v1/bookings/:id/{accept,reject,withdraw,cancel,mark-in-progress,complete,dispute}` | Booking state transitions |
| GET | `/api/v1/bookings/:id/history` | Booking status audit trail |
| GET | `/api/v1/chat` · `/chat/:id` | Conversation list / detail |
| GET/POST | `/api/v1/chat/:id/messages` (+ `/messages/image`) | Message history / send text or image |
| POST | `/api/v1/reviews` | Leave a review on a completed booking |
| GET | `/api/v1/reviews/bookings/:bookingId` · `/reviews/users/:userId` | Reviews for a booking / a user |
| POST | `/api/v1/payments/initiate` · `/verify` · `/webhook` | Razorpay order creation, signature verification, webhooks |
| GET | `/api/v1/location/geocode` · `/reverse-geocode` | Nominatim geocoding |
| GET | `/api/v1/config/options` | Reference data (vehicle types, goods categories) |
| * | `/api/v1/admin/...` | Admin panel: users, posts, reports, disputes, payment release/refund, platform settings |

Real-time events (chat messages, typing indicators, notifications) are delivered over **Socket.io** on the same port as the REST API.

## Testing

There is **no automated test framework yet** (a known item of technical debt). What exists instead:

- `goodsgo-backend/e2e-test.js` — a manual end-to-end journey script run against a locally running server and database: `node e2e-test.js`
- Diagnostic scripts in `goodsgo-backend/`: `test-db.js`, `check-db-tables.js`, `check-seeds.js`, `check-rate-limit.js`, `purge-test-data.js`
- The Postman collection at the repo root for manual API exercise

## Contributing

When making changes, keep to the project's established conventions:

- Strict backend layering: `routes → middleware → controller → service → database` — no SQL in controllers, no business logic in routes.
- All SQL parameterized (`$1, $2, …`); all thrown errors are `ApiError` instances; every async route handler wrapped in `asyncHandler()`.
- Backend is CommonJS with JSDoc on every exported function; frontend is ESM with `propTypes` on every component that accepts props.
- No TypeScript, ORM, Redis, or Docker — these are deliberate architecture decisions.
- Conventional commits: `type(scope): description` (e.g. `feat(bookings): add dispute endpoint`).
