# GoodsGo — DevOps & Deployment Guide (Phase 13 + CI/CD)

> CI/CD, environments, GitHub Actions workflows (step by step), the deploy
> platforms, secrets, rollback, disaster recovery, monitoring, logging, and
> versioning. Grounded in `.github/workflows/*`, `.github/DEPLOYMENT.md`,
> `railway.json`, and `vercel.json`. The detailed operator runbook lives in
> `.github/DEPLOYMENT.md`; this document explains the *why* and the concepts.

---

## 1. What is CI/CD, and what does GoodsGo actually have?

- **CI (Continuous Integration):** on every push/PR, automatically verify the code
  still installs, lints, syntax-checks, builds, and passes a security audit — so
  broken code is caught before merge.
- **CD (Continuous Deployment/Delivery):** automatically ship merged code to an
  environment.

**GoodsGo today = CI in GitHub Actions + platform-native CD.** GitHub Actions
runs the *validation* gates (no deploy credentials in CI). **Vercel** (frontend)
and **Render/Railway** (backend) deploy automatically via their **own GitHub
integrations** when the watched branch changes — not through Actions. A GitHub
Actions-driven CD pipeline is a documented *future* phase.

**Why this split?** It keeps deploy secrets out of CI, uses each platform's
zero-config Git deploys (build cache, instant rollback, preview envs), and still
gets fast, credential-free validation from Actions.

---

## 2. Environments & branch strategy

| Branch | Purpose | Deploys to | Protection |
|---|---|---|---|
| `main` | Production-ready only | Production | PR required + CI must pass |
| `develop` | Staging/integration | Staging (platform preview) | CI must pass |
| `feature/*` | Feature work | none | — |
| `hotfix/*` | Emergency prod fixes | main (fast-path) | PR required |

Recommended branch-protection on `main`: require PR, require the `Validate
Backend` and `Lint and Build Frontend` checks, require up-to-date branches, no
bypass.

---

## 3. GitHub Actions workflows (step by step)

Three workflows live in `.github/workflows/`. All run on `ubuntu-latest`, Node 24,
with npm caching, and use `concurrency` to cancel superseded runs (saving runner
minutes). None need deploy credentials.

### 3.1 `backend-ci.yml` — "Validate Backend"
**Trigger:** push/PR to `main`/`develop` touching `goodsgo-backend/**` or the
workflow file. **Steps:**
1. **Checkout** (`actions/checkout@v4`).
2. **Setup Node 24** with npm cache keyed on the backend lockfile.
3. **`npm ci`** — install exactly the lockfile (fails if lock is out of sync).
4. **Syntax check** — `node --check server.js`, then a loop running `node --check`
   over every `src/**/*.js`. This *parses* every file (catches syntax errors,
   unexpected tokens) without executing it. It is **not** a test — there is no
   test framework yet (a known debt).
5. **Security audit** — `npm audit --audit-level=critical` (**blocking**) +
   `--audit-level=high` (**informational**, `continue-on-error`) so pre-existing
   transitive high-severity noise doesn't permanently red the build.

### 3.2 `frontend-ci.yml` — "Lint and Build Frontend"
**Trigger:** push/PR touching `goodsgo-frontend/**`. **Steps:** checkout → Node 24
+ cache → `npm ci` → **ESLint** (`npm run lint`, blocking) → **production build**
(`npm run build` with a placeholder `VITE_API_URL`; **no** `SENTRY_AUTH_TOKEN` so
the Sentry plugin/source-maps are skipped in CI) → **bundle-size report**
(informational) → **npm audit** (critical blocking, high informational). The build
is the strongest gate: an unresolvable import, JSX error, or bad Tailwind class
fails it — stronger than lint alone.

### 3.3 `security-audit.yml` — scheduled dependency scan
**Trigger:** weekly cron (`0 9 * * 1`, Mondays 09:00 UTC), on `package*.json`
changes to `main`, and manual `workflow_dispatch`. **Jobs:** independent
backend + frontend audits — each installs deps, runs `npm audit --audit-level=
high` (**fails** on high in the scheduled scan to surface new CVEs promptly), and
uploads a full JSON audit report as a 90-day artifact. The weekly cron catches
newly disclosed CVEs even when no code changes.

**For every workflow — the anatomy:** *Trigger* (push/PR/schedule/dispatch) →
*Jobs* (validate/build/audit) → *Steps* (checkout → runtime → install →
check/lint/build → audit) → *Failure conditions* (lock mismatch, syntax error,
lint error, build failure, critical/high vuln) → *Outputs* (pass/fail status,
bundle report, audit artifacts).

**Why GitHub Actions over Jenkins/GitLab CI/CircleCI/Travis/Bitbucket/Azure
DevOps?** It's native to the repo (no separate CI server to host/patch), free for
this usage, simple YAML, huge marketplace of actions, and tight PR integration.
The alternatives are more powerful/self-hostable but add operational weight this
project deliberately avoids (ADR-010).

---

## 4. Deploy platforms

### 4.1 Backend — Render (currently) / Railway
- **Deploy flow:** connect the repo, root dir `goodsgo-backend`, the platform
  auto-detects Node via **Nixpacks** and uses **`railway.json`** for the run
  contract: `startCommand: "npm run migrate && npm start"`, `healthcheckPath:
  /health`, `restartPolicyType: ON_FAILURE`, `maxRetries: 5`. So **migrations run
  on every deploy** (idempotent, safe) and the platform won't route traffic until
  `/health` is green.
- **Runtime:** a long-lived Node process (needed for persistent WebSockets + the
  in-process cron — this is why the backend is *not* serverless).
- **Cold starts:** free tiers may sleep on idle → a slow first request; the DB
  (Neon) may also cold-start.
- **Why Render now:** both Render and Railway free tiers **block outbound SMTP
  ports**, which is why email uses HTTPS providers (Gmail API/Brevo). The project
  moved Railway→Render during deployment; either works.
- **Limits:** free-tier CPU/RAM/bandwidth caps, sleep-on-idle, single instance.

### 4.2 Frontend — Vercel
- **Deploy flow:** root dir `goodsgo-frontend`, framework Vite; **`vercel.json`**
  sets `buildCommand: npm run build`, `outputDirectory: dist`, `installCommand:
  npm ci`, **SPA rewrites** (all paths → `/index.html` for client routing),
  **immutable asset caching** (`/assets/* → max-age=31536000, immutable`), and
  security headers (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`).
- **Runtime:** static files on a global edge CDN — no server, infinitely
  cacheable, cheap, fast.
- **Cold starts:** none for static assets.

### 4.3 Database — Neon
Serverless Postgres; connection string via `DATABASE_URL`; SSL required;
free-tier 10-connection cap (drives pool sizing). Supports branching (great for
testing migrations). See SERVICES_AND_INFRASTRUCTURE § Neon.

### 4.4 Platform comparison (why these)

| Concern | Chosen | Alternatives (and why not, for MVP) |
|---|---|---|
| Frontend host | Vercel | Netlify (≈equal); Cloudflare Pages; S3+CloudFront (more ops) |
| Backend host | Render/Railway | Heroku (pricier since free tier ended); Fly.io; AWS/GCP/Azure (powerful, more ops); Docker VPS/K8s (max control, max ops) |
| Database | Neon | Supabase (bundles extras); RDS/Cloud SQL (paid, ops); self-host |
| CI | GitHub Actions | Jenkins/GitLab/CircleCI/Travis (self-host or heavier) |

The theme: **managed, Git-push, free/low-cost, minimal ops** — matched to a lean
monolith (ADR-010).

---

## 5. Secrets management

- All secrets live in **platform dashboards** (Render/Railway variables, Vercel
  env vars), never in code or CI logs. `.env` is git-ignored; `.env.example`
  documents the shape.
- The backend **refuses to start** without the critical vars (`DATABASE_URL`, the
  three JWT secrets, `NODE_ENV`, `PORT`).
- CI uses only a **placeholder** `VITE_API_URL` and deliberately **omits**
  `SENTRY_AUTH_TOKEN` (so CI builds don't upload source maps).
- Future CD would add `RAILWAY_TOKEN` / `VERCEL_TOKEN` (+ org/project IDs) as
  **GitHub Actions secrets**.
- **Rotation:** any secret exposed anywhere (chat, ticket, screenshot, shared
  terminal) is compromised → rotate it. This includes the seeded `ADMIN_PASSWORD`.
  See SECURITY_GUIDE § 10.

---

## 6. Rollback

- **Backend (Render/Railway):** Deployments tab → pick the last known-good →
  Redeploy. Restarts the previous build in ~30s. Graceful shutdown means the swap
  doesn't drop in-flight requests.
- **Frontend (Vercel):** Deployments → last known-good → Promote to Production.
  Instant, zero-downtime traffic switch.
- **Database:** migrations are **forward-only** — there is no auto-rollback. A
  schema rollback means writing a *new* corrective migration. **Always snapshot
  Neon before any migration that drops a column/table**; test on a Neon branch
  first.

---

## 7. Disaster recovery

- **Frontend:** stateless static build — redeploy from Git = full recovery.
- **Backend:** stateless process — redeploy from Git; state lives in
  Neon/Cloudinary/Razorpay.
- **Database:** rely on Neon backups/branches; take manual snapshots before risky
  migrations; treat `DATABASE_URL` as the crown-jewel secret.
- **Media:** Cloudinary is the store of record for images (DB holds `public_id`s);
  its own durability + the CDN cache protect delivery.
- **Payments:** Razorpay is the money source of truth; the `payments` table +
  webhook/verify redundancy + `gateway_payment_id UNIQUE` let state be
  reconciled from the Razorpay dashboard after any incident.
- **RPO/RTO:** driven by Neon's backup cadence + platform redeploy time (minutes).
  Formalizing backup schedules + a tested restore drill is a roadmap item.

---

## 8. Monitoring, logging, observability

- **Health:** `GET /health` (server + DB) for uptime monitors and load-balancer
  probes; 503 when the DB is down.
- **Errors:** Sentry (backend `@sentry/node` auto-instruments http+pg; frontend
  `@sentry/react` with uploaded source maps) — grouped exceptions, stack traces,
  10% performance traces in prod. No-op without a DSN.
- **Logs:** `morgan` request logs (`combined` in prod), structured `console`
  logs (`[DB]`, `[Auth]`, `[Payments]`, `[Jobs]`, `[Socket.io]` prefixes), and
  the `admin_audit_logs` table for admin actions. Platform dashboards aggregate
  stdout/stderr.
- **Gaps (roadmap):** no metrics/dashboards/alerting beyond errors; add
  Prometheus/Grafana or a managed APM, structured JSON logging + shipping, uptime
  alerts, and SLOs. See SCALABILITY_GUIDE Stage 4.

---

## 9. Versioning

- **API:** URL-versioned under `/api/v1` — a `/api/v2` can run alongside for
  breaking changes.
- **App:** semantic version in `package.json` (backend `1.0.0`), surfaced by
  `/health`.
- **Releases:** Git history + platform deploy history are the release ledger;
  Sentry release tracking ties errors to source-mapped builds. Conventional-commit
  messages (`type(scope): description`) keep history readable.

---

## 10. Deployment readiness checklist (from the runbook)

Accounts: GitHub, Render/Railway, Vercel, Neon, Cloudinary, Sentry, email
(Gmail/Brevo), Razorpay. Then: generate 3 distinct JWT secrets; set all backend
env vars on the host; deploy backend (migrations auto-run); run `npm run seed:all`
once (**override + rotate the admin password**); deploy frontend with
`VITE_API_URL` → backend; set `FRONTEND_URL` on the backend → Vercel URL; register
the Razorpay webhook → `/api/v1/payments/webhook`; verify `/health`, auth flow,
and a Sentry test event. Full step-by-step: `.github/DEPLOYMENT.md`.
