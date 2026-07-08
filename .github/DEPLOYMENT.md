# GoodsGo — Deployment Runbook

> **Scope:** This document covers everything needed to go from the current
> repository state to a fully live production deployment.  Follow the sections
> in order.  Each section is labelled **Claude Code** (already done) or
> **Manual** (you must do this yourself).
>
> **Platform choices:** Railway (backend) + Vercel (frontend) + Neon.tech
> (Postgres).  All three have free or very low-cost tiers suitable for this
> project's scale.

---

## Architecture Overview

```
User browser
    │
    ▼
Vercel (goodsgo-frontend/)       — React 19 / Vite static build, free tier
    │ proxies /api/* and /socket.io/*
    ▼
Railway (goodsgo-backend/)       — Node.js 20 + Express + Socket.io, ~$5/mo
    │
    ├── Neon.tech PostgreSQL      — Serverless Postgres, free tier
    ├── Cloudinary                — Image storage, free tier
    ├── Razorpay                  — Payment gateway
    └── SMTP (Gmail / Brevo)      — Transactional email
```

---

## Branch Strategy

| Branch      | Purpose                      | Deploys to        | Protection  |
|-------------|------------------------------|-------------------|-------------|
| `main`      | Production-ready code only   | Production        | PR required + CI must pass |
| `develop`   | Staging / integration        | Staging (Railway preview) | CI must pass |
| `feature/*` | Feature development          | No auto-deploy    | None |
| `hotfix/*`  | Emergency production fixes   | main (fast-path)  | PR required |

---

## CI/CD Workflow (what happens automatically)

| Event | Workflows triggered |
|-------|---------------------|
| PR opened / push to `develop` or `main` (backend files changed) | `backend-ci.yml` — install, syntax check, audit |
| PR opened / push to `develop` or `main` (frontend files changed) | `frontend-ci.yml` — install, lint, build, audit |
| Push to `main` or `package.json` change | `security-audit.yml` — full dependency audit |
| Every Monday 09:00 UTC | `security-audit.yml` — scheduled weekly scan |

Railway and Vercel deploy automatically via their native GitHub integration
(not through GitHub Actions) once connected in their dashboards.

---

## SECTION 1 — External Accounts Required

You need accounts at all five services below.  Create them before proceeding.

| Service | Purpose | URL | Cost |
|---------|---------|-----|------|
| GitHub | Source code + CI | github.com | Free |
| Railway | Backend hosting | railway.app | ~$5/mo (hobby) |
| Vercel | Frontend hosting | vercel.com | Free |
| Neon.tech | PostgreSQL database | neon.tech | Free tier |
| Cloudinary | Image storage | cloudinary.com | Free tier |
| Sentry | Error monitoring | sentry.io | Free tier |
| Gmail / Brevo | Transactional email | — | Free |
| Razorpay | Payments | razorpay.com | No monthly fee |

---

## SECTION 2 — GitHub Repository Setup

**Manual steps:**

1. Push this repository to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/goodsgo.git
   git push -u origin main
   ```

2. Create the `develop` branch:
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

3. Enable branch protection rules:
   - Go to: GitHub → Repository → Settings → Branches → Add rule
   - **Rule for `main`:**
     - Branch name pattern: `main`
     - ✅ Require a pull request before merging
     - ✅ Require status checks to pass before merging
       - Add: `Validate Backend` (from backend-ci.yml)
       - Add: `Lint and Build Frontend` (from frontend-ci.yml)
     - ✅ Require branches to be up to date before merging
     - ✅ Do not allow bypassing the above settings
   - **Rule for `develop`:**
     - Branch name pattern: `develop`
     - ✅ Require status checks to pass before merging

---

## SECTION 3 — Neon.tech (PostgreSQL)

**Manual steps:**

1. Sign up at https://neon.tech
2. Create a new project named `goodsgo-production`
3. Go to: Project → Connection Details
4. Copy the **connection string** (format: `postgresql://user:pass@host/dbname?sslmode=require`)
5. Save it — you will use this as `DATABASE_URL` in Railway

**Optional staging database:**
- Create a second Neon project named `goodsgo-staging`
- Use its connection string as `DATABASE_URL` in the Railway staging environment

---

## SECTION 4 — Cloudinary

**Manual steps:**

1. Sign up at https://cloudinary.com
2. Go to: Dashboard → API Keys
3. Copy:
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   - **API key** → `CLOUDINARY_API_KEY`
   - **API secret** → `CLOUDINARY_API_SECRET`

---

## SECTION 5 — Razorpay

**Manual steps:**

1. Sign up / log in at https://razorpay.com
2. Go to: Dashboard → Settings → API Keys → Generate Test Key
3. Copy:
   - **Key ID** → `RAZORPAY_KEY_ID`
   - **Key Secret** → `RAZORPAY_KEY_SECRET`
4. Go to: Dashboard → Developers → Webhooks → Add Webhook
   - URL: `https://YOUR_BACKEND_URL/api/v1/payments/webhook`
   - Events: `payment.captured`, `payment.failed`, `refund.processed`
   - Copy the **Webhook Secret** → `RAZORPAY_WEBHOOK_SECRET`

> Use Test mode credentials until you have verified end-to-end payments working.
> Switch to Live credentials only after completing Razorpay KYC.

---

## SECTION 6 — Email (SMTP)

**Option A — Gmail App Password (simplest):**

1. Sign in to your Google account
2. Go to: https://myaccount.google.com/security
3. Enable 2-Factor Authentication (required for app passwords)
4. Go to: Security → App passwords
5. Create a new app password for "Mail"
6. Copy the 16-character password
7. Set:
   - `EMAIL_HOST=smtp.gmail.com`
   - `EMAIL_PORT=587`
   - `EMAIL_SECURE=false`
   - `EMAIL_USER=your@gmail.com`
   - `EMAIL_PASS=<16-char app password>`

**Option B — Brevo (recommended for production, 300 emails/day free):**

1. Sign up at https://brevo.com
2. Go to: SMTP & API → SMTP
3. Copy:
   - `EMAIL_HOST=smtp-relay.brevo.com`
   - `EMAIL_PORT=587`
   - `EMAIL_SECURE=false`
   - `EMAIL_USER=<your Brevo login email>`
   - `EMAIL_PASS=<Brevo SMTP password>`

---

## SECTION 7 — Sentry (Error Monitoring)

**Backend project:**

1. Sign up at https://sentry.io
2. Create a new project: Platform = Node.js, Project name = `goodsgo-backend`
3. Go to: Settings → Projects → goodsgo-backend → Client Keys (DSN)
4. Copy the DSN → `SENTRY_DSN` (backend Railway env var)

**Frontend project:**

1. Create a second project: Platform = React, Project name = `goodsgo-frontend`
2. Copy its DSN → `VITE_SENTRY_DSN` (Vercel env var)
3. Go to: Settings → Auth Tokens → Create new token
4. Scopes needed: `project:write`, `org:read`
5. Copy token → `SENTRY_AUTH_TOKEN` (Vercel build env var)
6. Go to: Settings → Organization → copy the org slug → `SENTRY_ORG`
7. Use `goodsgo-frontend` → `SENTRY_PROJECT`

---

## SECTION 8 — Generate JWT Secrets

Run this command three times (once for each secret) in any terminal that has
Node.js installed:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Save the three outputs as:
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ADMIN_SECRET`

Keep these values **cryptographically distinct** — never reuse one value for
multiple secrets.

---

## SECTION 9 — Railway Backend Deployment

**Manual steps:**

1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select this repository
3. Set **Root Directory** to `goodsgo-backend`
4. Railway auto-detects Node.js via Nixpacks and uses `railway.json` for the
   start command (`npm run migrate && npm start`)

5. Go to: Project → Variables and add ALL of the following:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Railway overrides this with its own; keep for local parity) |
| `DATABASE_URL` | Your Neon.tech connection string |
| `JWT_SECRET` | Generated in Section 8 |
| `JWT_REFRESH_SECRET` | Generated in Section 8 |
| `JWT_ADMIN_SECRET` | Generated in Section 8 |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `JWT_ADMIN_EXPIRES_IN` | `8h` |
| `CLOUDINARY_CLOUD_NAME` | From Section 4 |
| `CLOUDINARY_API_KEY` | From Section 4 |
| `CLOUDINARY_API_SECRET` | From Section 4 |
| `EMAIL_HOST` | From Section 6 |
| `EMAIL_PORT` | From Section 6 |
| `EMAIL_SECURE` | `false` |
| `EMAIL_USER` | From Section 6 |
| `EMAIL_PASS` | From Section 6 |
| `FRONTEND_URL` | Your Vercel frontend URL (set after Step 10) |
| `RAZORPAY_KEY_ID` | From Section 5 |
| `RAZORPAY_KEY_SECRET` | From Section 5 |
| `RAZORPAY_WEBHOOK_SECRET` | From Section 5 |
| `ADMIN_EMAIL` | Your admin email |
| `ADMIN_PASSWORD` | A strong password (16+ chars) |
| `ADMIN_FULL_NAME` | `GoodsGo Super Admin` |
| `SENTRY_DSN` | From Section 7 (backend project DSN) |

6. Click **Deploy** — Railway pulls, runs `npm ci`, then `npm run migrate && npm start`
7. Check the deployment logs — the migration runner logs each applied migration
8. The `/health` endpoint confirms the server and database are up

**Run seeds (one time only — first deploy):**

9. Go to: Railway → Project → Shell (or use `railway run` CLI)
10. Run:
    ```bash
    npm run seed:all
    ```
    This creates vehicle types, goods categories, platform settings, and the
    initial super-admin account.

---

## SECTION 10 — Vercel Frontend Deployment

**Manual steps:**

1. Go to https://vercel.com → New Project → Import from GitHub
2. Select this repository
3. Set **Root Directory** to `goodsgo-frontend`
4. Framework preset: Vite (Vercel auto-detects)
5. `vercel.json` in `goodsgo-frontend/` handles build command, output dir, and
   React Router rewrites automatically — no manual build settings needed

6. Go to: Project → Settings → Environment Variables and add:

| Variable | Environment | Value |
|---|---|---|
| `VITE_API_URL` | Production | Your Railway backend URL (e.g. `https://goodsgo-backend.up.railway.app`) |
| `VITE_API_URL` | Preview | Your Railway staging URL |
| `VITE_SENTRY_DSN` | Production | From Section 7 (frontend DSN) |
| `SENTRY_AUTH_TOKEN` | Production | From Section 7 |
| `SENTRY_ORG` | Production | From Section 7 |
| `SENTRY_PROJECT` | Production | `goodsgo-frontend` |

7. Go back to Railway and update `FRONTEND_URL` to your Vercel production URL

---

## SECTION 11 — Post-Deployment Verification

Run through this checklist after the first successful deployment:

**Backend health:**
- [ ] `GET https://YOUR_BACKEND/health` returns `{ status: "ok", database: true }`
- [ ] Railway logs show all 20 migrations applied (or skipped if re-deployed)
- [ ] No `FATAL:` or `Error:` lines in Railway startup logs

**Auth flow:**
- [ ] Register a new user → receive verification email
- [ ] Verify email → login works
- [ ] `/users/me` returns the profile
- [ ] Refresh token rotation works (access token refresh on 401)

**Frontend:**
- [ ] App loads at Vercel URL without console errors
- [ ] Login/register flows complete successfully
- [ ] No auth token visible in browser `Application → Local Storage`
- [ ] Network tab shows API calls going to the Railway backend URL

**Sentry:**
- [ ] Trigger a deliberate 404 → confirm it appears in Sentry (backend)
- [ ] Confirm Sentry events appear in both backend and frontend projects

---

## SECTION 12 — Rollback Procedure

**Backend (Railway):**
1. Go to: Railway → Deployments tab
2. Find the last known-good deployment
3. Click ⋯ → Redeploy
4. Railway restarts the previous image within ~30 seconds

**Frontend (Vercel):**
1. Go to: Vercel → Deployments tab
2. Find the last known-good deployment
3. Click ⋯ → Promote to Production
4. Vercel switches production traffic instantly (no downtime)

**Database:**
Migrations are forward-only.  A database rollback requires writing and applying
a new migration that undoes the schema change.  There is no automated rollback
mechanism.  Take a Neon database snapshot before running any migration that
drops columns or tables.

---

## SECTION 13 — GitHub Secrets (for future CD workflows)

These are not required for the current CI-only workflows but will be needed
if you add GitHub Actions deployment workflows in a future phase.

| Secret name | Purpose | Where to obtain |
|---|---|---|
| `RAILWAY_TOKEN` | Railway CLI auth | railway.app → Account → Tokens |
| `VERCEL_TOKEN` | Vercel CLI auth | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel org identifier | `vercel env ls` or project dashboard |
| `VERCEL_PROJECT_ID` | Vercel project identifier | Vercel → Project → Settings → General |

To add secrets: GitHub → Repository → Settings → Secrets and variables →
Actions → New repository secret.

---

## SECTION 14 — Deployment Readiness Blockers

The following must be resolved before the first live deployment:

| Priority | Blocker | Resolution |
|---|---|---|
| P0 | `razorpay` package not installed | Run `npm install` in `goodsgo-backend/` |
| P0 | No `.env` file in `goodsgo-backend/` | Copy `.env.example` → `.env`, fill in all values |
| P0 | No real Postgres instance | Complete Section 3 (Neon.tech) |
| P0 | No Cloudinary account | Complete Section 4 |
| P0 | Migrations never run | Handled automatically by `npm run migrate && npm start` in `railway.json` |
| P0 | Seeds never run | Run `npm run seed:all` once from Railway shell after first deploy |
| P1 | `FRONTEND_URL` not set until Vercel URL is known | Set in Railway after Vercel deploys |
| P1 | Razorpay in test mode | Switch to live keys after completing Razorpay KYC |
| P2 | Sentry not configured | Fill in `SENTRY_DSN` and `VITE_SENTRY_DSN` |
| P2 | Branch protection rules not enabled | Complete Section 2 step 3 |

---

## SECTION 15 — Recommended Next CI/CD Phase

Once Phase 1 (this document) is complete:

| Phase | What to add |
|---|---|
| Phase 2 | GitHub Actions CD workflows for Railway and Vercel (deploy on push to `main`/`develop`) via `RAILWAY_TOKEN` and `VERCEL_TOKEN` secrets |
| Phase 3 | Automated database migration step in CD pipeline (run `npm run migrate` as a pre-deploy job) |
| Phase 4 | End-to-end test suite (Playwright or similar) added as a required CI gate |
| Phase 5 | Staging environment parity — dedicated Neon staging project, dedicated Railway staging service |
| Phase 6 | Dependabot auto-PRs for dependency upgrades |
