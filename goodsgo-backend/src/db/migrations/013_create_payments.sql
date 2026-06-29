-- ============================================================
-- Migration 013: Payments Table
-- Depends on: 008_create_bookings.sql (bookings.id FK)
--             002_create_users.sql (users.id FK × 2)
-- Used by: payments.service.js — initiate, verify, webhook handler, release
-- ============================================================

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM (
        'pending',              -- Gateway order created; awaiting customer payment
        'processing',           -- Gateway processing; final webhook not yet received
        'completed',            -- Payment confirmed; funds held by platform
        'failed',               -- Gateway reported failure
        'refunded',             -- Full refund issued to customer
        'partially_refunded'    -- Partial refund (dispute resolution outcome)
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'payment_status_enum already exists, skipping.';
END $$;

CREATE TABLE IF NOT EXISTS payments (
    id                          UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id                  UUID                    NOT NULL REFERENCES bookings(id),
    payer_id                    UUID                    NOT NULL REFERENCES users(id),  -- customer
    payee_id                    UUID                    NOT NULL REFERENCES users(id),  -- transporter

    -- ── Amount split ──────────────────────────────────────────────────────────
    amount                      DECIMAL(12, 2)          NOT NULL,   -- full amount charged to customer
    platform_commission_pct     DECIMAL(5, 2)           NOT NULL,   -- % at time of payment
    platform_commission_amt     DECIMAL(12, 2)          NOT NULL,   -- platform keeps this
    net_payout_amt              DECIMAL(12, 2)          NOT NULL,   -- released to transporter

    currency                    VARCHAR(3)              NOT NULL DEFAULT 'INR',
    status                      payment_status_enum     NOT NULL DEFAULT 'pending',

    -- ── Payment gateway fields ────────────────────────────────────────────────
    gateway_name                VARCHAR(50),            -- 'razorpay' | 'stripe'
    gateway_order_id            VARCHAR(255),           -- Created server-side before redirect
    gateway_payment_id          VARCHAR(255) UNIQUE,    -- Returned by gateway on success; UNIQUE prevents duplicate processing
    gateway_signature           TEXT,                   -- HMAC-SHA256 signature for verification
    gateway_response            JSONB,                  -- Full gateway response stored for audit

    -- ── Refund fields ─────────────────────────────────────────────────────────
    refund_amount               DECIMAL(12, 2),
    refund_reason               TEXT,
    refunded_at                 TIMESTAMP WITH TIME ZONE,
    gateway_refund_id           VARCHAR(255),

    -- ── Escrow timing ─────────────────────────────────────────────────────────
    -- Customer must pay within PAYMENT_DEADLINE_HOURS of booking acceptance.
    -- Set by bookings.service.js when status transitions to 'accepted'.
    -- Cron auto-cancels the booking if deadline passes with status still 'pending'.
    payment_deadline            TIMESTAMP WITH TIME ZONE,

    -- If transporter never marks complete, platform auto-releases after this date.
    -- Set by payments.service.js when payment status becomes 'completed'.
    auto_release_at             TIMESTAMP WITH TIME ZONE,

    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- "My payment history" as payer/customer
CREATE INDEX IF NOT EXISTS idx_payments_payer_id
    ON payments (payer_id, created_at DESC);

-- "My earnings history" as payee/transporter
CREATE INDEX IF NOT EXISTS idx_payments_payee_id
    ON payments (payee_id, created_at DESC);

-- Fetch payment for a booking (booking detail page)
CREATE INDEX IF NOT EXISTS idx_payments_booking_id
    ON payments (booking_id);

-- Webhook deduplication: check if gateway_payment_id already processed
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id
    ON payments (gateway_payment_id)
    WHERE gateway_payment_id IS NOT NULL;

-- Cron: find unpaid accepted bookings past payment_deadline
CREATE INDEX IF NOT EXISTS idx_payments_deadline
    ON payments (payment_deadline)
    WHERE status = 'pending' AND payment_deadline IS NOT NULL;

-- Cron: find completed payments past auto_release_at
CREATE INDEX IF NOT EXISTS idx_payments_auto_release
    ON payments (auto_release_at)
    WHERE status = 'completed' AND auto_release_at IS NOT NULL;

-- ── Updated_at Trigger ────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();