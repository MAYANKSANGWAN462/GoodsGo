-- ============================================================
-- Migration 008: Bookings Table
-- Depends on: 006_create_posts.sql (posts.id FK)
--             002_create_users.sql (users.id FK × 3)
-- Referenced by: booking_status_history, conversations, reviews, payments
-- ============================================================

-- ── ENUM: booking status (9 states) ──────────────────────────────────────────
-- State machine transitions (→ = allowed):
--   pending → accepted | rejected | withdrawn | auto_rejected
--   accepted → in_progress | cancelled
--   in_progress → completed | disputed
--   (rejected, withdrawn, auto_rejected, cancelled, completed, disputed = terminal)
DO $$ BEGIN
    CREATE TYPE booking_status_enum AS ENUM (
        'pending',          -- Request sent; awaiting post owner response
        'accepted',         -- Post owner accepted; conversation auto-created
        'rejected',         -- Post owner explicitly rejected
        'withdrawn',        -- Requester cancelled their own pending request
        'auto_rejected',    -- Cron job rejected after BOOKING_AUTO_REJECT_HOURS timeout
        'cancelled',        -- Either party cancelled after acceptance
        'in_progress',      -- Goods picked up; delivery underway
        'completed',        -- Delivery confirmed complete; reviews and payment release unlocked
        'disputed'          -- Either party raised a formal dispute
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'booking_status_enum already exists, skipping.';
END $$;

-- ── Table ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id                      UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id                 UUID                    NOT NULL REFERENCES posts(id),
    requester_id            UUID                    NOT NULL REFERENCES users(id),
    post_owner_id           UUID                    NOT NULL REFERENCES users(id),

    status                  booking_status_enum     NOT NULL DEFAULT 'pending',

    -- ── Negotiated terms (populated on accept) ────────────────────────────────
    agreed_price            DECIMAL(12, 2),
    -- Commission percentage snapshot at time of booking (not live platform setting)
    platform_commission_pct DECIMAL(5, 2)           NOT NULL DEFAULT 10.00,
    platform_commission_amt DECIMAL(12, 2),          -- agreed_price × pct / 100
    net_payout              DECIMAL(12, 2),           -- agreed_price - commission

    -- ── Booking specifics ─────────────────────────────────────────────────────
    pickup_address          TEXT,
    destination_address     TEXT,
    scheduled_date          DATE,
    goods_description       TEXT,
    special_instructions    TEXT,

    -- ── Lifecycle timestamps (set when transitioning to that status) ──────────
    accepted_at             TIMESTAMP WITH TIME ZONE,
    rejected_at             TIMESTAMP WITH TIME ZONE,
    withdrawn_at            TIMESTAMP WITH TIME ZONE,
    auto_rejected_at        TIMESTAMP WITH TIME ZONE,
    cancelled_at            TIMESTAMP WITH TIME ZONE,
    in_progress_at          TIMESTAMP WITH TIME ZONE,
    completed_at            TIMESTAMP WITH TIME ZONE,
    disputed_at             TIMESTAMP WITH TIME ZONE,

    -- ── Cancellation detail ───────────────────────────────────────────────────
    cancelled_by            UUID    REFERENCES users(id) ON DELETE SET NULL,
    cancellation_reason     TEXT,

    -- ── Payment escrow timing ─────────────────────────────────────────────────
    -- Customer must pay within PAYMENT_DEADLINE_HOURS of acceptance;
    -- cron auto-cancels and re-opens post if deadline passes unpaid
    payment_deadline        TIMESTAMP WITH TIME ZONE,

    -- ── Timestamps ───────────────────────────────────────────────────────────
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- "My booking requests" (as requester)
CREATE INDEX IF NOT EXISTS idx_bookings_requester_id
    ON bookings (requester_id, created_at DESC);

-- "Received booking requests" (as post owner)
CREATE INDEX IF NOT EXISTS idx_bookings_post_owner_id
    ON bookings (post_owner_id, created_at DESC);

-- "All bookings for this post" (post detail, admin view)
CREATE INDEX IF NOT EXISTS idx_bookings_post_id
    ON bookings (post_id);

-- Status filter (cron job queries, admin panel)
CREATE INDEX IF NOT EXISTS idx_bookings_status
    ON bookings (status);

-- Cron auto-reject: pending bookings older than BOOKING_AUTO_REJECT_HOURS
CREATE INDEX IF NOT EXISTS idx_bookings_pending_created_at
    ON bookings (created_at)
    WHERE status = 'pending';

-- ── Partial Unique Index: Duplicate Booking Prevention ───────────────────────
-- A user can only have ONE active (pending/accepted/in_progress) booking per post.
-- Enforced at DB level — prevents race conditions that application-layer checks miss.
-- After rejection/withdrawal/cancellation/completion a new request is allowed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_one_active_per_user_per_post
    ON bookings (post_id, requester_id)
    WHERE status IN ('pending', 'accepted', 'in_progress');

-- ── Updated_at Trigger ────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();