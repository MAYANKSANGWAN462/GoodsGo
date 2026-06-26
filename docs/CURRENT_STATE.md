# GoodsGo — Current Development State

> **Purpose:** Concise snapshot of where development stands right now.  
> **Last updated:** 2026-06-26 (after Block M — Reviews Module)  
> **Source of truth for architecture/requirements:** `docs/PROJECT_CONTEXT.md`

---

## Current Project Phase

Backend MVP — Block M complete. The Reviews module is now fully implemented: both parties to a completed booking can submit reviews, ratings are recalculated on every write/delete, review-received notifications fire automatically, and the platform-configured edit window is enforced on deletion. Frontend not started. Payments, Admin modules not yet built.

---

## Overall Progress

| Area | Progress | Notes |
|---|---|---|
| Backend | ~85% complete (98 / 105 planned files) | Syntax-validated; never run against a live database |
| Frontend | 0% | Zero files exist |
| Database | Schema 100% designed, 18 migrations written | Never executed against a real Postgres instance |
| Deployment | 0% | No hosting account confirmed, no CI/CD |

---

## Completed Blocks (in order)

`A → B → C → D → E → F → H → K → I → J → L → M`

Block M included:
- **`src/modules/reviews/reviews.validator.js`** — 5 Joi schemas: `createReviewSchema`, `reviewIdParamSchema`, `bookingIdParamSchema`, `userIdParamSchema`, `listReviewsQuerySchema`.
- **`src/modules/reviews/reviews.service.js`** — 5 exported functions: `createReview`, `getBookingReviews`, `getMyReviews`, `getUserReviews`, `deleteReview`. Includes lazy-require notification pattern, local `getPlatformSetting()` helper, and `formatReview()` formatter.
- **`src/modules/reviews/reviews.controller.js`** — 5 thin asyncHandler-wrapped handlers.
- **`src/modules/reviews/reviews.routes.js`** — 4 routes mounted at `/api/v1/reviews`; literal-path routes (`/bookings/:id`, `/users/:id`) declared before `/:reviewId` per Express route-ordering rule.
- **`src/app.js`** — `// BLOCK M:` placeholder replaced with live `app.use('/api/v1/reviews', ...)` mount.
- **`src/modules/users/users.routes.js`** — `GET /me/reviews` wired before `/:userId` route.

---

## Completed Modules

| Module | Block | Status |
|---|---|---|
| Core utilities & infrastructure (`ApiError`, `ApiResponse`, `asyncHandler`, `paginate`, etc.) | A | Complete |
| Config layer (`database.js`, `cloudinary.js`, `email.js`, `socket.js`) | B | Complete |
| Middleware stack (error handler, sanitize, validate, rate limiter, auth, adminAuth, upload) | C | Complete |
| Database migrations (001–018) + seeds (admin, vehicle types, goods categories, platform settings) | D | Complete |
| Auth module (register, login, logout, refresh, verify, reset, resend) | E | Complete |
| Users module (profile CRUD, avatar, password change, deactivation, public profile) | F | Complete |
| Location module (geocode, reverse-geocode) | H | Complete |
| Posts module (feed, CRUD, images, search, nearby, save, report, getPostBookings) | H | Complete |
| Config routes (`GET /config/options`) | H | Complete |
| Cron job (`expirePosts.job.js` — hourly post expiry + booking auto-reject) | H | Complete |
| Bookings module (full 9-state machine, FOR UPDATE lock, conversation auto-creation) | K | Complete (dispute endpoint broken — see Blockers) |
| Notifications module (`createNotification`, `listNotifications`, `markOneRead`, `markAllRead`) | I | Complete |
| Socket Handlers (`socket.handler.js`, `chat.socket.js`, `notification.socket.js`) | J | Complete |
| Chat REST API (`chat.validator.js`, `chat.service.js`, `chat.controller.js`, `chat.routes.js`) | L | Complete — full chat feature now functional (REST + Socket) |
| **Reviews module** (`reviews.validator.js`, `reviews.service.js`, `reviews.controller.js`, `reviews.routes.js`) | **M** | **Complete** — two-sided reviews, rating recalculation, edit-window enforcement |

---

## Partially Completed Modules

| Module | What Exists | What Is Missing |
|---|---|---|
| **Payments** | DB schema (migration 013). `payment_deadline` set on acceptance; `auto_release_at` set on completion. | No payment service, no Razorpay SDK calls, no webhook handler. `razorpay` npm package also missing. Block N not started. |
| **Admin** | `adminAuth.middleware.js` fully built. `admin_users`, `platform_settings`, `reported_posts` tables exist. | No admin service/controller/routes. `logAdminAction` references `admin_audit_logs` table that does not exist. Block O not started. |

---

## Pending Modules (Not Started)

- **Block N** — Payments module (4 files; requires `razorpay` installed first)
- **Block O** — Admin module (3 files; requires `disputes` + `admin_audit_logs` tables first)
- **Frontend** — Zero files; full planned stack documented in `PROJECT_CONTEXT.md` Section 7

---

## Current Active Module

None in progress. **Block N (Payments)** is the designated next block.

---

## Current Milestone

Block N — Integrate Razorpay for escrow-style payment processing: customer pays on acceptance, platform holds funds, releases to transporter on completion.

---

## Exact Next Development Task

**Block N — Payments Module (4 files):**

1. `src/modules/payments/payments.validator.js` — Joi schemas for payment initiation, webhook verification, refund request
2. `src/modules/payments/payments.service.js`:
   - `initiatePayment(bookingId, payerId)` — create Razorpay order, insert payments row
   - `verifyPayment(orderId, paymentId, signature)` — HMAC signature check, mark payment completed
   - `handleWebhook(event, signature)` — verify webhook signature, route to correct handler
   - `releasePayment(bookingId)` — manual escrow release (admin/cron)
   - `refundPayment(bookingId, amount, reason)` — Razorpay refund API call
3. `src/modules/payments/payments.controller.js` — thin asyncHandler handlers
4. `src/modules/payments/payments.routes.js`:
   - `POST /api/v1/payments/initiate` — create Razorpay order
   - `POST /api/v1/payments/verify` — confirm payment signature
   - `POST /api/v1/payments/webhook` — Razorpay webhook (no auth, HMAC-verified)
   - Wire `app.use('/api/v1/payments', ...)` into `app.js` replacing `// BLOCK N:`.

**Pre-conditions:**
- Block M complete ✓
- `razorpay` npm package must be installed: `npm install razorpay@^2.9.4`
- migration 013 (`payments` table with full Razorpay fields) ✓
- `PAYMENT_STATUS`, `NOTIFICATION_TYPES.PAYMENT_RECEIVED`, `NOTIFICATION_TYPES.PAYMENT_RELEASED` in `constants.js` ✓
- `bookings.service.js` already sets `payment_deadline` on accept and `auto_release_at` on complete ✓

---

## Known Blockers

| Priority | Issue | Location | Effect |
|---|---|---|---|
| 🔴 P0 | `disputes` table does not exist | `bookings.service.js: raiseDispute()` | `PUT /bookings/:id/dispute` throws 500. |
| 🔴 P0 | `admin_audit_logs` table does not exist | `adminAuth.middleware.js: logAdminAction()` | Will throw when Block O wires admin routes. |
| 🟠 P1 | `razorpay` missing from `package.json` | Not yet triggered | Will fail at Block N. Fix: `npm install razorpay@^2.9.4`. |
| 🟡 P2 | `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_FULL_NAME` not in `.env.example` | `seed_admin.js` | Functional with insecure hardcoded fallback defaults. |
| 🟡 P2 | Stale JSDoc in `logAdminAction` references "migration 022" | `adminAuth.middleware.js` | Cosmetic; correct when Block O is built. |

---

## Important TODOs

- [ ] Run `npm install` — lock in `"axios": "^1.7.9"` added in Block I
- [ ] `npm install razorpay@^2.9.4` — required before Block N
- [ ] Get user approval to add migration files for `disputes` + `admin_audit_logs` (locked at 18)
- [ ] Connect to a real PostgreSQL instance (Neon.tech) and run migrations + seeds
- [ ] Build Block N (Payments)
- [ ] Build Block O (Admin) — after disputes/admin_audit_logs tables resolved
- [ ] Begin frontend project once backend blocks are confirmed stable against a live DB

---

## Recently Completed Work

- **Block M — Reviews Module:**
  - `reviews.validator.js` — 5 Joi schemas
  - `reviews.service.js` — 5 service functions: createReview (role-validated, best-effort rating recalc), getBookingReviews (party-only), getMyReviews (paginated), getUserReviews (public, paginated), deleteReview (transactional — delete + rating recalc atomic)
  - `reviews.controller.js` — 5 thin asyncHandler controllers
  - `reviews.routes.js` — 4 routes; literal-path routes before `:reviewId` per declaration-order rule
  - `app.js` — `// BLOCK M:` placeholder replaced with live mount
  - `users.routes.js` — `GET /me/reviews` wired before `/:userId`
  - All 6 files passed `node --check` syntax validation.

---

## Recommended Next Steps

1. `npm install` — lock in axios addition.
2. `npm install razorpay@^2.9.4` — required before Block N.
3. Connect a real Neon.tech Postgres instance and run all 18 migrations + 4 seed scripts.
4. Manually test Block M REST endpoints against the live server.
5. Raise migration-lock question and get sign-off on `disputes`/`admin_audit_logs` tables before starting Block O.
6. Build Block N (Payments).
