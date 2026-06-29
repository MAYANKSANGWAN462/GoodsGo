-- ============================================================
-- Migration 009: Booking Status History Table
-- Depends on: 008_create_bookings.sql (bookings.id FK)
--             002_create_users.sql (users.id FK)
-- Used by: bookings.service.js — every status transition inserts one row
-- ============================================================
-- APPEND-ONLY: rows are never updated or deleted.
-- Provides full audit trail for dispute resolution and admin investigation.
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_status_history (
    id          UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  UUID                    NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    -- NULL for the initial 'pending' creation (no prior status)
    from_status booking_status_enum,
    to_status   booking_status_enum     NOT NULL,

    -- Who triggered the change: requester, post_owner, or NULL for system (cron)
    changed_by  UUID    REFERENCES users(id) ON DELETE SET NULL,

    -- Human-readable reason (cancellation reason, rejection reason, etc.)
    reason      TEXT,

    -- Structured metadata for this specific transition
    -- e.g. { "agreed_price": 5000 } on accept
    -- e.g. { "auto_reject_reason": "timeout_48h" } on auto_rejected
    metadata    JSONB,

    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- "Show history for this booking" (booking detail page, admin dispute view)
CREATE INDEX IF NOT EXISTS idx_booking_history_booking_id
    ON booking_status_history (booking_id, created_at ASC);