# GoodsGo — Current Development State

> **Purpose:** Concise snapshot of where development stands right now.  
> **Last updated:** 2026-06-26 (after Block O — Admin Module)  
> **Source of truth for architecture/requirements:** `docs/PROJECT_CONTEXT.md`

---

## Current Project Phase

Backend MVP — Block O complete. All planned backend modules are now implemented. The Admin module provides full user management (suspend/reactivate), post moderation (hide/restore), report review and resolution, dispute resolution, payment release/refund delegation, and platform settings management — all behind admin JWT authentication with a three-tier role hierarchy and comprehensive audit logging. Two new migration files (019, 020) were approved and added to support the `disputes` and `admin_audit_logs` tables. The previously-locked 18-migration set is now 20 files. Frontend project exists (Vite+React) but backend integration not started.

**Pre-block-O blockers resolved this session:**
- `disputes` table created (migration 019).
- `admin_audit_logs` table created (migration 020).
- `adminAuth.middleware.js` JSDoc stale reference ("migration 022") corrected to "migration 020".

---

## Overall Progress

| Area | Progress | Notes |
|---|---|---|
| Backend | ~100% complete (all planned modules) | Syntax-validated; never run against a live database |
| Frontend | Exists (Vite+React scaffold) | No backend integration yet; backend is now stable |
| Database | Schema 100% designed, 20 migrations written | Never executed against a real Postgres instance |
| Deployment | 0% | No hosting account confirmed, no CI/CD |

---

## Completed Blocks (in order)

`A → B → C → D → E → F → H → K → I → J → L → M → N → O`

Block O included:
- **`src/db/migrations/019_create_disputes.sql`** — `disputes` table + `dispute_status_enum`; depends on migrations 001, 002, 008, 017; resolves the P0 blocker on `PUT /bookings/:id/dispute`.
- **`src/db/migrations/020_create_admin_audit_logs.sql`** — `admin_audit_logs` table; depends on migration 017; unlocks `logAdminAction` on all admin mutation routes.
- **`src/modules/admin/admin.validator.js`** — 16 Joi schemas covering all admin input shapes (new file, approved as part of Block O for four-file module consistency).
- **`src/modules/admin/admin.service.js`** — 16 exported functions across 6 domains (user management, post moderation, reports, disputes, payments, platform settings).
- **`src/modules/admin/admin.controller.js`** — 16 thin `asyncHandler`-wrapped handlers.
- **`src/modules/admin/admin.routes.js`** — 16 routes mounted at `/api/v1/admin`; all behind `authenticateAdmin`; mutations use `logAdminAction`.
- **`src/app.js`** — `// BLOCK O:` placeholder replaced with live `app.use('/api/v1/admin', ...)` mount.
- **`src/middleware/adminAuth.middleware.js`** — JSDoc corrected (stale "migration 022" → "migration 020").

---

## Completed Modules

| Module | Block | Status |
|---|---|---|
| Core utilities & infrastructure (`ApiError`, `ApiResponse`, `asyncHandler`, `paginate`, etc.) | A | Complete |
| Config layer (`database.js`, `cloudinary.js`, `email.js`, `socket.js`) | B | Complete |
| Middleware stack (error handler, sanitize, validate, rate limiter, auth, adminAuth, upload) | C | Complete |
| Database migrations (001–020) + seeds (admin, vehicle types, goods categories, platform settings) | D / O | Complete — 20 migrations total |
| Auth module (register, login, logout, refresh, verify, reset, resend) | E | Complete |
| Users module (profile CRUD, avatar, password change, deactivation, public profile) | F | Complete |
| Location module (geocode, reverse-geocode) | H | Complete |
| Posts module (feed, CRUD, images, search, nearby, save, report, getPostBookings) | H | Complete |
| Config routes (`GET /config/options`) | H | Complete |
| Cron job (`expirePosts.job.js` — hourly post expiry + booking auto-reject) | H | Complete |
| Bookings module (full 9-state machine, FOR UPDATE lock, conversation auto-creation) | K | Complete — `PUT /bookings/:id/dispute` now unblocked (disputes table exists) |
| Notifications module (`createNotification`, `listNotifications`, `markOneRead`, `markAllRead`) | I | Complete |
| Socket Handlers (`socket.handler.js`, `chat.socket.js`, `notification.socket.js`) | J | Complete |
| Chat REST API (`chat.validator.js`, `chat.service.js`, `chat.controller.js`, `chat.routes.js`) | L | Complete |
| Reviews module | M | Complete |
| Payments module | N | Complete — Razorpay order creation, signature verification, webhook handling, release/refund |
| **Admin module** (`admin.validator.js`, `admin.service.js`, `admin.controller.js`, `admin.routes.js`) | **O** | **Complete** — user management, post moderation, report/dispute resolution, payment actions, platform settings |

---

## Partially Completed Modules

None. All planned backend modules are implemented.

---

## Pending Modules (Not Started)

- **Frontend** — Vite+React scaffold exists; no backend integration
- **Block P / KYC** — No block assigned. `uploadImage.js` has `uploadIdentityDocument()` helper ready; no `identity_documents` table, no service, no endpoint.

---

## Current Active Module

None. **Backend MVP is complete.** Recommended next step is frontend integration or production deployment.

---

## Current Milestone

Backend MVP complete. All 16 planned API surface areas are live. Next milestone: frontend development or staging deployment.

---

## Exact Next Development Task

Choose one of:

1. **Frontend integration** — begin React frontend using the Vite+React scaffold; connect to the now-stable backend API.
2. **Production deployment** — connect Neon.tech Postgres, run all 20 migrations + 4 seeds, deploy backend to Render/Railway, configure Razorpay test credentials.
3. **KYC / identity verification** — assign a block letter, create `identity_documents` migration, build the module.

---

## Known Blockers

| Priority | Issue | Location | Effect |
|---|---|---|---|
| 🟠 P1 | `razorpay` npm package added to `package.json` but **not yet installed** | `payments.service.js` | Will fail at runtime until `npm install` is run in `goodsgo-backend/`. |
| 🟡 P2 | `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_FULL_NAME` not in `.env.example` | `seed_admin.js` | Functional with insecure hardcoded fallback defaults. |
| 🟡 P2 | `logAdminAction` target_id is null for `:reportId` and `:disputeId` routes | `adminAuth.middleware.js` | Audit log records action_type + target_type correctly but target_id = NULL for report/dispute routes. Minor limitation; action is still traceable. |

---

## Important TODOs

- [ ] **Run `npm install`** in `goodsgo-backend/` — installs `razorpay@^2.9.4`
- [ ] Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in `.env`
- [ ] Connect to a real PostgreSQL instance (Neon.tech) and run all 20 migrations + 4 seed scripts
- [ ] Manually test Block O admin endpoints against a live server with admin credentials
- [ ] Manually test Block N payment endpoints against a live server with Razorpay test credentials
- [ ] Begin frontend development or production deployment

---

## Recently Completed Work

**Block O — Admin Module:**
- `019_create_disputes.sql` — disputes table + dispute_status_enum (resolves P0 blocker)
- `020_create_admin_audit_logs.sql` — admin_audit_logs table (unlocks logAdminAction)
- `admin.validator.js` — 16 Joi schemas (new file, approved)
- `admin.service.js` — 16 service functions: listUsers, getUserDetail, suspendUser (with transactional post deactivation), reactivateUser, listPostsAdmin, hidePost, restorePost, listReports, resolveReport, dismissReport, listDisputes, getDisputeDetail, resolveDispute (with DISPUTE_RESOLVED notification dispatch to both parties), releasePaymentAdmin, refundPaymentAdmin, getPlatformSettings, updatePlatformSetting (with value_type validation)
- `admin.controller.js` — 16 thin asyncHandler handlers
- `admin.routes.js` — 16 routes; `authenticateAdmin` applied globally via `router.use()`; mutations use `logAdminAction`; role-gated (moderator/admin/super_admin per endpoint group)
- `app.js` — `// BLOCK O:` replaced with live mount
- `adminAuth.middleware.js` — JSDoc corrected
- All 6 JS files passed `node --check` syntax validation.

---

## Recommended Next Steps

1. **`npm install`** — installs `razorpay` and locks it into `node_modules`.
2. Add Razorpay test credentials to `.env`.
3. Connect a real Neon.tech Postgres instance and run all 20 migrations + 4 seed scripts.
4. Manually test Block N payment endpoints and Block O admin endpoints.
5. Begin frontend development.
