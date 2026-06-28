# GoodsGo — Frontend Module Context

> **Purpose:** Active implementation brief. Regenerate this file completely after every completed frontend module.
> **Current block:** COMPLETE — All 12 frontend modules implemented (FE-1 through FE-12)
> **Status:** Frontend development is finished. No further implementation modules remain.
> **Max size:** 150 lines. This constraint is intentional — keep it tight.

---

## Frontend Status: COMPLETE

All planned frontend modules have been built and verified:

| Module | Status |
|---|---|
| FE-1: Foundation + Auth | Complete |
| FE-2: Layout Shell + HomePage | Complete |
| FE-3: Config Fetch + Marketplace + Post Detail | Complete |
| FE-4: Create/Edit Post (All 3 Post Types) | Complete |
| FE-5: Bookings (List + Detail + State Actions) | Complete |
| FE-6: Chat (Conversation List + Real-Time Window) | Complete |
| FE-7: Notifications (Bell + Dropdown + Page) | Complete |
| FE-8: Profile (Own Profile + Settings + Public Profile) | Complete |
| FE-9: Reviews (Create Review + Review Lists) | Complete |
| FE-10: Payments (Razorpay Initiate + Verify) | Complete |
| FE-11: Admin Panel | Complete |
| FE-12: Polish Pass | Complete |

**Build:** `vite build` → 609 modules, 0 errors (as of 2026-06-28).

---

## What Was Done in FE-12 (Most Recent)

- **`ErrorBoundary.jsx`** — React class component; catches render errors in any subtree; fallback: red error card + "Reload page" button; mounted in `AppRoutes` wrapping all `<Routes>`.
- **`LocationAutocomplete.jsx`** — Controlled address input; debounced geocoding (400ms, ≥3 chars) via `GET /location/geocode`; shows one suggestion row; `onMouseDown + preventDefault` for reliable selection; wired via RHF `Controller`.
- **NeedTransportForm / VehicleAvailableForm / ReturnJourneyForm** — Replaced `Input + onBlur geocode` pattern with `Controller + LocationAutocomplete` for origin/destination fields.
- **ChatWindow.jsx** — Scroll-to-top triggers `getMessages(id, { page: N })` for older messages; local `olderMessages` state prepended above current page; scroll-position restored via `requestAnimationFrame`.
- **App.jsx** — `<ErrorBoundary>` imported and wraps `<Routes>` in `AppRoutes`.
- **propTypes audit** — `ReportRow` and `DisputeRow` in `AdminReportsPage` already had correct propTypes; no changes needed.
- **Docs updated** — `FRONTEND_ARCHITECTURE.md`, `UI_COMPONENT_GUIDE.md` (ErrorBoundary + LocationAutocomplete entries), `CURRENT_STATE.md`, `FRONTEND_MODULE_CONTEXT.md`.

---

## Known Remaining Technical Debt

- **MapPicker.jsx stub** — `src/components/location/MapPicker.jsx` exists as an empty stub. Requires `leaflet`/`react-leaflet` (not installed). Deferred indefinitely unless map picker is explicitly requested.
- **storage.js stub** — `src/utils/storage.js` must remain empty (security constraint: no tokens in localStorage).
- **PaymentHistoryPage** — Informational only; no `GET /payments` list endpoint in backend.
- **AdminBookingsPage / AdminReviewsPage** — Informational only; no backend list endpoints.
- **Admin session expiry** — 8h JWT, no refresh token; on 401 `adminApi` clears store + redirects to `/admin/login`.
- **paymentVerified local state** — Resets on page refresh (not persisted in React Query cache).
- **ChatWindow older-message sort** — Assumes page 2 = older than page 1. Backend sort direction should be verified when running against a live instance.
- **MyProfilePage Reviews tab** — `useMyReviews` fetches all reviews without pagination params.
- **Responsive audit** — 375px breakpoint audit deferred; main pages are Tailwind-responsive but no pixel-level audit was completed.

---

## Next Steps (Post-Frontend)

1. **Run `npm install`** in `goodsgo-backend/` to install `razorpay@^2.9.4`.
2. **Configure `.env`** in `goodsgo-backend/` with all required vars including `JWT_ADMIN_SECRET`.
3. **Provision a PostgreSQL instance** (Neon.tech free tier recommended).
4. **Run migrations** via `npm run migrate` in `goodsgo-backend/`.
5. **Run seeds** via `npm run seed` (includes `seed_admin.js` for admin user).
6. **Set `VITE_API_URL`** in `goodsgo-frontend/.env` to point at the running backend.
7. **Deploy** backend (Railway/Render) + frontend (Vercel/Netlify).
