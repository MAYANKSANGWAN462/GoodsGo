# GoodsGo — Module Context
> **Active block:** Block N — Payments | Replace this file entirely when Block N is complete.

---

## Current Module
- **Module:** Payments
- **Block:** N — follows Block M (Reviews Module)
- **Goal:** Razorpay escrow-style payment integration. After a booking is `accepted`, the requester pays via Razorpay (within `payment_deadline_hours`). The platform holds the funds. On booking `completed`, funds are released to the post owner after the `payment_auto_release_days` grace period (or earlier by manual trigger). Platform commission is deducted before release.

---

## Pre-conditions (must be resolved before starting)
- **`razorpay` npm package is NOT installed** — run `npm install razorpay@^2.9.4` first ⚠
- migration 013 (`payments` table with full Razorpay gateway fields + escrow timing columns) ✓
- `PAYMENT_STATUS` constant exists in `constants.js` ✓
- `NOTIFICATION_TYPES.PAYMENT_RECEIVED` and `NOTIFICATION_TYPES.PAYMENT_RELEASED` exist ✓
- `PLATFORM_SETTINGS.PAYMENT_DEADLINE_HOURS` and `PLATFORM_SETTINGS.PAYMENT_AUTO_RELEASE_DAYS` exist ✓
- `bookings.service.js` already writes `payment_deadline` (on accept) and `auto_release_at` (on complete) ✓
- `app.js` has a `// BLOCK N:` placeholder comment ✓

---

## Module Dependencies
- **Reads from:** `payments`, `bookings`, `users`, `platform_settings`
- **Writes to:** `payments`, `bookings` (status transitions on payment timeout/release)
- **Uses:** `config/database.js` (`query()`, `getClient()`), `utils/constants.js` (`PAYMENT_STATUS`, `BOOKING_STATUS`, `NOTIFICATION_TYPES`, `PLATFORM_SETTINGS`), `utils/ApiError.js`, `razorpay` SDK
- **Notifies:** `notifications.service.createNotification()` — lazy-require pattern for `PAYMENT_RECEIVED` and `PAYMENT_RELEASED` types
- **Middleware chain:** webhook route uses raw body parsing (signature verification requires the raw body buffer, not the parsed JSON); all other routes use `authenticate` + `validate(schema)` + controller

---

## Files to Create

| File | Role | Notes |
|---|---|---|
| `src/modules/payments/payments.validator.js` | Joi validation schemas | 3 schemas (see below) |
| `src/modules/payments/payments.service.js` | Business logic + DB queries + Razorpay SDK calls | 5 exported functions |
| `src/modules/payments/payments.controller.js` | Thin asyncHandler handlers | One handler per service function |
| `src/modules/payments/payments.routes.js` | Express router | 3 routes; mounted in `app.js` |

---

## Files to Modify

| File | Change |
|---|---|
| `src/app.js` | Replace `// BLOCK N:` placeholder with `app.use('/api/v1/payments', require('./modules/payments/payments.routes'))` |

Note: no `users.routes.js` change needed for Block N — payment history is accessible through `GET /api/v1/payments` filtered by user, not a `/me/*` sub-resource.

---

## API Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/v1/payments/initiate` | `authenticate` | Creates a Razorpay order for a booking; body: `{ bookingId }` |
| `POST` | `/api/v1/payments/verify` | `authenticate` | Verifies Razorpay payment signature; body: `{ orderId, paymentId, signature }` |
| `POST` | `/api/v1/payments/webhook` | None (HMAC-verified) | Razorpay webhook receiver — must parse raw body before JSON parsing for signature verification |

---

## Service Functions to Export

### `initiatePayment(bookingId, payerId)`
- Fetch booking — throw 404 if not found.
- Verify `payerId === booking.requester_id` — only the requester pays.
- Verify `booking.status === BOOKING_STATUS.ACCEPTED` — throw 422 if not (`PAYMENT_NOT_ALLOWED` code).
- Verify `booking.payment_deadline` has not passed — throw 422 if expired (`PAYMENT_DEADLINE_EXPIRED`).
- Check for existing non-failed payment row — throw 409 if already paid (`PAYMENT_ALREADY_INITIATED`).
- Call `razorpay.orders.create({ amount: agreedPrice * 100 (paise), currency: 'INR', receipt: bookingId })`.
- INSERT into `payments` with `status = 'pending'`, `gateway_order_id`, amount fields from booking.
- Return `{ orderId, amount, currency, key: RAZORPAY_KEY_ID }` — the frontend uses these to open the Razorpay checkout widget.

### `verifyPayment(bookingId, orderId, paymentId, signature, payerId)`
- Fetch payment row by `gateway_order_id = orderId` — throw 404 if not found.
- Verify `payerId === payment.payer_id` — throw 403 if not.
- Verify payment is still `pending` — throw 409 if already `completed`.
- Compute HMAC-SHA256 of `${orderId}|${paymentId}` using `RAZORPAY_KEY_SECRET` — compare to `signature` (constant-time comparison via `crypto.timingSafeEqual`).
- If signature mismatch → throw `ApiError.badRequest('Payment signature verification failed.', 'PAYMENT_SIGNATURE_INVALID')`.
- Transactional (`getClient()`):
  - UPDATE `payments` SET `status = 'completed'`, `gateway_payment_id`, `gateway_signature`.
  - Optionally: fetch Razorpay payment details via `razorpay.payments.fetch(paymentId)` and store raw response in `gateway_response` JSONB.
  - COMMIT.
- Notify payer (`PAYMENT_RECEIVED` — "Your payment was received successfully.").
- Return formatted payment row.

### `handleWebhook(rawBody, signature)`
- Verify webhook signature using `razorpay.webhooks.validateWebhookSignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET)`.
- Parse `rawBody` as JSON — extract `event` and `payload`.
- Route by event:
  - `payment.captured` → call `verifyPayment()` with the gateway data.
  - `payment.failed` → UPDATE `payments` SET `status = 'failed'`.
  - `refund.processed` → UPDATE `payments` SET `status = 'refunded'`, `refund_amount`, `gateway_refund_id`, `refunded_at`.
- All errors logged, never re-thrown — webhook must always return 200 to Razorpay.

### `releasePayment(bookingId, releasedBy)`
- Fetch booking and payment — throw 404 if not found.
- Verify `booking.status === BOOKING_STATUS.COMPLETED` — throw 422 if not.
- Verify payment `status === 'completed'` — throw 422 if not yet paid.
- Razorpay does not natively "release" escrowed funds — this function records the release in the DB and initiates any necessary transfer (if using Razorpay Route for transporter payouts, integrate here; otherwise, record release for manual bank transfer).
- UPDATE `payments` SET `status = 'released'` (or keep as 'completed' and add a `released_at` timestamp — decide based on `payments` table schema).
- Notify payee (`PAYMENT_RELEASED` — "Your payment has been released.").
- Return updated payment.

### `refundPayment(bookingId, amount, reason, adminId)`
- Admin-only function (called by Block O admin routes, not a public endpoint in Block N).
- Fetch payment row — throw 404 if not found.
- Verify `payment.status === 'completed'` — only completed payments can be refunded.
- Call `razorpay.payments.refund(gateway_payment_id, { amount: amount * 100 })`.
- UPDATE `payments` SET `status = 'refunded'` (or `'partially_refunded'` if `amount < payment.amount`), `refund_amount`, `refund_reason`, `refunded_at`, `gateway_refund_id`.
- Return updated payment.

---

## Validation Schemas

```js
// payments.validator.js

const initiatePaymentSchema = Joi.object({
  bookingId: Joi.string().uuid({ version: 'uuidv4' }).required()
});

const verifyPaymentSchema = Joi.object({
  bookingId:  Joi.string().uuid({ version: 'uuidv4' }).required(),
  orderId:    Joi.string().required(),
  paymentId:  Joi.string().required(),
  signature:  Joi.string().required()
});

// Webhook has no Joi schema — body validation is done via Razorpay HMAC
// (Joi cannot validate the raw buffer required for signature verification)
```

---

## Architecture Alignment Notes

- **Webhook raw-body requirement:** Razorpay's webhook signature verification requires the exact raw request body bytes. Express's `express.json()` middleware consumes and parses the buffer — by the time a normal route handler sees `req.body`, it is already a parsed JS object and the raw buffer is gone. To solve this for the webhook route **only**, use `express.raw({ type: 'application/json' })` as middleware specifically on the webhook route (declared before the route in `payments.routes.js`), which preserves `req.body` as a `Buffer`. This is the standard Stripe/Razorpay webhook pattern.
- **No `users.routes.js` modification needed:** Payment history retrieval (if needed) can be implemented as `GET /api/v1/payments?bookingId=...` or as a controller handler returning the payment row for a booking — no sub-resource mount under `/me/*` is planned for Block N.
- **`releasePayment` and `refundPayment` are for Block O/admin routes.** Export them from `payments.service.js` now so Block O can import them without modifying the service file. The Block N routes (`/initiate`, `/verify`, `/webhook`) are the only public-facing endpoints.
- **`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` must be in `.env`** — they are already in `.env.example`. The Razorpay client is initialized once at module load in `payments.service.js` (not per-request) using `new Razorpay({ key_id, key_secret })`.
- **Signature verification uses `crypto.timingSafeEqual`** — standard timing-attack mitigation for HMAC comparisons. Do not use `===` or `Buffer.equals()` for security-critical signature checks.
- **getPlatformSetting pattern:** Follow the existing pattern from `posts.service.js` and `bookings.service.js` — define a local `getPlatformSetting(key, defaultValue)` at the top of `payments.service.js`.
- **Rate limiting:** `POST /payments/initiate` should get a dedicated limiter (e.g. 10 initiations per hour per user, user-ID-keyed) — add it to `rateLimiter.middleware.js` following the `postCreateLimiter`/`bookingLimiter` pattern.

---

## Post-Block-N Checklist (replace this file with Block O brief when done)
- [ ] `payments.validator.js`, `payments.service.js`, `payments.controller.js`, `payments.routes.js` written and syntax-validated
- [ ] `razorpay` npm package installed
- [ ] `app.js` updated — `// BLOCK N:` placeholder replaced with live mount
- [ ] `rateLimiter.middleware.js` updated — payment initiation limiter added
- [ ] `PROJECT_CONTEXT.md` Section 6 (folder structure), Section 3.7 (Payments — moved from Pending to Complete), Section 11 (API — new payment endpoints), Section 12 (Services) updated
- [ ] `CURRENT_STATE.md` updated: Block N in completed list, Block O as next
- [ ] This file replaced with Block O brief
