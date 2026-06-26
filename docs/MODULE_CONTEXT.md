# GoodsGo — Module Context
> **Active status:** Backend MVP complete — all planned backend modules implemented through Block O.  
> Replace this file when beginning the next development phase.

---

## Backend Status

All planned backend modules are complete. The implementation sequence was:

`A → B → C → D → E → F → H → K → I → J → L → M → N → O`

| Block | Module | Status |
|---|---|---|
| A | Core utilities & infrastructure | Complete |
| B | Config layer | Complete |
| C | Middleware stack | Complete |
| D | Database migrations (001–018) + seeds | Complete |
| E | Auth | Complete |
| F | Users | Complete |
| H | Location, Posts, Config routes, Cron job | Complete |
| K | Bookings | Complete |
| I | Notifications | Complete |
| J | Socket handlers | Complete |
| L | Chat REST API | Complete |
| M | Reviews | Complete |
| N | Payments (Razorpay) | Complete |
| O | Admin | Complete — migrations 019/020 added |

---

## Recommended Next Phase

### Option A — Frontend Integration (highest product value)

The backend API is now complete and stable. All endpoints documented in `docs/PROJECT_CONTEXT.md` Section 11 are live.

**Frontend tech stack (planned):** React 18 + Vite, React Router v6, Tailwind CSS, Axios, Zustand, TanStack React Query, React Hook Form + Yup, Leaflet/react-leaflet, Socket.io-client, PropTypes.

**Starting point:** `goodsgo-frontend/` (Vite+React scaffold exists).

**Key integration notes:**
- Backend response envelope: `{ success, message, data?, meta?, errors?, code? }` — wrap in a single Axios interceptor.
- Access token: hold in memory (Zustand), never localStorage.
- Refresh token: httpOnly cookie; Axios must use `withCredentials: true`.
- Reference data (vehicle types, goods categories): fetch from `GET /api/v1/config/options` at startup.
- Admin panel: separate login flow using admin JWT (`JWT_ADMIN_SECRET`); never mix with user token storage.

### Option B — Production Deployment

**Pre-conditions:**
1. `npm install` in `goodsgo-backend/` to install `razorpay@^2.9.4`.
2. Provision a Neon.tech Postgres instance.
3. Run `npm run migrate` to apply all 20 migrations.
4. Run all 4 seed scripts (`npm run seed:admin`, `npm run seed:vehicle-types`, `npm run seed:goods-categories`, `npm run seed:platform-settings`).
5. Configure `.env` with all required variables (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, JWT_ADMIN_SECRET, Cloudinary credentials, email SMTP credentials, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME).
6. Deploy to Render/Railway.

### Option C — KYC / Identity Verification (deferred feature)

**What exists:** `uploadImage.js` has `uploadIdentityDocument()` and `generateSignedUrl()` helpers; `CLOUDINARY_FOLDERS.KYC` constant exists; `users.is_identity_verified` column exists.

**What is needed:** A new migration (021_create_identity_documents.sql), a full four-file module (`identity.validator.js`, `identity.service.js`, `identity.controller.js`, `identity.routes.js`), and admin approval workflow wired into the existing admin module.

---

## Known Open Issues (carry-forward)

| Priority | Issue | Notes |
|---|---|---|
| 🟠 P1 | `razorpay` npm package not yet installed | Run `npm install` in `goodsgo-backend/` |
| 🟡 P2 | `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_FULL_NAME` not in `.env.example` | `seed_admin.js` has hardcoded insecure fallbacks |
| 🟡 P2 | `logAdminAction` target_id null for `:reportId` and `:disputeId` routes | Minor audit log limitation; action_type + target_type still traceable |
| 🟡 P3 | No automated test suite | All validation has been syntactic only; no integration tests against a live DB |
| 🟡 P3 | `getSetting`/`getPlatformSetting` helper duplicated in posts.service and bookings.service | Documented technical debt; consolidate when convenient |
