# Contributing to GoodsGo

Welcome. This guide gets you productive and keeps the codebase consistent. It
pairs with the full [engineering handbook](./docs/README.md) — read the
[Engineering Handbook](./docs/ENGINEERING_HANDBOOK.md) and
[System Architecture](./docs/SYSTEM_ARCHITECTURE.md) before your first change.

---

## 1. New-engineer onboarding checklist (Day 1)

Work through this top to bottom. Tick each box.

### Access & accounts
- [ ] GitHub repo access (`MAYANKSANGWAN462/GoodsGo`).
- [ ] Dashboards you'll likely need: **Neon** (DB), **Render/Railway** (backend),
      **Vercel** (frontend), **Cloudinary**, **Razorpay** (test mode), **Sentry**.
- [ ] Read [`SECURITY_GUIDE.md §10`](./docs/SECURITY_GUIDE.md) on secrets — never
      paste real secrets into chat, tickets, or docs.

### Local setup
- [ ] Install **Node.js ≥ 20** and npm.
- [ ] Clone the repo; `cd "Goods Go"`.
- [ ] `cd goodsgo-backend && npm install`
- [ ] `cd ../goodsgo-frontend && npm install`
- [ ] Create `goodsgo-backend/.env` from `.env.example`; fill in **all required**
      vars (`DATABASE_URL`, the three distinct `JWT_*` secrets, `NODE_ENV`,
      `PORT=5000`). Generate each JWT secret with
      `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
- [ ] Add Cloudinary + Razorpay (test) + email creds if you'll touch those flows.
- [ ] Create `goodsgo-frontend/.env`; leave `VITE_API_URL` **empty** for local dev
      (requests go through the Vite proxy to `localhost:5000`).
- [ ] Point `DATABASE_URL` at a **Neon branch** or a local Postgres (don't develop
      against production).

### First run
- [ ] `cd goodsgo-backend && npm run migrate` (applies migrations 001–020).
- [ ] `npm run seed:all` (vehicle types, categories, settings, admin). **Override
      `ADMIN_PASSWORD` and rotate it — never keep the placeholder.**
- [ ] `npm run dev` → backend on `http://localhost:5000`; confirm
      `GET /health` returns `{ status: "ok" }`.
- [ ] In another terminal: `cd goodsgo-frontend && npm run dev` → `http://localhost:5173`.
- [ ] Register a user → verify email (check the console/inbox) → log in → create a
      post → send a booking. You've now exercised the core loop.

### Orientation
- [ ] Skim [`PROJECT_DEEP_DIVE.md`](./docs/PROJECT_DEEP_DIVE.md) (files & modules).
- [ ] Read one module end-to-end. Recommended:
      [`BOOKINGS_LINE_BY_LINE.md`](./docs/modules/BOOKINGS_LINE_BY_LINE.md) — it
      demonstrates every pattern you'll reuse.
- [ ] Import `GoodsGo.postman_collection.json` and hit a few endpoints.
- [ ] Skim the [ER diagram](./docs/ER_DIAGRAM.md) and
      [`DATABASE_GUIDE.md`](./docs/DATABASE_GUIDE.md).

---

## 2. Architecture rules (non-negotiable)

These invariants keep the codebase safe and consistent. PRs that break them will
be sent back.

1. **Strict backend layering:** `routes → middleware → controller → service →
   database`. **No SQL in controllers. No business logic in routes.** All logic +
   SQL lives in the service.
2. **All SQL is parameterized** (`$1, $2, …`). Never string-interpolate user
   input. The only values ever concatenated into SQL are **hardcoded column
   names** from whitelists (`ALLOWED_POST_SORT_COLUMNS`, `buildHaversineSQL` args).
3. **All thrown errors are `ApiError`** (use the factory methods:
   `ApiError.notFound()`, `.forbidden()`, `.businessRule()`, etc.). Anything else
   becomes a generic 500.
4. **Every async route handler is wrapped in `asyncHandler()`** so rejections reach
   the global error handler.
5. **Enums/status strings/limits come from `utils/constants.js`** (frozen
   objects). Never hardcode `'accepted'`, `'active'`, rate limits, etc.
6. **Ownership/authorization is re-fetched from the DB in the service** — never
   trusted from the client payload.
7. **Multi-table writes use a transaction** (`getClient()` + BEGIN/COMMIT/ROLLBACK)
   with `client.release()` in a `finally`. Real races (booking accept) also use
   `SELECT … FOR UPDATE`.
8. **Side effects are post-commit and non-blocking:** `emitToUser`/`emitToConversation`
   after `COMMIT`; `setImmediate(...)` for emails/notifications. A failed side
   effect must never break the core operation.
9. **Route ordering:** declare literal paths (`/search`, `/read-all`,
   `/messages/image`) **before** parameterized siblings (`/:id`).
10. **Every mutating endpoint** is authenticated, validated (Joi with
    `stripUnknown`), and — where money/state is involved — fails closed.

Frontend equivalents:
- Components consume **hooks** (TanStack Query), never Axios directly.
- **Client** state → Zustand; **server** state → React Query. Don't mix them.
- Use **semantic Tailwind tokens** (`bg-surface`, `text-text`, `border-border`) so
  dark mode works automatically — no hardcoded gray/white classes.
- Every component with props declares **PropTypes**.

---

## 3. Code style

- **Backend:** CommonJS, `'use strict'`, **JSDoc on every exported function**.
- **Frontend:** ESM, function components + hooks, PropTypes.
- **No TypeScript, ORM, Redis, or Docker** — these are deliberate architecture
  decisions (see the [ADRs](./docs/TECHNOLOGY_DECISIONS.md)). Discuss before
  introducing any of them.
- Run the linter before pushing frontend changes: `npm run lint`.
- Keep new code in the style of the surrounding code (comment density, naming,
  idioms).

---

## 4. Adding a feature (the standard recipe)

To add an endpoint to an existing module:
1. **Validator:** add a Joi schema in `<module>.validator.js` (with
   `stripUnknown`).
2. **Service:** add the business logic + parameterized SQL in `<module>.service.js`.
   Use a transaction for multi-table writes; throw `ApiError` on failures;
   re-check ownership from the DB.
3. **Controller:** add a thin `asyncHandler` that calls the service and wraps the
   result in `ApiResponse`.
4. **Route:** wire `authenticate` (+ `requireEmailVerified` / rate limiter as
   needed) → `validate(schema)` → controller. Mind route ordering.
5. **Frontend:** add the call to the matching `services/<module>.service.js`, wrap
   it in a `hooks/use<Module>.js` query/mutation (with cache invalidation), and use
   it from a component/page.
6. **Docs:** update [`API_REFERENCE.md`](./docs/API_REFERENCE.md) (and the Postman
   collection) for any new/changed endpoint.

To change the schema: add a **new** migration file
`goodsgo-backend/src/db/migrations/0NN_description.sql` (idempotent — `IF NOT
EXISTS`, `DO $$ … EXCEPTION WHEN duplicate_object`). Migrations are **forward-only**
— never edit an applied migration; write a corrective one. **Snapshot Neon before
any destructive change.**

---

## 5. Git & pull requests

- **Branch off `develop`** (not `main`). Names: `feature/<slug>`,
  `hotfix/<slug>`.
- **Conventional commits:** `type(scope): description`
  (e.g. `feat(bookings): add counter-offer endpoint`,
  `fix(payments): reject webhook with missing secret`). Types: `feat`, `fix`,
  `docs`, `refactor`, `test`, `chore`, `perf`.
- **Do not commit `.env`** or any secret (it's git-ignored — keep it that way).
- Open a PR into `develop`; fill in the PR template. **CI must pass**
  (`Validate Backend` + `Lint and Build Frontend`).
- `main` is production; merges to `main` require a passing PR from `develop`.
- **Commits/pushes are handled by the maintainer** (there's a known Windows
  Credential Manager gotcha on this repo that can 403 pushes) — coordinate rather
  than force-pushing.

### PR checklist
- [ ] Follows the architecture rules in §2.
- [ ] SQL is parameterized; errors are `ApiError`; async handlers wrapped.
- [ ] New/changed endpoints documented in `API_REFERENCE.md` + Postman.
- [ ] Schema changes are a new idempotent, forward-only migration.
- [ ] `npm run lint` passes (frontend); `node --check` clean (backend — CI runs it).
- [ ] No secrets, debug endpoints, or `console.log` noise left in.
- [ ] Manually verified the happy path locally.

---

## 6. Testing

There is **no automated test framework yet** (the top technical-debt item — see
[`FUTURE_ROADMAP.md`](./docs/FUTURE_ROADMAP.md)). Until one exists:
- Exercise changes with the **Postman collection** and the manual
  `goodsgo-backend/e2e-test.js` (`node e2e-test.js` against a running local
  server + DB).
- Diagnostic scripts: `test-db.js`, `check-db-tables.js`, `check-seeds.js`,
  `check-rate-limit.js`, `purge-test-data.js`.

**If you're adding non-trivial logic, adding the first tests around it is
strongly encouraged** — unit tests for services (the app is structured for this;
`src/app.js` is exported specifically so it can be driven by Supertest without a
port).

---

## 7. Where to get context

- **Handbook & navigation:** [`docs/README.md`](./docs/README.md)
- **Why a decision was made:** [`TECHNOLOGY_DECISIONS.md`](./docs/TECHNOLOGY_DECISIONS.md) (ADRs)
- **Deployment/rollback:** [`DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md) and
  the operator runbook `.github/DEPLOYMENT.md`
- **A worked example of the patterns:**
  [`BOOKINGS_LINE_BY_LINE.md`](./docs/modules/BOOKINGS_LINE_BY_LINE.md)

When in doubt, match the existing patterns and ask.
