# GoodsGo — Interview Talk Track

> One page to read before an interview. Everything you need to *talk* about the
> project confidently. Lead with **what** you built, then **why** you made each
> choice — interviewers reward tradeoff reasoning, not folder tours.

---

## 1. The 30-second pitch

> "GoodsGo is a logistics marketplace for the Indian market — think *BlaBlaCar for
> goods*. Drivers who already have empty space in a truck/van post their route and
> capacity; people who need to move goods find that trip, book capacity, pay
> through escrow, chat in real time, and rate each other afterward. I built it as a
> production-grade full-stack app: a React SPA and a Node/Express backend on
> PostgreSQL, with real payments, real-time chat, KYC, and an admin panel."

Then let them pick a thread to pull. Have the details below ready.

---

## 2. What it actually does (features)

- **Auth** — email/password (JWT) + **Google OAuth**, email verification, password reset.
- **Posts** — a driver lists a trip: route, date, vehicle type, capacity, price, images.
- **Search/Feed** — browse & filter available trips (paginated).
- **Bookings** — request → driver accepts/rejects → in-transit → completed, with a full status-history trail.
- **Payments** — Razorpay-backed **escrow**: money is held, released on completion.
- **Chat** — real-time 1:1 messaging over Socket.IO between the two parties of a booking.
- **Reviews/ratings** — two-sided, only after a completed booking (trust signal).
- **Notifications** — in-app + email on key events.
- **Admin panel** — moderation (reported posts), disputes, users, platform settings, audit log.

---

## 3. Tech stack (and the one-line "why")

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React 19 + Vite** | Fast dev/build, modern hooks; Vite for instant HMR + small bundles |
| Client state | **Zustand** | Auth token, theme, socket — tiny, no boilerplate vs Redux |
| Server state | **TanStack Query** | Caching, background refetch, cache invalidation on mutations — don't hand-roll fetch |
| Styling | **Tailwind v4** + design tokens | Consistency, dark mode via semantic CSS variables |
| Forms | **react-hook-form + yup** | Uncontrolled = fewer re-renders, schema validation |
| Backend | **Node.js + Express** | Modular monolith; JS end-to-end lowers context switching |
| DB | **PostgreSQL (Neon)** | Relational data with money + state machines needs ACID, not NoSQL |
| Real-time | **Socket.IO** | Shares the HTTP port, handles reconnection/fallbacks |
| Payments | **Razorpay** | India-first payment gateway, supports escrow flow |
| Media | **Cloudinary** | Offload image storage + on-the-fly `f_auto/q_auto` optimization |
| Errors | **Sentry** | Production error tracking, front + back |
| Validation | **Joi** (backend), **yup** (frontend) | Never trust client input; validate at the edge |
| Hosting | **Render** (API), **Vercel** (SPA), **Neon** (DB) | Free-tier, git-push deploys |

---

## 4. Architecture — how a request flows

```
React SPA (Vercel/CDN)
   │  HTTPS (REST)  +  WebSocket (chat)
   ▼
Node/Express modular monolith (Render)
   │  routes → controller → service → DB
   ▼
PostgreSQL (Neon)   +   External: Cloudinary, Razorpay, Sentry, Email
```

- **Modular monolith**: one deployable, but each domain lives in `modules/*`
  (`auth`, `posts`, `bookings`, `payments`, `chat`, `reviews`, `admin`, …).
- **Strict layering, 4 files per module**: `routes` (wire middleware) → `controller`
  (translate HTTP ⇄ service) → `service` (all business logic + SQL) → `validator`
  (Joi schemas). **No SQL in controllers, no logic in routes.**
- **Request lifecycle**: middleware chain → auth guard → validate body → controller →
  service → DB → standard JSON envelope response.
- Socket.IO and the cron jobs run **in the same process** (fine at MVP scale).

**Why a modular monolith, not microservices?** At MVP scale one deployable is
cheaper to build, reason about, and operate. Microservices add network hops,
distributed transactions, and ops overhead for zero benefit here. Boundaries are
enforced *in code*, so extracting a service later (say, chat) is "copy a folder,"
not a rewrite. I'd only split when one domain needs independent scaling or ownership.

---

## 5. The hard problems (your best interview material)

**1. Booking race condition — two people book the last slot.**
Capacity is decremented inside a **DB transaction** with row locking so concurrent
bookings can't oversell. The booking is a **state machine**
(`requested → accepted → in_transit → completed / rejected / cancelled`) and every
transition is recorded in `booking_status_history`. Illegal transitions are rejected
in the service layer, not trusted from the client.

**2. Escrow payments — holding money safely.**
Razorpay order created up front; funds are **held**, and only **released on
booking completion**. Payment state is tracked in its own `payments` table so it can
be reconciled independently of booking state. Webhooks/verification confirm payment
before state advances — never trust the client to say "I paid."

**3. Real-time chat.**
Socket.IO rooms scoped to a booking's two parties. Auth on the socket handshake
(JWT), so you can't join a conversation you're not part of. Messages persist to
Postgres (`messages` / `conversations`) so history survives reconnects; the socket
is for live delivery, the DB is the source of truth.

**4. Email deliverability (a real production war story).**
Free hosts (Railway/Render) **block outbound SMTP ports**, so email silently failed.
I moved to a **fallback dispatcher**: Gmail API over HTTPS (OAuth2) in production →
Brevo → SMTP for local dev. Had to publish the Google OAuth app to production so the
refresh token wouldn't expire every 7 days. Good story about debugging infra you
don't control.

**5. Auth token security (see §7).**

---

## 6. Data model highlights

~21 migrations, single Postgres DB. Core tables:
`users`, `posts` (+ `post_images`), `bookings` (+ `booking_status_history`),
`conversations` + `messages`, `payments`, `reviews`, `notifications`,
`saved_posts`, `reported_posts`, `disputes`, `admin_users`, `platform_settings`,
`admin_audit_logs`, plus `refresh_tokens` / `email_verifications` / `password_resets`.

Talking points:
- **Migrations, not an ORM sync** — versioned, ordered SQL files = reproducible schema.
- **History/audit tables** (`booking_status_history`, `admin_audit_logs`) — auditability for money + moderation.
- **`platform_settings`** table — fees/limits are config in the DB, not hardcoded (cached with 60s TTL).
- Indexes on hot query paths; pagination everywhere (no unbounded `SELECT *`).

---

## 7. Security (they will ask)

- **Access token in memory** (Zustand), **not localStorage** → smaller XSS theft surface, 15-min TTL.
- **Refresh token in an httpOnly cookie** JS can't read → silent refresh via an Axios interceptor on 401.
- **Passwords** hashed with bcrypt. **Joi validation** on every input — never trust the client.
- **Helmet** (security headers), **CORS** locked to the frontend origin, **express-rate-limit** on auth endpoints.
- **Authorization checks in the service layer** — e.g. you can only see bookings/chats you're a party to.
- Separate **admin JWT secret** so admin tokens can't be forged from user tokens.

---

## 8. Deployment & infra

- **Backend → Render**, **Frontend → Vercel**, **DB → Neon** (all free tier, git-push deploys).
- Migrated off Railway because of the SMTP-port block (see §5).
- **Cloudinary** for images with `f_auto/q_auto` + lazy loading; `compression` middleware (~65% smaller responses).
- **Frontend perf**: route-level code splitting with `React.lazy` (shrank initial JS ~796 kB → ~454 kB) + idle prefetch.
- **Sentry** on both ends for error tracking.

---

## 9. Rapid-fire Q&A

- **Why Postgres over MongoDB?** Money, bookings, and state machines are relational and need ACID transactions. NoSQL would push consistency into app code.
- **Why Zustand *and* React Query?** They solve different problems — Zustand = client state, Query = server cache. Don't store server data in Zustand and re-invent caching.
- **How do you prevent overselling capacity?** Transaction + row lock on the decrement (§5.1).
- **What if the payment succeeds but the server crashes?** Payment lives in its own table and is verified via webhook/status, so state can be reconciled — booking doesn't advance until payment is confirmed.
- **How is chat secured?** JWT on the socket handshake + room membership checks; DB is source of truth.
- **How would you scale this?** Split the socket layer with a Redis adapter, move cron to a worker, add read replicas, extract high-traffic domains to services. Not needed at MVP.
- **Biggest challenge?** The email/SMTP infra debugging — a reminder that "works locally" ≠ "works in prod."

---

## 10. Honest weaknesses / what you'd improve

Say these *proactively* — it reads as senior.

- **No automated test suite** — verification was manual + an e2e script. First thing I'd add: unit tests on services, integration tests on the booking/payment flow.
- **Single process** — Socket.IO + cron share the API process; I'd extract them before scaling horizontally (needs a Redis Socket.IO adapter for multi-instance).
- **Free-tier cold starts** on Render add latency on first hit.
- A few **pre-existing npm audit** items I'd triage.
- Payment flow is happy-path solid; I'd harden **idempotency** and reconciliation for edge cases at higher volume.

---

### How to use this in the room
1. Open with the §1 pitch.
2. Let them steer; go deep on §5 (hard problems) — that's where you shine.
3. Always end an answer with the **tradeoff**: "I chose X over Y because Z, and I'd revisit it when W."
