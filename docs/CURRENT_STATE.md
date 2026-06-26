# GoodsGo — Current Development State

> **Purpose:** Concise snapshot of where development stands right now.  
> **Last updated:** 2026-06-26 (after Block L — Chat REST API)  
> **Source of truth for architecture/requirements:** `docs/PROJECT_CONTEXT.md`

---

## Current Project Phase

Backend MVP — Block L complete. The Chat module is now fully implemented: both the REST API (Block L) and the Socket.io event handlers (Block J) are live. Clients can fetch conversation lists, view message history, send text messages, and upload image messages via HTTP. Real-time delivery continues via socket events. Frontend not started. Reviews, Payments, Admin modules not yet built.

---

## Overall Progress

| Area | Progress | Notes |
|---|---|---|
| Backend | ~80% complete (94 / 99+ planned files) | Syntax-validated; never run against a live database |
| Frontend | 0% | Zero files exist |
| Database | Schema 100% designed, 18 migrations written | Never executed against a real Postgres instance |
| Deployment | 0% | No hosting account confirmed, no CI/CD |

---

## Completed Blocks (in order)

`A → B → C → D → E → F → H → K → I → J → L`

Block L included:
- **`src/modules/chat/chat.validator.js`** — 4 Joi schemas: `conversationIdParamSchema`, `sendMessageSchema`, `listMessagesQuerySchema`, `listConversationsQuerySchema`.
- **`src/modules/chat/chat.service.js`** — 5 exported functions: `getMyConversations`, `getConversationById`, `getMessages`, `sendMessage`, `sendImageMessage`.
- **`src/modules/chat/chat.controller.js`** — 5 thin asyncHandler-wrapped handlers.
- **`src/modules/chat/chat.routes.js`** — 5 routes mounted at `/api/v1/chat`.
- **`src/utils/constants.js`** — `CLOUDINARY_FOLDERS.CHAT` and `RATE_LIMITS.CHAT_MESSAGE` added.
- **`src/utils/uploadImage.js`** — `uploadChatImage` function added and exported.
- **`src/middleware/upload.middleware.js`** — `uploadSingleImage` middleware added and exported.
- **`src/middleware/rateLimiter.middleware.js`** — `chatMessageLimiter` (60/min/user) added and exported.
- **`src/app.js`** — `// BLOCK L:` placeholder replaced with live `app.use('/api/v1/chat', ...)` mount.
- **`src/modules/users/users.routes.js`** — `GET /me/conversations` wired before `/:userId` route.

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
| **Chat REST API** (`chat.validator.js`, `chat.service.js`, `chat.controller.js`, `chat.routes.js`) | **L** | **Complete** — full chat feature now functional (REST + Socket) |

---

## Partially Completed Modules

| Module | What Exists | What Is Missing |
|---|---|---|
| **Payments** | DB schema (migration 013). `payment_deadline` set on acceptance; `auto_release_at` set on completion. | No payment service, no Razorpay SDK calls, no webhook handler. `razorpay` npm package also missing. Block N not started. |
| **Admin** | `adminAuth.middleware.js` fully built. `admin_users`, `platform_settings`, `reported_posts` tables exist. | No admin service/controller/routes. `logAdminAction` references `admin_audit_logs` table that does not exist. Block O not started. |

---

## Pending Modules (Not Started)

- **Block M** — Reviews module (4 files)
- **Block N** — Payments module (4 files; requires `razorpay` installed first)
- **Block O** — Admin module (3 files; requires `disputes` + `admin_audit_logs` tables first)
- **Frontend** — Zero files; full planned stack documented in `PROJECT_CONTEXT.md` Section 7

---

## Current Active Module

None in progress. **Block M (Reviews)** is the designated next block.

---

## Current Milestone

Block M — Build the Reviews module so that after a booking is completed, both parties can leave a review and ratings are updated.

---

## Exact Next Development Task

**Block M — Reviews Module (4 files):**

1. `src/modules/reviews/reviews.validator.js` — Joi schemas:
   - `createReviewSchema` — body: `{ rating (1–5), comment, reviewRole ('as_customer'|'as_transporter') }`
   - `reviewIdParamSchema` — UUID param
   - `listUserReviewsQuerySchema` — query: `{ page, limit }`

2. `src/modules/reviews/reviews.service.js`:
   - `createReview(bookingId, reviewerId, rating, comment, reviewRole)` — insert review, recalculate reviewee rating aggregate on users table
   - `getBookingReviews(bookingId, userId)` — fetch both reviews for a booking (parties only)
   - `getMyReviews(userId, page, limit)` — reviews I have written
   - `getUserReviews(revieweeId, page, limit)` — reviews visible on a public profile
   - `deleteReview(reviewId, userId)` — within `review_edit_window_hours`, owner can delete

3. `src/modules/reviews/reviews.controller.js` — thin asyncHandler handlers

4. `src/modules/reviews/reviews.routes.js`:
   - `POST /api/v1/reviews` — create review
   - `GET /api/v1/reviews/bookings/:bookingId` — get both reviews for a booking
   - `GET /api/v1/reviews/users/:userId` — public reviews for a user
   - Wire `GET /me/reviews` into `users.routes.js`.
   - Wire `app.use('/api/v1/reviews', ...)` into `app.js` replacing `// BLOCK M:`.

**Pre-conditions:**
- Block L complete: chat fully wired ✓
- migration 012 (`reviews` table with compound unique index on `booking_id + reviewer_id + review_role`) ✓
- `notifications.service.createNotification()` available for `review_received` event ✓
- `REVIEW_ROLES`, `NOTIFICATION_TYPES.REVIEW_RECEIVED` in `constants.js` ✓

---

## Known Blockers

| Priority | Issue | Location | Effect |
|---|---|---|---|
| 🔴 P0 | `disputes` table does not exist | `bookings.service.js: raiseDispute()` | `PUT /bookings/:id/dispute` throws 500. |
| 🔴 P0 | `admin_audit_logs` table does not exist | `adminAuth.middleware.js: logAdminAction()` | Will throw when Block O wires admin routes. |
| 🟠 P1 | `razorpay` missing from `package.json` | Not yet triggered | Will fail at Block N. Fix: add `"razorpay": "^2.9.4"`. |
| 🟡 P2 | `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_FULL_NAME` not in `.env.example` | `seed_admin.js` | Functional with insecure hardcoded fallback defaults. |
| 🟡 P2 | Stale JSDoc in `logAdminAction` references "migration 022" | `adminAuth.middleware.js` | Cosmetic; correct when Block O is built. |

---

## Important TODOs

- [ ] Run `npm install` — lock in `"axios": "^1.7.9"` added in Block I
- [ ] Get user approval to add migration files for `disputes` + `admin_audit_logs` (locked at 18)
- [ ] Build Block M (Reviews)
- [ ] Connect to a real PostgreSQL instance (Neon.tech) and run migrations + seeds
- [ ] Build Blocks N → O in that order
- [ ] Begin frontend project once backend blocks are confirmed stable against a live DB

---

## Recently Completed Work

- **Block L — Chat REST API:**
  - `chat.validator.js` — 4 Joi schemas
  - `chat.service.js` — 5 service functions with full participation verification, active-status guards, Cloudinary orphan cleanup on image message failure, and socket event emission
  - `chat.controller.js` — 5 thin asyncHandler controllers
  - `chat.routes.js` — 5 routes; image route declared before text route per declaration-order rule
  - `constants.js` — `CLOUDINARY_FOLDERS.CHAT` + `RATE_LIMITS.CHAT_MESSAGE` added
  - `uploadImage.js` — `uploadChatImage` function added
  - `upload.middleware.js` — `uploadSingleImage` middleware added
  - `rateLimiter.middleware.js` — `chatMessageLimiter` (60/min/user) added
  - `app.js` — `// BLOCK L:` placeholder replaced with live mount
  - `users.routes.js` — `GET /me/conversations` wired before `/:userId`
  - All 10 files passed `node --check` syntax validation.

---

## Recommended Next Steps

1. `npm install` — lock in axios addition.
2. Connect a real Neon.tech Postgres instance and run all 18 migrations + 4 seed scripts.
3. Manually test Block L REST endpoints against the live server.
4. Build Block M (Reviews) — unlocks post-booking trust signals.
5. Raise migration-lock question and get sign-off on `disputes`/`admin_audit_logs` tables before starting Block O.
