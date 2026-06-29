# CLAUDE.md

This file governs how Claude Code must behave while working on the GoodsGo repository. It is not a project description — see `docs/PROJECT_CONTEXT.md` for that. This file is a set of binding engineering rules. When the two documents conflict, `PROJECT_CONTEXT.md` describes *what exists*; this file dictates *how to work on it*. Follow both. If a request from the user conflicts with this file, follow the user's explicit instruction but flag the conflict before proceeding.






---

## 1. Development Philosophy

GoodsGo is a long-lived production SaaS, not a prototype, not a hackathon project, not a demo. Every line of code written into this repository should be written as if it will be read, debugged, and extended by another engineer six months from now who has no access to this conversation.

- **Production-grade by default, on every single change — no exceptions for "just a quick fix" or "just for testing."** There is no "prototype mode" in this repository. If a task seems to call for a shortcut, that is a signal to ask a clarifying question, not a license to write throwaway code.
- **Incremental, not sweeping.** Prefer the smallest correct change that fully solves the stated problem over a larger rewrite that "improves things while you're in there." Touching files outside the scope of the current task requires explicit justification and should be flagged to the user before doing it, not discovered by them later in a diff.
- **Consistency over cleverness.** When in doubt between an elegant new pattern and matching the existing pattern already used elsewhere in the codebase, match the existing pattern. This codebase has an established, deliberate, documented architecture (see `docs/PROJECT_CONTEXT.md` Sections 8, 19, 20, 31). A clever one-off deviation is a worse outcome than a slightly less elegant but consistent solution.
- **No silent architectural decisions.** Any new file, renamed file, moved file, or pattern that deviates from existing convention must be explicitly called out to the user with reasoning — this project has an established history of explicit "Architecture Alignment Check" reviews before code generation, and that discipline must continue indefinitely, not just during initial buildout.
- **Correctness over speed of delivery.** This is a marketplace handling money (escrow payments), trust signals (ratings, identity verification), and concurrent state transitions (booking acceptance race conditions). Subtle bugs in this domain cost users real money and real trust. Take the time to reason through edge cases before writing code, especially for anything touching `bookings`, `payments`, or `users` financial/trust fields.

---

## 2. Code Quality Expectations

- Every file starts with `'use strict';` as the first line. No exceptions.
- CommonJS only (`require`/`module.exports`). Do not introduce ESM syntax anywhere in the backend.
- JavaScript only. This project has explicitly rejected TypeScript. Do not suggest migrating to TypeScript, do not write `.ts` files, do not introduce a build step that would require one. Type safety is achieved through Joi schemas, JSDoc comments, frozen constant objects, and disciplined runtime checks — use those tools instead.
- Every exported function gets a JSDoc block documenting `@param`, `@returns`, and `@throws` where applicable. This is not optional decoration — it is this project's substitute for a type system and must be treated with the same rigor as type annotations would be in a typed codebase.
- No magic strings or numbers where a named constant already exists in `src/utils/constants.js`. If a new status/type/limit is being introduced, add it to `constants.js` first, then reference it — never inline the literal value in business logic.
- No dead code, no commented-out code blocks left behind "in case it's needed later," except for the project's established and intentional `// BLOCK X: ...` forward-reference comments in `app.js`/`server.js` that mark where a not-yet-built module will be wired in — those are a deliberate scaffolding convention and should be preserved until the corresponding module is built, then replaced with the live code, not deleted and not left dangling.
- No `console.log` debugging statements committed to the codebase. Use the established `console.warn`/`console.error` with bracketed module tags (`[Auth]`, `[DB]`, `[Bookings]`, etc.) for anything that should persist — see Section 16 (Logging Standards).
- Every function should do one thing. If a service function is handling validation, business logic, AND notification dispatch AND has grown past roughly 80-100 lines, consider whether it should be decomposed — but do not decompose existing working functions purely for aesthetics; only do so when adding new logic to them in the course of a real task.

---

## 3. Architecture Rules

These rules are non-negotiable and have been followed without exception across every file in this repository to date.

1. **Strict layering: routes → middleware → controller → service → database.** Controllers never contain SQL or business-rule conditionals. Services never read `req`/`res` directly. Routes never contain business logic, only middleware composition.
2. **No ORM.** All database access goes through `src/config/database.js`'s `query()` or `getClient()`. Every query is parameterized (`$1, $2...`). Never build SQL via string interpolation of user-controlled input, including for `ORDER BY` columns — those must be checked against a whitelist array first (see `ALLOWED_POST_SORT_COLUMNS` in `constants.js` as the existing pattern to replicate for any new sortable resource).
3. **Monolith, not microservices.** Do not propose splitting this codebase into separate services/repos/deployables. Module boundaries exist as folders under `src/modules/`, not as network boundaries.
4. **Ownership checks live in the service layer**, not in middleware, and they re-fetch the target row rather than trusting any client-supplied data about who owns what. This is the established pattern in `posts.service.js` and `bookings.service.js` — follow it for any new resource with an owner.
5. **Every thrown error is an `ApiError` instance** (via its constructor or a factory method: `.notFound()`, `.forbidden()`, `.conflict()`, `.badRequest()`, `.businessRule()`, `.unauthorized()`, `.rateLimitExceeded()`, `.internal()`). Never `throw new Error(...)` in application code above the lowest-level utility layer.
6. **Every async route handler is wrapped in `asyncHandler()`.** No raw `async (req, res) => {}` passed directly to a router method, ever.
7. **The forward-reference lazy-require pattern is intentional and must be preserved** wherever it currently exists (e.g., `bookings.service.js`'s `getNotifService()`), and should be used for any new cross-module dependency on a module that does not yet exist, following the exact try/catch-around-`require()` shape already established. Do not "clean this up" into a hard dependency once the target module exists unless explicitly asked — the resilience (a missing/broken module degrades to a no-op rather than crashing) is a feature, not a leftover.
8. **Read `docs/PROJECT_CONTEXT.md` Section 33 (Known Issues) before touching `bookings.service.js`, `adminAuth.middleware.js`, or any migration file.** There are currently two documented schema gaps (`disputes`, `admin_audit_logs` tables referenced by code but not created by any migration). Do not silently add migration files to fix this — the migration file set was explicitly locked by the project owner and any addition requires raising the conflict and getting explicit approval first (see Section 11, Database Migration Rules).

---


   - docs/POST_BOOKING_WORKFLOW.md — canonical model for posts, bookings, payments,
     reviews, chat scoping, and realtime sync. Treat as source of truth for who creates
     and who books each post type.




## 4. Backend Guidelines

- Stack: Node.js (CommonJS), Express 4.x, PostgreSQL via `pg`, Joi for validation, JWT via `jsonwebtoken`, bcrypt via `bcryptjs`, Cloudinary for file storage, Socket.io for real-time, `node-cron` for scheduled jobs, Nodemailer for email.
- Every new backend module follows the exact same four-file shape already established: `<module>.validator.js`, `<module>.service.js`, `<module>.controller.js`, `<module>.routes.js`. See Section 22 (Rules for Creating New Modules) for the full checklist.
- File uploads always go through `src/middleware/upload.middleware.js`'s named exports and `src/utils/uploadImage.js`. Never call Multer or the Cloudinary SDK directly from a new file.
- JWT operations always go through `src/utils/generateTokens.js`. Password hashing always goes through `src/utils/hashPassword.js`. Never call `jsonwebtoken` or `bcryptjs` directly from a new file.
- Background/scheduled work follows the `node-cron` in-process pattern already established in `src/jobs/expirePosts.job.js` unless and until the project explicitly migrates to a queue system (not currently planned — see `PROJECT_CONTEXT.md` Section 26).
- Platform-configurable values (commission rate, expiry windows, limits) belong in the `platform_settings` table, read via a `getSetting()`/`getPlatformSetting()` helper, never hardcoded as a literal in business logic — even though this currently means small helper duplication across `posts.service.js` and `bookings.service.js` (documented technical debt, not a pattern to deviate from without consolidating it properly).

---

## 5. Frontend Guidelines

Frontend development is active. The scaffold at `goodsgo-frontend/` contains the complete folder structure with all files as empty stubs awaiting implementation. **The authoritative frontend conventions guide is `docs/FRONTEND_CONTEXT.md`** — read it at the start of every frontend session alongside `docs/FRONTEND_ARCHITECTURE.md`. The rules below are the binding high-level constraints; `docs/FRONTEND_CONTEXT.md` expands on each with implementation detail.

**Stack — what is actually installed (differs from the original plan in `docs/PROJECT_CONTEXT.md` Section 7):**
- React 19.1.1 (originally planned: React 18 — do not downgrade; React 19 is in use)
- React Router DOM v7.9.3 (originally planned: v6 — v7 component API is in use; do not introduce Data Router loaders/actions without an explicit decision)
- Tailwind CSS v4.1.14 via `@tailwindcss/vite` (originally planned: Tailwind v3 + PostCSS — CSS-first config, no `tailwind.config.js` required)
- Remaining packages (Axios, Zustand, TanStack React Query, React Hook Form + Yup, Leaflet/react-leaflet, Socket.io-client, react-hot-toast, PropTypes, date-fns) are planned but not yet installed — add each package only when the module that first needs it is built, not speculatively

**Non-negotiable rules (these are binding and not overridable by convenience):**
- No TypeScript. This constraint from Section 2 applies to the frontend equally. PropTypes are the frontend's substitute for TypeScript prop types — **every component that accepts props must declare `ComponentName.propTypes = { ... }` at the bottom of its file.** No exceptions.
- ESM modules (`import`/`export`) in frontend files — the opposite of the backend's CommonJS. `'use strict';` is not required in ESM files. Do not confuse the two module systems.
- No business logic inside components. Logic belongs in `src/hooks/` (custom hooks) and `src/services/` (Axios service functions). Components receive data via props or React Query hooks and return JSX.
- **No direct Axios calls from components or hooks.** All API calls go through `src/services/` files. Hooks call services; components call hooks.
- **Access token: Zustand memory only. Never `localStorage`, never `sessionStorage`.** This is a backend-driven security requirement (XSS mitigation — `docs/PROJECT_CONTEXT.md` Section 10.1) that the frontend must honour unconditionally.
- **Refresh token: httpOnly cookie only.** The frontend never reads or writes it. Axios must be configured with `withCredentials: true`. The 401 response interceptor handles automatic refresh — see `docs/FRONTEND_CONTEXT.md` Section 6 for the full interceptor contract.
- **Single Axios response interceptor** unwraps the backend envelope (`{ success, message, data, meta, errors, code }`) for all user API calls. Never unwrap the envelope ad hoc per call site.
- **Reference data (`vehicle_types`, `goods_categories`) fetched from `GET /api/v1/config/options` at app startup** via React Query with `staleTime: Infinity`. Do not hardcode these lists in frontend constants — the backend tables are the source of truth.
- **Yup form schemas mirror backend Joi schemas** for the same endpoint. Keep both in sync whenever a validation rule changes on either side — no shared-schema tooling exists (see `docs/PROJECT_CONTEXT.md` Section 32).
- **Folder-per-feature structure:** `src/components/<feature>/`, `src/pages/<feature>/`, `src/services/<feature>.service.js` — one service file per backend module. See `docs/FRONTEND_ARCHITECTURE.md` for the complete, verified file map.
- All route paths are defined as constants in `src/constants/routes.js` and imported from there. Never hardcode path strings in `<Link>` or `navigate()` calls.
- No raw `<button>`, `<input>`, or `<select>` tags in pages or feature components — use the shared components from `src/components/common/`.

**Admin panel:** Treat as a completely separate product. Separate Zustand store (`useAdminStore`), separate Axios instance (`adminApi`), separate login page (`/admin/login`), separate JWT secret (`JWT_ADMIN_SECRET`). Never mix user token state with admin token state. See `docs/FRONTEND_CONTEXT.md` Section 6 for the full admin auth contract.

---

## 6. API Conventions

- Base path: `/api/v1`. All new endpoints are versioned under this prefix.
- Response shape is always `new ApiResponse(statusCode, message, data?, meta?)` on success, and the global error handler's normalized shape on failure. Never hand-construct a response object that deviates from this shape.
- RESTful resource nesting follows the existing pattern: collection routes (`GET /posts`, `POST /posts`) before parameterized sub-routes (`GET /posts/:postId`), and **specific literal-path routes must be declared before `:param` routes in the same router** (e.g., `/posts/search` and `/posts/nearby` are declared before `/posts/:postId` in `posts.routes.js` — Express matches in declaration order, and `:postId` would otherwise greedily match the literal string `search`). Apply this same ordering discipline to any new router.
- Sub-resources under a user's own account are nested under `/users/me/...` and wired into `users.routes.js` by importing the relevant module's controller — they are not given their own top-level `app.use()` mount. This is the established pattern for `/me/posts`, `/me/saved-posts`, `/me/bookings`, and must be followed for `/me/reviews`, `/me/notifications`, etc.
- Every mutating endpoint (`POST`/`PUT`/`DELETE`) must have: an `authenticate` (or `authenticateAdmin`) middleware, a Joi `validate()` call for any body/query/params it accepts, and — where the action is gated on email verification or admin role — the corresponding guard middleware, in that order.
- Rate limiting is applied per-endpoint based on abuse risk, not blanket-applied. New endpoints that create resources (posts, bookings, reviews) or touch auth should get an explicit limiter from `rateLimiter.middleware.js`, using a **user-ID-based key** (not just IP) when the route is authenticated, matching `postCreateLimiter`/`bookingLimiter`'s existing pattern.

---

## 7. Folder Organization

```
src/
  app.js, config/, middleware/, utils/, db/{migrations,seeds}/, jobs/, socket/
  modules/<name>/
    <name>.validator.js
    <name>.service.js
    <name>.controller.js
    <name>.routes.js
```

- Never place business logic in `utils/` — that directory is for stateless, dependency-light helper functions only (token generation, hashing, distance math, response shaping). If a "util" needs to query the database, it is a service, not a util, and belongs under `modules/`.
- Never create a new top-level directory under `src/` without first checking whether it fits inside an existing one. The existing structure (`config`, `middleware`, `utils`, `db`, `jobs`, `socket`, `modules`) has been sufficient for every feature built so far and should remain so for the planned remaining modules (notifications, chat, reviews, payments, admin).
- A new file that doesn't fit the established `<module>/<module>.<role>.js` naming inside `modules/` (such as `config.routes.js`, which has no corresponding service/controller because its logic is trivial) is acceptable **only** when explicitly justified and documented — follow the precedent set for `src/modules/config/config.routes.js`, which was flagged, justified, and approved rather than added silently.

---

## 8. Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Files | lowerCamelCase or module-name.role.js | `auth.service.js`, `errorHandler.middleware.js` |
| Database tables/columns | snake_case | `booking_status_history`, `profile_image_url` |
| Database ENUM types | snake_case + `_enum` suffix | `booking_status_enum` |
| JS variables/functions | camelCase | `getMyProfile`, `agreedPrice` |
| Frozen JS constant objects | SCREAMING_SNAKE_CASE | `BOOKING_STATUS.PENDING` |
| API JSON response keys | camelCase (translated from snake_case DB columns inside service-layer formatter functions) | `agreedPrice`, not `agreed_price` |
| Route paths | kebab-case | `/users/me/saved-posts` |
| Environment variables | SCREAMING_SNAKE_CASE | `JWT_REFRESH_SECRET` |
| `ApiError.code` values | SCREAMING_SNAKE_CASE, specific to the failure | `EMAIL_NOT_VERIFIED`, `CANNOT_BOOK_OWN_POST` |
| Migration filenames | `NNN_create_<table>.sql`, zero-padded 3 digits | `008_create_bookings.sql` |

Do not introduce a different casing convention for any of the above categories without updating this table and getting explicit sign-off — consistency here is what makes the codebase navigable without a type system to lean on.

---

## 9. Documentation Requirements

- Every exported function: JSDoc with `@param`/`@returns`/`@throws`. Non-negotiable, per Section 2.
- Every new migration file: a header comment block stating what it depends on (which prior migrations/tables) and what depends on it, matching the style already used in every existing migration file (e.g., `008_create_bookings.sql`'s header).
- Every new module, upon completion, requires an update to `docs/PROJECT_CONTEXT.md`: the folder structure tree (Section 6), the relevant Services/API/Features sections, and — critically — the "Known Issues" and "Pending Features" sections must be re-checked and corrected, not left stale. A finished module that isn't reflected in `PROJECT_CONTEXT.md` is treated as an incomplete task.
- Any deviation from the established architecture (new file outside the numbered plan, modification to an existing file's contract, renamed/moved file) must be documented inline at the point of change with a comment explaining why, and surfaced to the user in the same turn it happens — not discovered later. This mirrors the "Architecture Alignment Check" discipline already established earlier in this project's history and must continue for all future work, not just the initial buildout phase.
- Do not generate speculative documentation for features that don't exist yet. Document what is built, mark what is planned as "Pending" or "Not implemented," per the existing convention in `PROJECT_CONTEXT.md`.

### Frontend Documentation System

The repository has a five-file frontend documentation system in `docs/`. Each file has a distinct, non-overlapping responsibility. Together with `docs/PROJECT_CONTEXT.md` they form the complete engineering memory for the full repository.

| File | Responsibility | Authority for |
|---|---|---|
| `docs/PROJECT_CONTEXT.md` | Backend architecture, API behaviour, business rules, known issues | Backend — do not write frontend implementation decisions here |
| `docs/FRONTEND_CONTEXT.md` | Frontend conventions, stack decisions, auth flow, global state, Axios/socket integration | All cross-cutting frontend engineering rules |
| `docs/FRONTEND_MODULE_CONTEXT.md` | Active frontend module brief (≤150 lines, one module at a time) | What to build in the current session |
| `docs/FRONTEND_ARCHITECTURE.md` | Complete `goodsgo-frontend/src/` folder tree with every file's responsibility | Folder structure and file map |
| `docs/API_CONTRACT.md` | Frontend-to-backend integration contract for every endpoint | Request shape, query keys, cache invalidation, error handling from the frontend's view |
| `docs/UI_COMPONENT_GUIDE.md` | Reusable component catalogue (`src/components/common/`) | Props, variants, loading/error/empty states, form and toast conventions |

**Hierarchy rule:** `docs/PROJECT_CONTEXT.md` is the single source of truth for backend architecture and API behaviour. The five frontend docs are the single source of truth for frontend implementation. The two systems reference each other and never duplicate each other. A reader of `docs/API_CONTRACT.md` can look up `docs/PROJECT_CONTEXT.md` Section 11 for the backend contract; `docs/API_CONTRACT.md` documents only the frontend integration perspective.

**Maintenance rule for frontend docs:**
- `docs/FRONTEND_MODULE_CONTEXT.md` — regenerate completely after every completed frontend module. It must always describe only the next module to be built. ≤150 lines always.
- `docs/FRONTEND_ARCHITECTURE.md` — update only when files are added, moved, or their purpose changes.
- `docs/UI_COMPONENT_GUIDE.md` — update when a new `src/components/common/` component is added.
- `docs/API_CONTRACT.md` — update only when a backend API endpoint changes (method, path, request body, or response shape).
- `docs/FRONTEND_CONTEXT.md` — update only when a stack decision is reversed or a new cross-cutting engineering convention is established.

---

## 10. Testing Expectations

- **No automated test suite currently exists.** This is documented technical debt (`PROJECT_CONTEXT.md` Section 34), not an accepted permanent state.
- When adding genuinely new business logic — especially anything touching the booking state machine, auth token rotation, or payment calculations — prefer writing it in small, independently-reasoned-about functions that *could* be unit tested even before a test framework is formally introduced, rather than large monolithic functions that resist later testing.
- If asked to introduce a test framework, Jest is the implied default given the Node/Express stack already in use — do not introduce a different framework without discussing it.
- Until automated tests exist, every new feature must ship with a written, human-executable manual testing checklist in the same response that delivers the code — this has been the project's standard for every module so far (see the testing checklists provided for Auth, Users, Posts, Bookings) and must continue.
- Do not claim something is "tested" if it has only been syntax-checked (`node --check`). Be explicit about the difference between syntax validation and behavioral verification in every status report — this distinction has been carefully maintained throughout the project (see `PROJECT_CONTEXT.md` Section 17) and must not be blurred.

---

## 11. Database Migration Rules

- Migrations live in `src/db/migrations/`, numbered `NNN_create_<table>.sql`, applied in filename order by `src/db/migrate.js`.
- **The current migration set is locked at exactly 18 files (001–018) by explicit prior instruction from the project owner.** Do not add, remove, rename, renumber, split, or merge any migration file without first explicitly raising the change with the user and getting confirmation — this applies even when application code clearly requires a missing table (see the documented `disputes`/`admin_audit_logs` gap in `PROJECT_CONTEXT.md` Section 33). Surface the conflict; do not silently resolve it by adding a 19th file.
- Every new `CREATE TYPE` (ENUM) must be wrapped in the established idempotent pattern:
  ```sql
  DO $$ BEGIN
      CREATE TYPE my_enum AS ENUM (...);
  EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'my_enum already exists, skipping.';
  END $$;
  ```
- Every table needing `updated_at` tracking must reuse the existing shared trigger function (`update_updated_at_column()`, defined once in migration 001) — never define a new per-table trigger function.
- Every foreign key needs an explicit `ON DELETE` policy chosen deliberately (`CASCADE`, `SET NULL`, or no action) — never leave it to the Postgres default without considering what should happen to dependent rows.
- If a referenced table doesn't exist yet at the point a migration needs to add a column referencing it (the "deferred FK" situation), follow the exact pattern established between migrations 016 and 017: create the column as a bare type first, then add the FK constraint via `ALTER TABLE ... ADD CONSTRAINT` (wrapped in the same idempotent `DO $$ ... EXCEPTION WHEN duplicate_object` pattern) once the target table exists.
- All primary keys are `UUID PRIMARY KEY DEFAULT uuid_generate_v4()`. Never use auto-increment integers for a new table.
- Seed scripts are idempotent (`ON CONFLICT DO NOTHING` or equivalent) and live in `src/db/seeds/`, one file per logical seed concern, registered as an `npm run seed:*` script in `package.json`.

---

## 12. Dependency Management

- Check `package.json` before assuming a package is installed. This project has at least one known incident (`axios`/`razorpay` missing despite being required by live code — see `PROJECT_CONTEXT.md` Section 33) caused by a dependency being removed during troubleshooting and never restored. Verify, don't assume.
- Adding a new dependency requires justification: what it does, why the existing toolset can't do it, and confirmation it doesn't conflict with the explicit exclusions below.
- **Never add:** TypeScript, any ORM (Prisma/Sequelize/TypeORM/Knex-as-query-builder), Redis, BullMQ, Docker/Kubernetes config, NestJS, `cookie-parser` (the project deliberately hand-rolls this one specific parse to avoid the dependency). These are explicit, repeated architecture decisions, not oversights — do not reintroduce any of them without the user explicitly reversing the decision first.
- Prefer the smallest dependency that solves the problem, matching the existing philosophy (e.g., manual cookie parsing over `cookie-parser`, in-memory caching over Redis at current scale, `node-cron` over BullMQ).
- Pin dependency versions consistently with the existing `^x.y.z` style already in `package.json`; don't introduce a different version-pinning strategy for new packages.

---

## 13. Security Requirements

- All SQL parameterized, always. No exceptions, no "this input is safe because..." rationalizations.
- All passwords hashed with bcrypt cost 12 via the existing `hashPassword.js` utility. Never weaken the cost factor or hash directly with `bcryptjs`.
- Never store a token, password, or secret in plaintext anywhere — including logs. Refresh tokens are stored as SHA-256 hashes (`hashToken()`); follow this pattern for any future token-like credential.
- JWT secrets for users and admins remain cryptographically separate (`JWT_SECRET` vs `JWT_REFRESH_SECRET` vs `JWT_ADMIN_SECRET`). Never collapse these into a shared secret with a role claim — the separation is what makes privilege escalation cryptographically impossible, not just logically prevented.
- Any new file upload path must go through the existing double-verification pattern in `uploadImage.js`: declared MIME type check AND magic-byte verification. Never trust a client-declared MIME type alone.
- Apply the existing anti-enumeration patterns (constant-time dummy-hash comparison on login failure, always-200 on forgot-password/resend-verification with real work deferred to `setImmediate()`) to any new endpoint that could otherwise leak account existence.
- Suspended/deactivated resources return 404, not 403, when the alternative would confirm the resource's restricted state to an unauthorized viewer — follow the existing pattern on `GET /users/:userId`.
- Never log sensitive data (passwords, full tokens, full card/payment details) even at debug level. Truncate or redact before logging anything resembling a credential.
- Rate limit every new endpoint that creates a resource, sends an email, or is auth-adjacent, using the existing limiter factory in `rateLimiter.middleware.js`.

---

## 14. Performance Expectations

- Avoid N+1 queries. Any new list endpoint returning resources with related data (owner info, images, counts) must use a single JOIN query with aggregation (`json_agg(...) FILTER (...)`), matching the existing pattern in `posts.service.js`'s `getFeed()`/`getPostById()`. Do not write a loop that issues one query per row.
- Respect the connection pool's small size (`DB_POOL_MAX` default 10, sized for Neon.tech's free-tier ceiling). Never open ad hoc additional pools from a new file — always go through `config/database.js`'s shared `query()`/`getClient()`.
- Any function performing a transaction must use `getClient()`, wrap in `BEGIN`/`COMMIT`, `ROLLBACK` on error in a `catch`, and **always** `client.release()` in a `finally` block — a leaked client is a leaked pool connection. This is a hard rule with zero exceptions; verify it in every new transactional function.
- Dynamic `ORDER BY` columns must be checked against a whitelist constant array before being interpolated into SQL — never accept a raw client-supplied column name.
- Default to indexed, partial indexes (`WHERE deleted_at IS NULL`, `WHERE status = 'active'`, etc.) for any new frequently-filtered column, matching the existing index strategy on `posts` and `bookings`.

---

## 15. Scalability Guidelines

- The current architecture assumes a single server process. In-memory caching (`config.routes.js`'s 10-minute cache) and in-memory rate limiting are acceptable **only** under this assumption. If asked to design for multiple instances, flag that both of these need a Redis-backed replacement before that change is safe — do not silently leave them in-memory while implying horizontal scaling is supported.
- Do not introduce PostGIS, Redis, BullMQ, or a Socket.io Redis adapter speculatively. These are documented future migration paths (`PROJECT_CONTEXT.md` Section 26), triggered by specific, named scale thresholds — introduce them when those thresholds are actually approaching, not preemptively.
- Geo-search remains Haversine-SQL-based (no spatial index) until post volume genuinely warrants PostGIS. Do not silently swap in a different geo-search strategy for a single feature without flagging the broader architectural implication.
- When evaluating whether a change is "scalable enough," default to the smallest change that solves the current, real, stated problem — not a speculative future one.

---

## 16. Logging Standards

- `console.warn`/`console.error`/`console.log` with a bracketed module tag prefix, matching the existing convention exactly: `[Auth]`, `[DB]`, `[Bookings]`, `[Cloudinary]`, `[Email]`, `[Jobs]`, `[Socket.io]`, `[AdminAudit]`. Introduce a new tag for a new module following the same `[ModuleName]` shape.
- Operational/expected errors (an `ApiError` reaching the global handler) log at `warn` level with the status and message only. Unexpected/programmer errors log at `error` level with the full stack trace. Preserve this severity split in any new code path that logs errors directly rather than relying solely on the global handler.
- No structured logging library (e.g., `pino`) is currently in use. Do not introduce one speculatively for a single feature — this is a project-wide change (`PROJECT_CONTEXT.md` Section 34, item 3) that should be done deliberately, all at once, if/when undertaken.
- Slow-query logging (`config/database.js`, >100ms threshold) is development-only by design. Do not silently extend this to production logging without flagging the volume/noise implications first.

---

## 17. Error Handling Standards

- Every error reaching the client passes through the single global `errorHandler.middleware.js`. Never construct a custom error-response shape in a controller — throw an `ApiError` and let the handler format it.
- When a new PostgreSQL error code needs handling (e.g., the `42P01` "relation does not exist" case currently unmapped — see `PROJECT_CONTEXT.md` Section 33), add it to `PG_ERROR_MAP` in `errorHandler.middleware.js` rather than catching it ad hoc at the call site.
- Distinguish operational (`isOperational: true`) from programmer errors consistently. Only `ApiError.internal()` and genuinely unexpected exceptions should be treated as non-operational (generic 500, no internals leaked in production).
- Transactions that fail must roll back cleanly and re-throw — never swallow a transaction error silently. Notification/email dispatch failures, by contrast, are intentionally swallowed (logged, not re-thrown) so a non-critical side effect never breaks the primary operation — preserve this asymmetry; it is deliberate, not inconsistent.
- Validation errors always return a `400` with a populated `errors: [{field, message}]` array via Joi's `abortEarly: false` collection — never short-circuit to report only the first validation failure.

---

## 18. Code Review Checklist

Before considering any change complete, verify:

- [ ] `'use strict';` present; CommonJS syntax only; no TypeScript.
- [ ] Layering respected — no SQL in controllers, no `req`/`res` in services, no business logic in routes.
- [ ] All new SQL is parameterized; any dynamic column name is whitelist-checked.
- [ ] All thrown errors are `ApiError` instances with an appropriate status code and `code`.
- [ ] All async handlers wrapped in `asyncHandler()`.
- [ ] Ownership/ permission checks re-fetch the target row in the service layer, not trusted from client input.
- [ ] New constants added to `constants.js` rather than inlined.
- [ ] New endpoints have the correct middleware chain: rate limiter (if applicable) → auth → email-verified/admin-role (if applicable) → upload (if applicable) → validate → controller.
- [ ] JSDoc present on every new exported function.
- [ ] Any transaction correctly uses `BEGIN`/`COMMIT`/`ROLLBACK` with `client.release()` in `finally`.
- [ ] No secrets, tokens, or passwords logged anywhere.
- [ ] `docs/PROJECT_CONTEXT.md` updated to reflect the change (folder structure, feature status, known issues).
- [ ] A manual testing checklist provided alongside the code.
- [ ] No new dependency added without justification and a check against the explicit exclusion list (Section 12).
- [ ] No new file added outside the established `modules/<name>/<name>.<role>.js` pattern without explicit flagging and justification.
- [ ] No migration file added/changed without explicit user confirmation, given the locked 18-file constraint.

**For frontend changes, additionally verify:**
- [ ] No TypeScript; ESM modules (`import`/`export`) only in frontend files.
- [ ] `ComponentName.propTypes = { ... }` declared on every component that accepts props.
- [ ] No API call made directly from a component — all calls go through `src/services/` files, consumed by hooks.
- [ ] No auth token stored in `localStorage` or `sessionStorage` (verifiable in browser DevTools → Application tab).
- [ ] Access token stored in Zustand only; `withCredentials: true` on all Axios instances.
- [ ] Query keys follow the standard array form defined in `docs/FRONTEND_CONTEXT.md` Section 8.
- [ ] Mutations invalidate relevant query keys on success — cache is not patched manually unless optimistic update is explicitly documented.
- [ ] Manual testing checklist from `docs/FRONTEND_MODULE_CONTEXT.md` executed against a running `npm run dev` server.
- [ ] `docs/FRONTEND_ARCHITECTURE.md` updated if files were added outside the existing scaffold.
- [ ] `docs/UI_COMPONENT_GUIDE.md` updated if a new `src/components/common/` component was created.
- [ ] `docs/FRONTEND_MODULE_CONTEXT.md` regenerated for the next module before the session ends.

---

## 19. Definition of Done

A task is **not** done when the code merely runs. A task is done when:

1. The code follows every applicable rule in this document.
2. Every new exported function has JSDoc.
3. Every new endpoint has input validation, the correct auth/permission middleware, and appropriate rate limiting.
4. Errors are handled via `ApiError` and surface a sensible status code and message.
5. A manual testing checklist has been provided covering the happy path, the obvious failure paths, and any relevant security/edge case (ownership violation, duplicate submission, invalid state transition, etc.).
6. `docs/PROJECT_CONTEXT.md` has been updated: folder structure, relevant feature-status sections, and `Known Issues`/`Pending Features` re-checked for accuracy.
7. Any deviation from existing architecture has been explicitly surfaced to the user with reasoning — not silently introduced.
8. Syntax has been validated (`node --check` or equivalent) on every touched file.
9. If the change touches `bookings`, `payments`, `users` (financial/trust fields), or auth/token logic, the reasoning behind correctness — especially around concurrency and state transitions — has been explained, not just the code dropped in.

**For frontend tasks, a task is additionally done when:**

10. Every component that accepts props has `propTypes` declared.
11. The module's manual testing checklist in `docs/FRONTEND_MODULE_CONTEXT.md` has been executed against a running dev server — not merely syntax-checked or inferred from code inspection. No auth token must exist in `localStorage` or `sessionStorage` at any point in the auth flow.
12. `docs/FRONTEND_MODULE_CONTEXT.md` has been regenerated for the next module (or explicitly marked as the final module if this was the last one).
13. `docs/FRONTEND_ARCHITECTURE.md` reflects any new files added or stub files that are now implemented.
14. If the change wires a new Axios service call, the corresponding entry in `docs/API_CONTRACT.md` has been verified to match the actual request being made — no silent drift between the contract doc and the service file.

---

## 20. Rules for Modifying Existing Code

- Read the target file in full before editing it. Never patch blind based on a remembered summary of what a file "probably" contains.
- Prefer the smallest diff that correctly accomplishes the task. Do not reformat, rename, or restructure code that isn't part of the actual task, even if it "could be improved" — flag improvement opportunities to the user instead of unilaterally making them.
- When a change to a shared file (`app.js`, `server.js`, `constants.js`, `database.js`, any `*.routes.js` that other modules extend like `users.routes.js`) is required, document what changed and why in the same response, following the precedent of every prior incremental edit to `app.js` across Blocks C/E/F/H/K (each one was explicitly called out, never silent).
- If a function being modified is called from multiple places, check every call site for compatibility before changing its signature or return shape.
- Never replace a working stub/placeholder with a "simplified" version that does less than the stub promised. If `getPostBookings()` in `posts.service.js` returns paginated results once `bookings.service.js` exists, a future edit must not regress it back to returning an unpaginated or partial result.
- If a fix reveals a deeper architectural gap (such as the `disputes` table issue), do not paper over it with a workaround in the calling code. Surface the real gap and propose the real fix, even if that means the immediate task is now blocked pending a decision.

---

## 21. Rules for Creating New Modules

Every new backend module under `src/modules/<name>/` must include, at minimum:

1. **`<name>.validator.js`** — Joi schemas for every distinct input shape the module accepts (create, update, filter, param). Use `.when()` conditionals for any discriminated/polymorphic input (following the `posts.validator.js` precedent) rather than maintaining parallel near-duplicate schemas.
2. **`<name>.service.js`** — All business logic and all database access for the module. Export one function per distinct operation, with full JSDoc. Re-fetch and re-verify ownership/state inside the function rather than trusting the caller.
3. **`<name>.controller.js`** — One thin `asyncHandler`-wrapped function per route, each calling exactly one service function and shaping the response via `ApiResponse`. No conditionals beyond picking which service function to call.
4. **`<name>.routes.js`** — Route definitions with the full, explicit middleware chain per route (see Section 6, API Conventions, for ordering). Mount it in `app.js` (or nest it into an existing module's routes file, per the `/me/*` sub-resource pattern) with a clear comment, replacing any existing `// BLOCK X: ...` placeholder comment rather than leaving both.
5. Before writing any code for the new module, check `docs/PROJECT_CONTEXT.md` for: (a) whether the database tables it needs already exist, (b) whether any other module already has a forward-reference (lazy-require) expecting this module to exist, and wire that connection up as part of the same task, and (c) whether the module depends on another not-yet-built module — if so, flag the dependency order explicitly rather than building out of sequence.
6. After the module is complete, update `docs/PROJECT_CONTEXT.md` per Section 9 (Documentation Requirements) before considering the task done.

---

## 22. Rules for Generating Documentation

- Documentation describes what exists, with explicit, unambiguous markers for what is planned-but-not-built ("Pending," "Not implemented," "Block X — not started") versus what is built-and-working. Never blur this line for the sake of a more impressive-sounding status report.
- Do not invent business decisions that were never made (commission rates, default credentials, category lists, etc.) and present them as settled fact. If a value was chosen as a reasonable placeholder during implementation rather than explicitly confirmed by the project owner, document it as a "Pending Decision" or "Assumption," exactly as `docs/PROJECT_CONTEXT.md` Section 40 already does — and continue that practice for all future documentation.
- Keep `docs/PROJECT_CONTEXT.md` as the single living source of truth for project state. Do not create competing or duplicate status documents elsewhere in the repo. Architecture-review documents, testing checklists, and migration reports produced during a task are fine as ephemeral chat output, but any conclusion that should persist belongs back in `PROJECT_CONTEXT.md`, not left only in chat history.
- When documenting an API, list method, path, auth requirement, rate limit (if any), and a one-line behavior note — matching the table format already established in `PROJECT_CONTEXT.md` Section 11. Don't switch documentation formats module-to-module.
- **Frontend documentation has its own update protocol** governed by Section 25. The critical constraint is that `docs/FRONTEND_MODULE_CONTEXT.md` must never describe more than one module at a time and must never exceed 150 lines. Regenerate it for the next module immediately after completing the current one — not mid-module and not retroactively at the start of the next session.
- Do not write frontend implementation details (component props, React Query hook names, Zustand store shape, Yup schemas) into `docs/PROJECT_CONTEXT.md`. Do not write backend API behaviour (SQL, middleware chain, service layer logic) into the frontend documentation files. The two systems are designed to reference each other, not to absorb each other.

---

## 23. Git Workflow Assumptions

- **No git repository has been initialized yet.** The first task that touches version control should initialize one and make an honest initial commit reflecting the current real state of the code (including its known issues — do not "clean up" the known issues as part of the first commit; commit reality, then fix issues in their own tracked commits).
- Once initialized, follow conventional commits: `type(scope): description` — e.g., `feat(bookings): add dispute table migration`, `fix(deps): restore missing axios and razorpay packages`, `docs(context): update known issues after Block I`.
- One logical change per commit. A commit that adds a new module's four files is one commit. A commit that fixes a missing dependency is a separate commit from a commit that adds a new feature, even if discovered in the same session.
- Do not assume a particular branching strategy (e.g., `main`/`develop`/`feature/*`) has been adopted — none has been confirmed. If branching matters for a task, ask, rather than assuming.

---

## 24. Refactoring Policy

- Refactoring is welcome only when it is in service of the current task, not as a separate, unsolicited cleanup pass.
- Never refactor working, tested-by-checklist code purely for style preference. The existing codebase has a consistent style (Section 8, Section 19/20 of `PROJECT_CONTEXT.md`) — matching it is the goal, not improving on it speculatively.
- Large rewrites are discouraged categorically. If a file has accumulated real problems that genuinely warrant a rewrite (not just imperfection), propose the rewrite explicitly, explain why an incremental fix won't suffice, and get confirmation before doing it — do not discover mid-task that a "small fix" became a full file rewrite without flagging the scope change as it happens.
- Consolidating genuine duplication (e.g., the documented `getSetting()`/`getPlatformSetting()` duplication) is acceptable refactoring **when it is the explicit task**, not as a side effect of an unrelated change.

---

## 25. Frontend Development Workflow

This section defines the module-by-module lifecycle for frontend development. Follow it without deviation — the documentation system is designed around this protocol.

### Before every frontend session (mandatory reads)

Read these two files at the start of every frontend development session before writing a single line of code:

1. **`docs/FRONTEND_CONTEXT.md`** — conventions, auth flow, Axios/Zustand/React Query rules, socket integration, form conventions. Read in full on the first session; skim on return sessions to catch any updates.
2. **`docs/FRONTEND_MODULE_CONTEXT.md`** — the active module's goal, files to create/modify, APIs required, component relationships, and testing checklist. This is the session's primary directive.

Read these on demand (when the active work requires them):

3. **`docs/FRONTEND_ARCHITECTURE.md`** — before creating any new file, to confirm where it belongs and that it doesn't already exist.
4. **`docs/API_CONTRACT.md`** — before wiring any service call, to verify the exact request shape, query key, and error handling expectation.
5. **`docs/UI_COMPONENT_GUIDE.md`** — before building any UI element, to check whether a reusable component in `src/components/common/` already covers the need.
6. **`docs/PROJECT_CONTEXT.md` Section 11** — when an API endpoint's backend behaviour (not just its frontend integration contract) is unclear.

### During a frontend module

- Implement exactly the files listed in `docs/FRONTEND_MODULE_CONTEXT.md`. Do not implement the next module's files opportunistically.
- Every component file gets `propTypes` before the module is considered done — not as a final cleanup pass, but incrementally as each component is written.
- Run `npm run dev` and verify each new feature works in the browser before marking it complete. Syntax-checking alone (`node --check` or ESLint passing) is not sufficient — this is a frontend, and visual/interactive behaviour is what matters.

### After completing a frontend module (mandatory updates)

These updates are part of the module task, not separate cleanup work:

| Action | File to update | What to do |
|---|---|---|
| Regenerate active module brief | `docs/FRONTEND_MODULE_CONTEXT.md` | Replace entirely with the next module's brief. Never append history. ≤150 lines. |
| Mark implemented files | `docs/FRONTEND_ARCHITECTURE.md` | Remove "empty stub" notes from files that are now implemented; add any new files created outside the scaffold |
| Add new components | `docs/UI_COMPONENT_GUIDE.md` | Add a catalogue entry for any new `src/components/common/` component following the existing entry format |

### Stable files (updated only on specific triggers, not per-module)

| File | Update trigger |
|---|---|
| `docs/FRONTEND_CONTEXT.md` | A new package is installed, a stack decision is reversed, or a new cross-cutting convention is established |
| `docs/API_CONTRACT.md` | A backend API endpoint changes — method, path, request body, response shape, or error code |
| `docs/PROJECT_CONTEXT.md` | Never during frontend work unless a backend change was also made in the same session |
| `CLAUDE.md` (this file) | A new technology is introduced, a section's rules are formally revised, or the project phase changes |

### Frozen files (never modified during frontend development)

- `docs/PROJECT_CONTEXT.md` — backend team owns this; backend is complete.
- `docs/CURRENT_STATE.md` — reflects backend state; update only if a backend change is made.
- `docs/MODULE_CONTEXT.md` — backend module context; superseded by the frontend docs for all frontend work.

### Module build sequence

The recommended sequence is defined in `docs/FRONTEND_ARCHITECTURE.md` Section 11. Build modules in order — later modules depend on the Axios instance, Zustand stores, and React Query providers established in FE-1. Do not skip ahead and do not split a single logical module across multiple sessions without updating `docs/FRONTEND_MODULE_CONTEXT.md` to reflect the partial state at the session boundary.

### Context efficiency rationale

Loading `docs/FRONTEND_CONTEXT.md` (~300 lines) and `docs/FRONTEND_MODULE_CONTEXT.md` (≤150 lines) at the start of a session uses approximately 450 lines of context for the session's complete navigational map. The larger reference files (`docs/API_CONTRACT.md` at ~600 lines, `docs/FRONTEND_ARCHITECTURE.md` at ~370 lines) are loaded only on demand. This design keeps mandatory per-session context consumption low while ensuring the full engineering memory is always reachable — the same philosophy as using `docs/MODULE_CONTEXT.md` during backend development.

---

*This file should be revisited and updated whenever the project's architecture, stack, or established conventions change. Treat a stale CLAUDE.md the same way `docs/PROJECT_CONTEXT.md` treats stale sections: a sign that documentation has fallen out of sync with reality, to be corrected as part of the next development session, not deferred.*
