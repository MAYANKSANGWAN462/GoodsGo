-- ============================================================
-- Migration 019: Disputes Table
-- Depends on: 001_create_extensions.sql (uuid_generate_v4, update_updated_at_column)
--             002_create_users.sql      (users.id FK — raised_by)
--             008_create_bookings.sql   (bookings.id FK — booking_id)
--             017_create_admin_users.sql (admin_users.id FK — resolved_by)
-- Referenced by: bookings.service.raiseDispute()
--               admin.service.listDisputes()
--               admin.service.getDisputeDetail()
--               admin.service.resolveDispute()
-- ============================================================

-- ── ENUM: dispute status ───────────────────────────────────────────────────────
-- 'open'                    — initial state on creation
-- 'under_review'            — admin has claimed the dispute for review
-- 'resolved_for_customer'   — terminal: ruling in favour of the requester
-- 'resolved_for_transporter'— terminal: ruling in favour of the post owner
-- 'resolved_partial'        — terminal: compromise resolution
DO $$ BEGIN
    CREATE TYPE dispute_status_enum AS ENUM (
        'open',
        'under_review',
        'resolved_for_customer',
        'resolved_for_transporter',
        'resolved_partial'
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'dispute_status_enum already exists, skipping.';
END $$;

-- ── Table ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Which booking this dispute belongs to.
    -- CASCADE: if a booking is ever removed, its dispute goes with it.
    -- In practice bookings are never hard-deleted, so this is a safety net.
    booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    -- The user who raised the dispute.
    -- SET NULL: preserve the dispute record even if the user account is removed.
    raised_by     UUID REFERENCES users(id) ON DELETE SET NULL,

    reason        VARCHAR(255) NOT NULL,
    description   TEXT,

    -- Array of Cloudinary public IDs or signed URLs for evidence images.
    -- Stored as JSONB for flexibility; validated/populated via the client.
    evidence_urls JSONB NOT NULL DEFAULT '[]',

    status        dispute_status_enum NOT NULL DEFAULT 'open',
    admin_notes   TEXT,

    -- Admin who resolved the dispute (NULL until a terminal status is set).
    -- SET NULL: preserve the record if the admin account is removed.
    resolved_by   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    resolved_at   TIMESTAMP WITH TIME ZONE,

    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Trigger: auto-update updated_at ──────────────────────────────────────────
-- Reuses the shared function created in migration 001.
DO $$ BEGIN
    CREATE TRIGGER trg_disputes_updated_at
        BEFORE UPDATE ON disputes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'trg_disputes_updated_at already exists, skipping.';
END $$;

-- ── Indexes ────────────────────────────────────────────────────────────────────
-- booking_id: used when loading dispute for a specific booking
CREATE INDEX IF NOT EXISTS idx_disputes_booking_id  ON disputes (booking_id);

-- raised_by: used for "disputes raised by user" history views
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by   ON disputes (raised_by)
    WHERE raised_by IS NOT NULL;

-- status: the primary filter on the admin dispute management list
CREATE INDEX IF NOT EXISTS idx_disputes_status      ON disputes (status);

-- created_at DESC: chronological ordering on list queries
CREATE INDEX IF NOT EXISTS idx_disputes_created_at  ON disputes (created_at DESC);
