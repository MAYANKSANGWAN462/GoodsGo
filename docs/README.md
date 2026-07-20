# GoodsGo — Engineering Documentation

This folder is the complete internal engineering handbook for GoodsGo. It is
written so that a senior engineer joining the project — or the author returning
years later — can fully understand, maintain, extend, debug, optimize, deploy,
scale, and defend every engineering decision. Everything is grounded in the actual
source code.

## Start here

**[ENGINEERING_HANDBOOK.md](./ENGINEERING_HANDBOOK.md)** — the master index and
project overview (what GoodsGo is, why it exists, the business model, conventions,
and the map to everything else). Read it first.

## The document set

| Document | Covers |
|---|---|
| [ENGINEERING_HANDBOOK.md](./ENGINEERING_HANDBOOK.md) | Project overview, personas, business workflow, stack, conventions, secrets note (Phase 1) |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | End-to-end architecture, request/real-time lifecycles, recursive folder tour (Phase 2–3) |
| [PROJECT_DEEP_DIVE.md](./PROJECT_DEEP_DIVE.md) | File-by-file + per-module documentation (Phase 4–5) |
| [DATABASE_GUIDE.md](./DATABASE_GUIDE.md) | Every table, column, index, enum, constraint, transaction, locking (Phase 7) |
| [API_REFERENCE.md](./API_REFERENCE.md) | Every REST endpoint + Socket.IO event (Phase 8) |
| [SECURITY_GUIDE.md](./SECURITY_GUIDE.md) | Every security mechanism, attack, mitigation (Phase 9 + auth) |
| [TECHNOLOGY_DECISIONS.md](./TECHNOLOGY_DECISIONS.md) | Tech choices, comparisons, dependency reference, ADRs (Phase 6 + K + L) |
| [SERVICES_AND_INFRASTRUCTURE.md](./SERVICES_AND_INFRASTRUCTURE.md) | Razorpay, Cloudinary, Sentry, Neon, email, Socket.IO internals, env vars (Sections A–J) |
| [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md) | Throughput, bottlenecks, concurrency limits, optimization ladder (Phase 10) |
| [FAILURE_ANALYSIS.md](./FAILURE_ANALYSIS.md) | Every failure mode: symptoms, impact, recovery, mitigation (Phase 11) |
| [SCALABILITY_GUIDE.md](./SCALABILITY_GUIDE.md) | 100 → 1M users, stage by stage (Phase 12) |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | CI/CD, platforms, secrets, rollback, DR, monitoring (Phase 13 + C/D) |
| [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md) | Limitations, tech debt, improvement backlog, AI/ML (Phase 15) |
| [INTERVIEW_GUIDE.md](./INTERVIEW_GUIDE.md) | Every interview question + model answers, by category (Phase 14) |
| [ER_DIAGRAM.md](./ER_DIAGRAM.md) | Mermaid entity–relationship diagram of the full schema |
| [modules/BOOKINGS_LINE_BY_LINE.md](./modules/BOOKINGS_LINE_BY_LINE.md) | Truly line-by-line walkthrough of the Bookings module |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution rules + Day-1 onboarding checklist (repo root) |

## Reading paths by role

- **New engineer:** Handbook → Architecture → Deep Dive → Database → API.
- **Security review:** Security → Database (§5 locking) → Services (payments).
- **Scaling/ops:** Performance → Scalability → Failure → Deployment.
- **Interview prep:** Interview Guide (then drill into the referenced docs).
- **Decision context:** Technology Decisions (ADRs) → Future Roadmap.

## Source-of-truth cross-references

- Public readme + setup: `../README.md`
- Deployment runbook (operator steps): `../.github/DEPLOYMENT.md`
- API collection: `../GoodsGo.postman_collection.json`
- Schema: `../goodsgo-backend/src/db/migrations/*.sql`
- Constants (enums/limits/events): `../goodsgo-backend/src/utils/constants.js`

> **Security note:** these documents use placeholders for all secrets. Real
> secret values must never be pasted into any doc, ticket, or chat. See
> [SECURITY_GUIDE.md § 10](./SECURITY_GUIDE.md) — including the action to rotate
> the seeded admin password.
