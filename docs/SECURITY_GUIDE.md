# GoodsGo — Security Guide (Phase 9 + Auth Deep Dive)

> Every security mechanism, the attack it defends against, how it is implemented
> in this codebase, and how to extend it. Grounded in `auth.service.js`,
> `generateTokens.js`, `hashPassword.js`, the middleware layer, `uploadImage.js`,
> and `payments.service.js`.

---

## 1. Threat model (what we defend against)

GoodsGo handles **real money** (escrow), **personal data** (KYC, contacts), and
**concurrent state** (bookings). The primary threats: account takeover, payment
forgery/replay, privilege escalation (user→admin), enumeration/harvesting,
injection (SQL/XSS), malicious uploads, and abuse/DoS. The design principle
throughout is **defence in depth** and **fail closed**.

---

## 2. Authentication architecture

Three cryptographically independent identity domains, each with its **own JWT
secret** — the core security boundary:

| Domain | Secret | Where | Lifetime | Transport |
|---|---|---|---|---|
| User access | `JWT_SECRET` | frontend memory (Zustand) | ~15 min | `Authorization: Bearer` |
| User refresh | `JWT_REFRESH_SECRET` | httpOnly cookie + SHA-256 in DB | 7 days | cookie (path-scoped) |
| Admin | `JWT_ADMIN_SECRET` | frontend sessionStorage | 8 h | `Authorization: Bearer` |

Because the secrets differ, a user token presented to an admin route **fails
signature verification outright** (`verifyAdminToken` uses a different key) —
it's not merely an authorization failure. The `role` claim (`'user'` vs `'admin'`)
is a *second* belt-and-suspenders discriminator on top of that.

### 2.1 Access tokens (JWT)
`generateAccessToken` signs `{ id, role:'user' }` with `JWT_SECRET`, 15-min
expiry. **Why short-lived:** a JWT is self-contained and can't be individually
revoked; a 15-min window bounds the damage of a stolen access token.
**Why in memory, not localStorage:** localStorage is readable by any XSS payload;
holding the token in a JS variable (Zustand store) plus a short TTL reduces the
theft window. The tradeoff (lost on refresh) is solved by the refresh cookie.

### 2.2 Refresh tokens — rotation + reuse detection
The heart of session security (`auth.service.refreshAccessToken`):

1. **Storage:** only the **SHA-256 hash** is stored (`refresh_tokens.token_hash`).
   The plaintext lives only in the httpOnly cookie. **A DB breach cannot replay
   sessions** — the attacker would need the hash preimage.
2. **Rotation:** every refresh revokes the old token (`revoked_reason='rotation'`)
   and issues a new one. A stolen refresh token is useful for at most one refresh.
3. **Reuse detection:** if a token that is already `revoked` is presented, that
   means someone replayed a used token → likely theft. The service **revokes ALL
   of the user's tokens** (`reuse_detected`), clears the cookie, logs a security
   warning, and 401s. Both the thief and the victim are forced to re-login.
4. **Belt-and-suspenders expiry:** the DB `expires_at` is checked in addition to
   the JWT `exp`.
5. **Live account check:** the user is re-fetched; suspended/deleted accounts are
   rejected even with a valid token.

**Cookie hardening** (`setRefreshTokenCookie`): `httpOnly` (JS can't read it →
XSS can't steal it), `secure` in production (HTTPS only), `sameSite` (`'none'` in
prod because frontend and backend are on different domains — Vercel vs
Render/Railway — with `secure:true`; `'strict'` in dev), `path:/api/v1/auth`
(the cookie is only ever sent to auth endpoints, shrinking its exposure surface),
`maxAge` matched to the JWT lifetime.

### 2.3 Password hashing
`bcryptjs`, **cost factor 12** (`hashPassword.js`, ~300 ms/hash) — deliberately
slow to make brute-force expensive. Never below 12. `comparePassword` is
constant-time (bcrypt always runs the full computation) and returns `false` (never
throws) on malformed input. Passwords are capped at 128 chars in Joi (bcrypt
cost-DoS defence-in-depth).

### 2.4 Timing-attack / enumeration resistance
`login` and `adminLogin` **always run `bcrypt.compare`**, even when the email
doesn't exist (against a `DUMMY_HASH`), so response time can't reveal whether an
account exists. `forgot-password` and `resend-verification` **always return 200**
and defer all work to `setImmediate`, so neither the response body nor timing
leaks account existence. Public profile / conversation / notification lookups
return **404** for not-yours rather than 403, avoiding existence disclosure.

### 2.5 Email verification
64-char hex tokens (`crypto.randomBytes(32)`), 1-hour expiry, single-use
(`used_at`). Consumed in a transaction (mark user verified + consume token
atomically). `requireEmailVerified` gates create-post, booking, review, and
payment — limiting what an unverified (possibly throwaway) account can do.

### 2.6 Password reset
Same token discipline. On success (transaction): update password + consume token
+ **revoke every refresh token** for the user (`password_change`) — a reset kicks
all sessions, which is correct if the reset was triggered by a compromise.

### 2.7 Role-based access & admin authentication
Admin auth (`adminAuth.middleware`) uses a separate table (`admin_users`), a
separate secret, and a **numeric role hierarchy** (`moderator 1 < admin 2 <
super_admin 3`). `requireAdminRole(min)` allows any role ≥ `min`. Every admin
mutation is recorded to `admin_audit_logs` by `logAdminAction` (admin id, action,
target, IP) — a tamper-evident forensic trail. The admin's *real* role is always
re-read from the DB on each request, never trusted from the JWT payload (the JWT
only carries `role:'admin'` as a type discriminator).

---

## 3. Injection defences

### 3.1 SQL injection
**Every** query is parameterized (`$1, $2, …`) via the `query()` wrapper — user
input is *never* string-concatenated into SQL. The only values interpolated into
SQL strings are **hardcoded column names** from whitelists:
`ALLOWED_POST_SORT_COLUMNS` for `ORDER BY`, and the `latCol`/`lngCol` args of
`buildHaversineSQL` (documented as "MUST be hardcoded — never from user input").
Status filters use `= ANY($1::booking_status_enum[])` (parameterized array), not
string building. PG enum columns further constrain values at the DB layer.

### 3.2 XSS
`sanitizeInputs` (global, post-body-parse) recursively strips HTML tags
(`<[^>]*>`), removes null bytes, normalizes newlines/whitespace, and trims — so
stored data can't carry `<script>` payloads. The React frontend escapes by
default (no `dangerouslySetInnerHTML` on user content). Helmet sets a strict
**Content-Security-Policy** (`default-src 'self'`, scripts only from self +
`checkout.razorpay.com`, images from self + Cloudinary + Razorpay, connect to
self + the frontend origin + Razorpay). Vercel adds `X-Content-Type-Options:
nosniff` and `X-Frame-Options: DENY` on the static app.

### 3.3 Prototype pollution & mass assignment
`sanitizeValue` skips `__proto__`/`constructor`/`prototype` keys when rebuilding
objects. Joi `stripUnknown:true` removes any field not in the schema, so a client
cannot inject extra columns (e.g. `is_admin`, `rating`) into a create/update —
mass-assignment safe by construction.

---

## 4. CSRF considerations

The refresh cookie is the only ambient credential, and it is protected by:
`sameSite` (`strict` in dev), `httpOnly`, and `path:/api/v1/auth` scoping. The
API itself is **token-based** (Bearer header) for all authenticated actions —
Bearer tokens are not sent automatically by the browser, so classic CSRF doesn't
apply to state-changing API calls. CORS is an allow-list with `credentials:true`
only for known origins. The header `X-CSRF-Token` is already allowed in CORS,
anticipating a double-submit token if cookie-based auth is ever broadened
(currently a noted future item, not yet implemented).

---

## 5. Rate limiting (abuse & brute-force)

`express-rate-limit`, tuned in `constants.RATE_LIMITS`:

| Scope | Limit | Key | Purpose |
|---|---|---|---|
| Global `/api/*` | 100 / min | IP | Baseline anti-scrape/DoS |
| Auth (login/register) | 10 / 15 min | IP | Brute-force resistance |
| Forgot-password / resend | 3 / hr | IP | Anti-enumeration + SMTP abuse |
| Upload | 20 / hr | IP | Cloudinary/RAM abuse |
| Post create | 5 / hr | **user** | Spam posts |
| Booking request | 10 / hr | **user** | Spam bookings |
| Chat message | 60 / min | **user** | Message flooding |
| Payment initiate | 10 / hr | **user** | Limit compromised-account order spam |

Sensitive per-user limiters key on `req.user.id` (with an IP fallback) so a
limit **follows the user across IP changes** (WiFi→mobile) and can't be evaded by
IP rotation. `trust proxy = 1` in `app.js` makes `req.ip` the real client IP
behind Render/Railway's proxy (required for per-IP limits to work). Limits are
skipped in the test environment. *Caveat:* limiter state is **in-memory per
instance** — multi-instance deployments need the Redis store (see
SCALABILITY_GUIDE).

---

## 6. Input validation

Two layers: **sanitize** (global, cleans) then **Joi validate** (per route,
enforces). Joi runs with `abortEarly:false` (report all errors), `stripUnknown`
(mass-assignment safety), and `convert` (type coercion). Shared schemas
(`commonSchemas`) enforce UUIDv4 params, pagination bounds (max 100), and
coordinate ranges. Validation failures return a structured `errors[]` array with
field-level messages.

---

## 7. File-upload security

Two independent checks at different layers (a disguised file must beat both):
1. **MIME filter** (Multer `fileFilter`) rejects anything not JPEG/PNG/WebP
   before buffering.
2. **Magic-byte verification** (`verifyMagicBytes` in `uploadImage.js`) reads the
   actual file header (`FF D8 FF` JPEG, `89 50 4E 47` PNG, `RIFF…WEBP`) — a PHP
   shell renamed `image.jpg` fails here.
Additional controls: **memory storage only** (no disk → no path traversal, no
orphaned temp files), **5 MB/file** + **max 5 files** limits, **EXIF stripping**
(`flags:strip_profile` — removes GPS/device metadata for privacy), per-asset
resizing, and a **private Cloudinary folder for KYC** accessed only via
time-limited **signed URLs** (`generateSignedUrl`).

---

## 8. Payment security

- **Signature verification** on both paths: `/verify` recomputes
  `HMAC-SHA256(orderId|paymentId, KEY_SECRET)`; the webhook verifies HMAC over the
  **raw request body** vs `WEBHOOK_SECRET`. Both use `crypto.timingSafeEqual`
  (constant-time — no signature-oracle via timing).
- **Fail closed:** if `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` is unset,
  the code **rejects** rather than validating against an empty-string-keyed HMAC
  (which an attacker could reproduce to forge payments/refunds).
- **Replay/dedup:** `payments.gateway_payment_id` is `UNIQUE`; webhook handlers
  are idempotent (skip if already completed). The webhook always returns 200 so
  Razorpay's retries don't cause errors, but repeats don't double-apply.
- **Authorization:** only the booking's payer may initiate/verify; amounts and
  commission are snapshotted server-side from the booking (client-supplied
  amounts are never trusted).
- **Raw-body capture** is scoped to `/webhook` paths only (the `express.json`
  verify hook), so normal endpoints still get parsed JSON.

---

## 9. Transport & headers

- **Helmet**: HSTS, `X-Content-Type-Options`, `X-Frame-Options`, and the CSP
  above. (`crossOriginEmbedderPolicy` disabled so Cloudinary images load.)
- **HTTPS everywhere** in production (Vercel, Render/Railway, Neon SSL,
  Cloudinary `secure:true`).
- **Body size limits** (`10kb` JSON/urlencoded) block payload bombs; 413 on
  overflow.
- **CORS** allow-list; unknown origins rejected outside development.

---

## 10. Secrets management

- Secrets come from environment variables only; `.env` is git-ignored; the server
  **refuses to start** without the critical ones (`DATABASE_URL`, the three JWT
  secrets, `NODE_ENV`, `PORT`).
- The three JWT secrets must be **cryptographically distinct** 64-byte random hex
  values (`.env.example` documents the generation command).
- Secrets live in the hosting dashboards (Render/Railway/Vercel), never in code
  or CI logs. CI uses a placeholder `VITE_API_URL` and deliberately omits
  `SENTRY_AUTH_TOKEN`.
- **Rotation policy:** any secret that appears in a chat, ticket, screenshot,
  doc, or shared terminal must be considered compromised and rotated — exposure
  is not undone by deletion. **This explicitly includes the admin seed password
  (`ADMIN_PASSWORD` / the value `GoodsGo@2026Admin`) currently present in the
  working `.env`:** rotate it, and change the seeded super-admin's password.

---

## 11. Known gaps & future security improvements

| Gap | Risk | Recommended fix |
|---|---|---|
| Rate-limit state is per-instance (in-memory) | Limits weaken with >1 instance | `rate-limit-redis` store |
| No 2FA / MFA | Weaker account protection | TOTP or WebAuthn, at least for admins |
| No automated dependency-update PRs | Stale CVEs (7 pre-existing `npm audit` findings noted) | Dependabot + triage |
| `/auth/diagnose-email` debug endpoint | Leaks provider config presence | Remove/guard in production |
| No account-lockout after N failures (only rate limit) | Slow brute-force still possible | Progressive lockout / captcha |
| KYC images: signed URLs but no access log | Weak auditability of doc views | Log admin document access |
| No WAF / bot protection | Scraping, credential stuffing | Cloudflare / platform WAF |
| CSRF token not yet implemented (header allowed only) | Fine today (Bearer auth); needed if cookie auth broadens | Double-submit token |
| No field-level encryption for PII | DB breach exposes PII in plaintext | Encrypt sensitive columns / use pgcrypto |

See also FAILURE_ANALYSIS (refresh-token compromise, expired JWT handling) and
SCALABILITY_GUIDE (distributed rate limiting).
