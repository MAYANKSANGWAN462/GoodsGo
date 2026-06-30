'use strict';

const crypto  = require('crypto');
const Razorpay = require('razorpay');

const { query, getClient }  = require('../../config/database');
const { emitToUser }        = require('../../config/socket');
const ApiError              = require('../../utils/ApiError');
const {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  NOTIFICATION_TYPES,
  POST_TYPES,
  SOCKET_EVENTS
} = require('../../utils/constants');

// ─── Razorpay Client (lazy singleton) ────────────────────────────────────────
// Initialised on first use so missing env vars don't crash the module load —
// the error surfaces only when a payment API call is actually attempted.

let _razorpay = null;

function getRazorpay() {
  if (_razorpay) return _razorpay;
  _razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  return _razorpay;
}

// ─── Lazy Notification Loader ─────────────────────────────────────────────────
// Mirrors the pattern in bookings.service.js — notifications.service is already
// built (Block I), so this loads immediately at runtime.

let _notifService = null;

function getNotifService() {
  if (_notifService) return _notifService;
  try {
    _notifService = require('../notifications/notifications.service');
    return _notifService;
  } catch {
    return null;
  }
}

/**
 * @param {object} payload
 * @returns {Promise<void>}
 */
async function notify(payload) {
  const svc = getNotifService();
  if (!svc) return;
  try {
    await svc.createNotification(payload);
  } catch (err) {
    console.error('[Payments] Notification error:', err.message);
  }
}

// ─── Platform Settings Helper ─────────────────────────────────────────────────

/**
 * Reads a value from the platform_settings table.
 * Falls back to `defaultValue` on any error (missing key, DB issue).
 *
 * @param {string} key
 * @param {*} defaultValue
 * @returns {Promise<*>}
 */
async function getPlatformSetting(key, defaultValue) {
  try {
    const result = await query(
      'SELECT value, value_type FROM platform_settings WHERE key = $1',
      [key]
    );
    if (result.rows.length === 0) return defaultValue;
    const { value, value_type } = result.rows[0];
    if (value_type === 'number') return parseFloat(value);
    if (value_type === 'boolean') return value === 'true';
    return value;
  } catch {
    return defaultValue;
  }
}

// ─── Response Formatter ───────────────────────────────────────────────────────

/**
 * Converts a raw `payments` DB row into the camelCase API shape.
 * Deliberately omits `gateway_signature` and `gateway_response` — those
 * contain sensitive/internal data that should never be returned to clients.
 *
 * @param {object} row
 * @returns {object}
 */
function formatPayment(row) {
  return {
    id:                    row.id,
    bookingId:             row.booking_id,
    payerId:               row.payer_id,
    payeeId:               row.payee_id,
    amount:                parseFloat(row.amount),
    platformCommissionPct: parseFloat(row.platform_commission_pct),
    platformCommissionAmt: parseFloat(row.platform_commission_amt),
    netPayoutAmt:          parseFloat(row.net_payout_amt),
    currency:              row.currency,
    status:                row.status,
    gatewayName:           row.gateway_name       || null,
    gatewayOrderId:        row.gateway_order_id   || null,
    gatewayPaymentId:      row.gateway_payment_id || null,
    refundAmount:          row.refund_amount       ? parseFloat(row.refund_amount) : null,
    refundReason:          row.refund_reason       || null,
    refundedAt:            row.refunded_at         || null,
    gatewayRefundId:       row.gateway_refund_id   || null,
    paymentDeadline:       row.payment_deadline    || null,
    autoReleaseAt:         row.auto_release_at     || null,
    createdAt:             row.created_at,
    updatedAt:             row.updated_at
  };
}

// ─── initiatePayment ──────────────────────────────────────────────────────────

/**
 * Creates a Razorpay order for an accepted booking and inserts a `payments`
 * row with `status = 'pending'`. Only the booking's requester (customer) may
 * call this; only accepted bookings within their payment window are eligible.
 *
 * Returns the Razorpay order details the frontend needs to open the checkout
 * widget: `{ orderId, amount, currency, key, paymentRowId }`.
 *
 * @param {string} bookingId - UUID of the booking to pay for
 * @param {string} payerId   - User ID making the payment (from req.user.id)
 * @returns {Promise<{ orderId: string, amount: number, currency: string, key: string, paymentRowId: string }>}
 * @throws {ApiError} 404 if booking not found
 * @throws {ApiError} 403 if caller is not the booking's requester
 * @throws {ApiError} 422 if booking is not in 'accepted' status
 * @throws {ApiError} 422 if payment deadline has passed
 * @throws {ApiError} 409 if a non-failed payment already exists for this booking
 */
async function initiatePayment(bookingId, payerId) {
  // ── 1. Fetch and validate the booking ──────────────────────────────────────
  const bookingResult = await query(
    `SELECT b.id, b.status, b.requester_id, b.post_owner_id,
            b.agreed_price, b.platform_commission_pct, b.platform_commission_amt,
            b.net_payout, b.payment_deadline,
            p.post_type
     FROM bookings b
     JOIN posts p ON p.id = b.post_id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingResult.rows.length === 0) {
    throw ApiError.notFound('Booking not found.');
  }

  const booking = bookingResult.rows[0];

  // Determine who the shipper (payer) and transporter (payee) are based on post type.
  // Need-Transport: post owner = Shipper (payer), requester = Transporter (payee).
  // Vehicle-Available / Return-Journey: requester = Shipper (payer), post owner = Transporter (payee).
  const isNeedTransport = booking.post_type === POST_TYPES.NEED_TRANSPORT;
  const shipperId   = isNeedTransport ? booking.post_owner_id : booking.requester_id;
  const transporterId = isNeedTransport ? booking.requester_id : booking.post_owner_id;

  if (payerId !== shipperId) {
    throw ApiError.forbidden('Only the shipper can initiate payment for this booking.');
  }

  if (booking.status !== BOOKING_STATUS.ACCEPTED) {
    throw new ApiError(
      422,
      `Payment can only be initiated for accepted bookings. Current status: "${booking.status}".`,
      null,
      'PAYMENT_NOT_ALLOWED'
    );
  }

  if (booking.payment_deadline && new Date(booking.payment_deadline) < new Date()) {
    throw new ApiError(
      422,
      'The payment deadline for this booking has passed. The booking will be auto-cancelled.',
      null,
      'PAYMENT_DEADLINE_EXPIRED'
    );
  }

  // ── 2. Check for an existing, non-failed payment ──────────────────────────
  const existingPayment = await query(
    `SELECT id, status, gateway_order_id, amount, currency FROM payments
     WHERE booking_id = $1
       AND status NOT IN ('failed')
     ORDER BY created_at DESC
     LIMIT 1`,
    [bookingId]
  );

  if (existingPayment.rows.length > 0) {
    const existing = existingPayment.rows[0];
    if (existing.status === PAYMENT_STATUS.COMPLETED) {
      throw new ApiError(
        409,
        'This booking has already been paid.',
        null,
        'PAYMENT_ALREADY_COMPLETED'
      );
    }
    // Pending/processing: return the existing Razorpay order so the frontend can
    // reopen checkout and retry. This handles the case where the user closed the
    // Razorpay modal after a payment failure — in dev/test the webhook may not
    // fire to mark the row 'failed', leaving it permanently 'pending'.
    if (
      existing.status === PAYMENT_STATUS.PENDING ||
      existing.status === PAYMENT_STATUS.PROCESSING
    ) {
      console.log(
        `[Payments] Reusing existing ${existing.status} order — booking: ${bookingId}, order: ${existing.gateway_order_id}`
      );
      return {
        orderId:      existing.gateway_order_id,
        amount:       Math.round(parseFloat(existing.amount) * 100), // paise for Razorpay widget
        currency:     existing.currency,
        key:          process.env.RAZORPAY_KEY_ID,
        paymentRowId: existing.id
      };
    }
    throw new ApiError(
      409,
      'A payment has already been initiated for this booking. Please complete or wait for it to expire.',
      null,
      'PAYMENT_ALREADY_INITIATED'
    );
  }

  // ── 3. Create Razorpay order ───────────────────────────────────────────────
  const agreedPrice     = parseFloat(booking.agreed_price);
  const amountInPaise   = Math.round(agreedPrice * 100); // Razorpay uses smallest currency unit

  let razorpayOrder;
  try {
    razorpayOrder = await getRazorpay().orders.create({
      amount:   amountInPaise,
      currency: 'INR',
      receipt:  bookingId // Merchant reference; Razorpay stores but does not enforce uniqueness
    });
  } catch (err) {
    console.error('[Payments] Razorpay order creation failed:', err.message);
    throw new ApiError(
      502,
      'Payment gateway error. Please try again later.',
      null,
      'PAYMENT_GATEWAY_ERROR'
    );
  }

  // ── 4. Insert payments row ─────────────────────────────────────────────────
  const commissionPct = parseFloat(booking.platform_commission_pct);
  const commissionAmt = parseFloat(booking.platform_commission_amt);
  const netPayout     = parseFloat(booking.net_payout);

  const insertResult = await query(
    `INSERT INTO payments
       (booking_id, payer_id, payee_id,
        amount, platform_commission_pct, platform_commission_amt, net_payout_amt,
        currency, status, gateway_name, gateway_order_id, payment_deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      bookingId,
      shipperId,
      transporterId,
      agreedPrice,
      commissionPct,
      commissionAmt,
      netPayout,
      'INR',
      PAYMENT_STATUS.PENDING,
      'razorpay',
      razorpayOrder.id,
      booking.payment_deadline || null
    ]
  );

  const paymentRow = insertResult.rows[0];

  console.log(`[Payments] Order created — booking: ${bookingId}, order: ${razorpayOrder.id}`);

  return {
    orderId:      razorpayOrder.id,
    amount:       razorpayOrder.amount,  // in paise — frontend passes this directly to Razorpay widget
    currency:     razorpayOrder.currency,
    key:          process.env.RAZORPAY_KEY_ID,
    paymentRowId: paymentRow.id
  };
}

// ─── verifyPayment ────────────────────────────────────────────────────────────

/**
 * Verifies the Razorpay HMAC-SHA256 payment signature returned by the
 * checkout widget and marks the payment as completed.
 *
 * Signature is computed as:
 *   HMAC-SHA256(`${orderId}|${paymentId}`, RAZORPAY_KEY_SECRET)
 *
 * Uses `crypto.timingSafeEqual` to prevent timing-attack signature leaks.
 *
 * @param {string} bookingId   - UUID of the booking
 * @param {string} orderId     - Razorpay order ID (`order_xxx`)
 * @param {string} paymentId   - Razorpay payment ID (`pay_xxx`)
 * @param {string} signature   - HMAC-SHA256 hex string from Razorpay
 * @param {string} payerId     - User ID of the payer (from req.user.id)
 * @returns {Promise<object>}  - Formatted payment record
 * @throws {ApiError} 404 if no payment record found for this order
 * @throws {ApiError} 403 if caller is not the payment's payer
 * @throws {ApiError} 409 if payment is already completed
 * @throws {ApiError} 400 if HMAC signature is invalid
 */
async function verifyPayment(bookingId, orderId, paymentId, signature, payerId) {
  // ── 1. Look up the payment row ─────────────────────────────────────────────
  const paymentResult = await query(
    `SELECT * FROM payments WHERE booking_id = $1 AND gateway_order_id = $2`,
    [bookingId, orderId]
  );

  if (paymentResult.rows.length === 0) {
    throw ApiError.notFound('Payment record not found for this booking and order.');
  }

  const payment = paymentResult.rows[0];

  // ── 2. Authorisation check ────────────────────────────────────────────────
  if (payment.payer_id !== payerId) {
    throw ApiError.forbidden('You can only verify your own payments.');
  }

  // ── 3. Idempotency — already completed? ───────────────────────────────────
  if (payment.status === PAYMENT_STATUS.COMPLETED) {
    return formatPayment(payment);
  }

  if (payment.status !== PAYMENT_STATUS.PENDING && payment.status !== PAYMENT_STATUS.PROCESSING) {
    throw new ApiError(
      409,
      `Payment cannot be verified in its current state: "${payment.status}".`,
      null,
      'PAYMENT_STATUS_INVALID'
    );
  }

  // ── 4. HMAC signature verification (timing-safe) ──────────────────────────
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  let signaturesMatch = false;
  try {
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const actualBuf   = Buffer.from(signature,         'hex');
    signaturesMatch   = expectedBuf.length === actualBuf.length &&
                        crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    signaturesMatch = false;
  }

  if (!signaturesMatch) {
    console.warn(`[Payments] Signature mismatch — booking: ${bookingId}, order: ${orderId}`);
    throw ApiError.badRequest(
      'Payment signature verification failed. Do not retry with the same data.',
      'PAYMENT_SIGNATURE_INVALID'
    );
  }

  // ── 5. Mark payment as completed (transactional) ──────────────────────────
  const client = await getClient();
  let updatedPayment;
  try {
    await client.query('BEGIN');

    const updateResult = await client.query(
      `UPDATE payments
       SET status             = $1,
           gateway_payment_id = $2,
           gateway_signature  = $3
       WHERE id = $4
       RETURNING *`,
      [
        PAYMENT_STATUS.COMPLETED,
        paymentId,
        signature,
        payment.id
      ]
    );

    updatedPayment = updateResult.rows[0];
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`[Payments] Payment verified — booking: ${bookingId}, payment: ${paymentId}`);

  // ── 6. Realtime + notification (fire-and-forget) ──────────────────────────
  const paymentPayload = { bookingId, paymentId: updatedPayment.id, status: PAYMENT_STATUS.COMPLETED };
  emitToUser(updatedPayment.payer_id, SOCKET_EVENTS.PAYMENT_STATUS_CHANGED, paymentPayload);
  emitToUser(updatedPayment.payee_id, SOCKET_EVENTS.PAYMENT_STATUS_CHANGED, paymentPayload);

  setImmediate(() => {
    notify({
      userId: updatedPayment.payer_id,
      type:   NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      title:  'Payment confirmed',
      body:   'Your payment has been received. The transporter has been notified.',
      data:   paymentPayload
    });
  });

  return formatPayment(updatedPayment);
}

// ─── handleWebhook ────────────────────────────────────────────────────────────

/**
 * Processes incoming Razorpay webhook events.
 *
 * IMPORTANT: This function NEVER throws — all errors are caught and logged.
 * The webhook endpoint must always return HTTP 200 to Razorpay (even on
 * error) to prevent repeated delivery of the same event.
 *
 * Supported events:
 *   - `payment.captured`  → marks payment as completed
 *   - `payment.failed`    → marks payment as failed
 *   - `refund.processed`  → records refund completion
 *
 * @param {string} rawBody        - Raw request body string (required for HMAC)
 * @param {string} signatureHeader - Value of `X-Razorpay-Signature` header
 * @returns {Promise<void>}
 */
async function handleWebhook(rawBody, signatureHeader) {
  // ── 1. Verify webhook signature ───────────────────────────────────────────
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  let sigValid = false;
  try {
    const expectedBuf = Buffer.from(expectedSig,      'hex');
    const actualBuf   = Buffer.from(signatureHeader || '', 'hex');
    sigValid = expectedBuf.length === actualBuf.length &&
               crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    sigValid = false;
  }

  if (!sigValid) {
    console.warn('[Payments] Webhook: invalid signature — ignoring event.');
    return;
  }

  // ── 2. Parse event ────────────────────────────────────────────────────────
  let event;
  let payload;
  try {
    const parsed = JSON.parse(rawBody);
    event   = parsed.event;
    payload = parsed.payload;
  } catch (err) {
    console.error('[Payments] Webhook: failed to parse body:', err.message);
    return;
  }

  console.log(`[Payments] Webhook received: ${event}`);

  // ── 3. Route by event type ────────────────────────────────────────────────
  try {
    if (event === 'payment.captured') {
      await _webhookPaymentCaptured(payload);
    } else if (event === 'payment.failed') {
      await _webhookPaymentFailed(payload);
    } else if (event === 'refund.processed') {
      await _webhookRefundProcessed(payload);
    } else {
      console.log(`[Payments] Webhook: unhandled event type "${event}" — no action taken.`);
    }
  } catch (err) {
    // Errors are logged but never re-thrown — webhook must always return 200.
    console.error(`[Payments] Webhook: error processing "${event}":`, err.message);
  }
}

/**
 * Handles `payment.captured` webhook — marks the payment as completed.
 * This is an alternative confirmation path to the REST /verify endpoint;
 * if the user closes the browser before /verify is called, Razorpay's
 * webhook ensures the payment is still recorded correctly.
 *
 * @param {object} payload
 * @returns {Promise<void>}
 * @private
 */
async function _webhookPaymentCaptured(payload) {
  const gatewayPaymentId = payload?.payment?.entity?.id;
  const gatewayOrderId   = payload?.payment?.entity?.order_id;

  if (!gatewayPaymentId || !gatewayOrderId) {
    console.warn('[Payments] payment.captured: missing payment ID or order ID in payload.');
    return;
  }

  // Look up by order ID — the payment row was created by initiatePayment()
  const result = await query(
    `SELECT id, status, payer_id, booking_id FROM payments WHERE gateway_order_id = $1`,
    [gatewayOrderId]
  );

  if (result.rows.length === 0) {
    console.warn(`[Payments] payment.captured: no payment found for order ${gatewayOrderId}`);
    return;
  }

  const payment = result.rows[0];

  // Idempotent — if already completed, skip
  if (payment.status === PAYMENT_STATUS.COMPLETED) {
    console.log(`[Payments] payment.captured: already completed for order ${gatewayOrderId}`);
    return;
  }

  await query(
    `UPDATE payments
     SET status             = $1,
         gateway_payment_id = $2
     WHERE id = $3`,
    [PAYMENT_STATUS.COMPLETED, gatewayPaymentId, payment.id]
  );

  console.log(`[Payments] payment.captured: payment ${payment.id} marked completed via webhook.`);

  // Notify payer
  setImmediate(() => {
    notify({
      userId: payment.payer_id,
      type:   NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      title:  'Payment confirmed',
      body:   'Your payment has been received.',
      data:   { bookingId: payment.booking_id, paymentId: payment.id }
    });
  });
}

/**
 * Handles `payment.failed` webhook.
 *
 * @param {object} payload
 * @returns {Promise<void>}
 * @private
 */
async function _webhookPaymentFailed(payload) {
  const gatewayOrderId = payload?.payment?.entity?.order_id;

  if (!gatewayOrderId) {
    console.warn('[Payments] payment.failed: missing order ID in payload.');
    return;
  }

  const result = await query(
    `SELECT id, status FROM payments WHERE gateway_order_id = $1`,
    [gatewayOrderId]
  );

  if (result.rows.length === 0) {
    console.warn(`[Payments] payment.failed: no payment found for order ${gatewayOrderId}`);
    return;
  }

  const payment = result.rows[0];

  if (payment.status !== PAYMENT_STATUS.PENDING && payment.status !== PAYMENT_STATUS.PROCESSING) {
    return; // Already in a terminal state — do nothing
  }

  await query(
    `UPDATE payments SET status = $1 WHERE id = $2`,
    [PAYMENT_STATUS.FAILED, payment.id]
  );

  console.log(`[Payments] payment.failed: payment ${payment.id} marked failed via webhook.`);
}

/**
 * Handles `refund.processed` webhook.
 *
 * @param {object} payload
 * @returns {Promise<void>}
 * @private
 */
async function _webhookRefundProcessed(payload) {
  const refundEntity       = payload?.refund?.entity;
  const gatewayPaymentId   = refundEntity?.payment_id;
  const gatewayRefundId    = refundEntity?.id;
  const refundAmountPaise  = refundEntity?.amount;

  if (!gatewayPaymentId || !gatewayRefundId) {
    console.warn('[Payments] refund.processed: missing payment ID or refund ID in payload.');
    return;
  }

  const refundAmount = refundAmountPaise ? refundAmountPaise / 100 : null;

  const result = await query(
    `SELECT id, amount FROM payments WHERE gateway_payment_id = $1`,
    [gatewayPaymentId]
  );

  if (result.rows.length === 0) {
    console.warn(`[Payments] refund.processed: no payment found for payment ${gatewayPaymentId}`);
    return;
  }

  const payment         = result.rows[0];
  const originalAmount  = parseFloat(payment.amount);
  const isPartial       = refundAmount !== null && refundAmount < originalAmount;

  await query(
    `UPDATE payments
     SET status           = $1,
         refund_amount    = $2,
         gateway_refund_id = $3,
         refunded_at      = NOW()
     WHERE id = $4`,
    [
      isPartial ? PAYMENT_STATUS.PARTIALLY_REFUNDED : PAYMENT_STATUS.REFUNDED,
      refundAmount,
      gatewayRefundId,
      payment.id
    ]
  );

  console.log(`[Payments] refund.processed: payment ${payment.id} refund recorded.`);
}

// ─── releasePayment ───────────────────────────────────────────────────────────

/**
 * Records an escrow release for a completed booking. Notifies the payee
 * (transporter). Does not initiate an actual bank transfer — at current
 * scope, physical payouts are manual or handled via Razorpay Route/Dashboard.
 *
 * This function is exported for use by Block O admin routes and the cron job.
 * It is NOT exposed as a public API endpoint in Block N.
 *
 * @param {string} bookingId   - UUID of the completed booking
 * @param {string} releasedBy  - Admin user ID or 'cron' for system releases
 * @returns {Promise<object>}  - Formatted payment record
 * @throws {ApiError} 404 if booking or payment not found
 * @throws {ApiError} 422 if booking is not completed
 * @throws {ApiError} 422 if payment has not been received yet
 * @throws {ApiError} 409 if payment has already been released/refunded
 */
async function releasePayment(bookingId, releasedBy) {
  const bookingResult = await query(
    `SELECT id, status, post_owner_id FROM bookings WHERE id = $1`,
    [bookingId]
  );

  if (bookingResult.rows.length === 0) {
    throw ApiError.notFound('Booking not found.');
  }

  const booking = bookingResult.rows[0];

  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    throw new ApiError(
      422,
      'Payment can only be released for completed bookings.',
      null,
      'BOOKING_NOT_COMPLETED'
    );
  }

  const paymentResult = await query(
    `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [bookingId]
  );

  if (paymentResult.rows.length === 0) {
    throw ApiError.notFound('No payment record found for this booking.');
  }

  const payment = paymentResult.rows[0];

  if (payment.status !== PAYMENT_STATUS.COMPLETED) {
    throw new ApiError(
      422,
      `Payment cannot be released — current status: "${payment.status}".`,
      null,
      'PAYMENT_NOT_RECEIVABLE'
    );
  }

  if (payment.refunded_at || payment.refund_amount) {
    throw new ApiError(
      409,
      'This payment has already been refunded and cannot be released.',
      null,
      'PAYMENT_ALREADY_REFUNDED'
    );
  }

  // Record the release by setting auto_release_at to NOW (signals it was actioned)
  const updateResult = await query(
    `UPDATE payments SET auto_release_at = NOW() WHERE id = $1 RETURNING *`,
    [payment.id]
  );

  const updatedPayment = updateResult.rows[0];

  console.log(
    `[Payments] Payment released — booking: ${bookingId}, released_by: ${releasedBy}`
  );

  setImmediate(() => {
    notify({
      userId: booking.post_owner_id,
      type:   NOTIFICATION_TYPES.PAYMENT_RELEASED,
      title:  'Payment released',
      body:   'Your payment has been released. Please check your Razorpay dashboard.',
      data:   { bookingId, paymentId: updatedPayment.id }
    });
  });

  return formatPayment(updatedPayment);
}

// ─── refundPayment ────────────────────────────────────────────────────────────

/**
 * Issues a (partial or full) refund via Razorpay and records the result.
 * Admin-only — called by Block O admin routes.
 *
 * @param {string} bookingId  - UUID of the booking to refund
 * @param {number} amount     - Refund amount in INR (not paise)
 * @param {string} reason     - Human-readable reason for audit log
 * @param {string} adminId    - Admin user ID initiating the refund
 * @returns {Promise<object>} - Formatted payment record post-refund
 * @throws {ApiError} 404 if payment not found
 * @throws {ApiError} 422 if payment is not in 'completed' status
 * @throws {ApiError} 400 if refund amount exceeds original amount
 */
async function refundPayment(bookingId, amount, reason, adminId) {
  const paymentResult = await query(
    `SELECT * FROM payments
     WHERE booking_id = $1
       AND status = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [bookingId, PAYMENT_STATUS.COMPLETED]
  );

  if (paymentResult.rows.length === 0) {
    throw ApiError.notFound(
      'No completed payment found for this booking. Only completed payments can be refunded.'
    );
  }

  const payment        = paymentResult.rows[0];
  const originalAmount = parseFloat(payment.amount);

  if (amount > originalAmount) {
    throw ApiError.badRequest(
      `Refund amount (₹${amount}) exceeds the original payment (₹${originalAmount}).`,
      'REFUND_EXCEEDS_ORIGINAL'
    );
  }

  if (!payment.gateway_payment_id) {
    throw new ApiError(
      422,
      'Cannot refund: no Razorpay payment ID on record.',
      null,
      'GATEWAY_PAYMENT_ID_MISSING'
    );
  }

  // ── Call Razorpay refund API ───────────────────────────────────────────────
  const amountInPaise = Math.round(amount * 100);
  let refund;
  try {
    refund = await getRazorpay().payments.refund(payment.gateway_payment_id, {
      amount: amountInPaise
    });
  } catch (err) {
    console.error('[Payments] Razorpay refund API error:', err.message);
    throw new ApiError(
      502,
      'Refund request to payment gateway failed. Please try again.',
      null,
      'PAYMENT_GATEWAY_ERROR'
    );
  }

  const isPartial = amount < originalAmount;

  const updateResult = await query(
    `UPDATE payments
     SET status             = $1,
         refund_amount      = $2,
         refund_reason      = $3,
         refunded_at        = NOW(),
         gateway_refund_id  = $4
     WHERE id = $5
     RETURNING *`,
    [
      isPartial ? PAYMENT_STATUS.PARTIALLY_REFUNDED : PAYMENT_STATUS.REFUNDED,
      amount,
      reason,
      refund.id,
      payment.id
    ]
  );

  const updatedPayment = updateResult.rows[0];

  console.log(
    `[Payments] Refund issued — booking: ${bookingId}, amount: ₹${amount}, admin: ${adminId}`
  );

  return formatPayment(updatedPayment);
}

module.exports = {
  initiatePayment,
  verifyPayment,
  handleWebhook,
  releasePayment,
  refundPayment
};
