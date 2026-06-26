# GoodsGo — Current Development State

> **Purpose:** Concise snapshot of where development stands right now.  
> **Last updated:** 2026-06-26 (after FE-2 — Layout Shell + HomePage)  
> **Source of truth for architecture/requirements:** `docs/PROJECT_CONTEXT.md`

---

## Current Project Phase

Frontend development — FE-2 complete. The authenticated user shell (Navbar with avatar dropdown + NotificationBell stub, Sidebar mobile overlay, MainLayout) and the public HomePage (hero, features grid, CTA, Footer) are fully implemented. Build passes at 190 modules, 0 errors.

---

## Overall Progress

| Area | Progress | Notes |
|---|---|---|
| Backend | ~100% complete (all planned modules) | Syntax-validated; never run against a live database |
| Frontend | FE-1 complete | Foundation + Auth wired; subsequent modules build on this |
| Database | Schema 100% designed, 20 migrations written | Never executed against a real Postgres instance |
| Deployment | 0% | No hosting account confirmed, no CI/CD |

---

## Completed Blocks (in order)

`A → B → C → D → E → F → H → K → I → J → L → M → N → O` (backend)  
`FE-1 → FE-2` (frontend)

---

## Completed Modules

| Module | Block | Status |
|---|---|---|
| Core utilities & infrastructure | A | Complete |
| Config layer | B | Complete |
| Middleware stack | C | Complete |
| Database migrations (001–020) + seeds | D / O | Complete — 20 migrations total |
| Auth module | E | Complete |
| Users module | F | Complete |
| Location module | H | Complete |
| Posts module | H | Complete |
| Config routes | H | Complete |
| Cron job | H | Complete |
| Bookings module | K | Complete |
| Notifications module | I | Complete |
| Socket Handlers | J | Complete |
| Chat REST API | L | Complete |
| Reviews module | M | Complete |
| Payments module | N | Complete |
| Admin module | O | Complete |
| **FE-1: Foundation + Auth** | **FE-1** | **Complete** — Axios instances, Zustand stores, auth pages, route tree, providers |
| **FE-2: Layout Shell + HomePage** | **FE-2** | **Complete** — Navbar (dropdown, bell stub), Sidebar (mobile), MainLayout, Footer, HomePage full design |

---

## Partially Completed Modules

None.

---

## Pending Frontend Modules

| Block | Scope | Status |
|---|---|---|
| FE-3 | Config fetch + Marketplace feed + Post detail | Not started |
| FE-4 | Create/Edit post (all 3 post types) | Not started |
| FE-5 | Bookings — list + detail + state actions | Not started |
| FE-6 | Chat — conversation list + real-time window | Not started |
| FE-7 | Notifications — bell + dropdown + page | Not started |
| FE-8 | Profile — own profile + settings + public profile | Not started |
| FE-9 | Reviews — on booking detail + public profile | Not started |
| FE-10 | Payments — Razorpay initiate + verify flow | Not started |
| FE-11 | Admin panel — login + all admin pages | Not started |
| FE-12 | Polish — empty states, error boundaries, responsive audit | Not started |

---

## Current Active Frontend Module

**FE-3 — Config Fetch + Marketplace Feed + Post Detail**  
See `docs/FRONTEND_MODULE_CONTEXT.md` for the implementation brief.

---

## Current Milestone

FE-2 complete. Next milestone: FE-3 (Config fetch + Marketplace feed + Post detail).

---

## Known Blockers

| Priority | Issue | Location | Effect |
|---|---|---|---|
| 🟠 P1 | `razorpay` npm package added to `package.json` but **not yet installed** | `goodsgo-backend/` | Will fail at runtime until `npm install` is run in `goodsgo-backend/`. |
| 🟡 P2 | `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_FULL_NAME` not in `.env.example` | `seed_admin.js` | Functional with insecure hardcoded fallback defaults. |
| 🟡 P2 | No `.env` file in `goodsgo-backend/` — backend needs `JWT_SECRET`, `DATABASE_URL`, etc. | Backend | Backend will not start without proper env vars. |

---

## Frontend-Specific Installed Packages (FE-1)

```
axios ^1.x
zustand ^5.x
@tanstack/react-query ^5.x
react-hook-form ^7.x
yup ^1.x
@hookform/resolvers ^3.x
react-hot-toast ^2.x
prop-types ^15.x
date-fns ^4.x
```

---

## Important TODOs

- [ ] **Run `npm install`** in `goodsgo-backend/` — installs `razorpay@^2.9.4`
- [ ] Set all required env vars in `goodsgo-backend/.env`
- [ ] Set `VITE_API_URL` in `goodsgo-frontend/.env` for your dev backend URL (currently `http://localhost:5000`)
- [ ] Connect to a real PostgreSQL instance and run all 20 migrations + 4 seed scripts
- [ ] Begin FE-3 — Config Fetch + Marketplace Feed + Post Detail

---

## Recently Completed Work

**FE-2 — Layout Shell + HomePage:**

Files implemented:
- `src/components/common/Avatar.jsx` — image with initials fallback; `xs/sm/md/lg/xl` sizes
- `src/components/notifications/NotificationBell.jsx` — static bell stub (no badge); full implementation in FE-7
- `src/components/layout/Navbar.jsx` — logo, desktop links, NotificationBell, Avatar dropdown (Profile/Settings/Logout), hamburger (mobile-only, shown only when `onMenuToggle` is passed)
- `src/components/layout/Sidebar.jsx` — mobile slide-out overlay; backdrop click closes; scroll-locks body; active route highlight; auth/unauth footer
- `src/components/layout/MainLayout.jsx` — manages sidebar state; closes on route change; Navbar + Sidebar + Outlet
- `src/components/layout/Footer.jsx` — copyright + Marketplace/Register/Login links
- `src/pages/HomePage.jsx` — hero, stats strip, features grid, CTA section (unauth only), Footer

Build: `vite build` passes — 0 errors, 190 modules.

**FE-1 — Foundation + Auth:**

Packages installed: axios, zustand, @tanstack/react-query, react-hook-form, yup, @hookform/resolvers, react-hot-toast, prop-types, date-fns

Files created/implemented:
- `src/stores/useAuthStore.js` — Zustand auth store (access token in memory only)
- `src/stores/useAdminStore.js` — Zustand admin store (stub)
- `src/services/api.js` — User + admin Axios instances; 401 interceptor with queue-based refresh; response unwrapper
- `src/services/auth.service.js` — login, register, logout, refreshToken, forgotPassword, resetPassword, verifyEmail, resendVerification
- `src/constants/routes.js` — ROUTES constant + buildRoute helper
- `src/utils/generateInitials.js`, `errorParser.js`, `formatters.js`
- `src/components/common/Spinner.jsx`, `Button.jsx`, `Input.jsx`
- `src/context/AuthContext.jsx` — AuthProvider; silent refresh on mount; logout with cache clear
- `src/hooks/useAuth.js`
- `src/components/guards/ProtectedRoute.jsx`, `AdminRoute.jsx`
- `src/components/layout/AuthLayout.jsx`, `Navbar.jsx` (stub), `MainLayout.jsx` (stub), `AdminLayout.jsx` (stub)
- `src/pages/HomePage.jsx`, `NotFoundPage.jsx`, `UnauthorizedPage.jsx`
- `src/pages/auth/LoginPage.jsx`, `RegisterPage.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`
- `src/pages/admin/AdminLoginPage.jsx` (stub)
- `src/App.jsx` — Full route tree with QueryClientProvider + AuthProvider + Toaster
- `src/main.jsx` — Updated
- `src/index.css` — @theme design tokens added
- `.env` — VITE_API_URL=http://localhost:5000

Build: `vite build` passes — 0 errors, 185 modules, 12s.
