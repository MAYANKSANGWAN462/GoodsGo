-- ============================================================
-- Migration 016: Reported Posts Table
-- Depends on: 002_create_users.sql (users.id FK)
--             006_create_posts.sql (posts.id FK)
-- NOTE: reviewed_by column references admin_users — but admin_users does not
--       exist yet. The FK constraint is added at the END of migration 017,
--       after admin_users has been created. This is the standard "deferred FK"
--       pattern for situations where the referenced table comes later in order.
-- Used by: posts.service.js (submit report), admin.service.js (review/resolve)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE report_reason_enum AS ENUM (
        'spam',
        'misleading',
        'inappropriate',
        'fraud',
        'duplicate',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'report_reason_enum already exists, skipping.';
END $$;

DO $$ BEGIN
    CREATE TYPE report_status_enum AS ENUM (
        'pending',
        'under_review',
        'resolved',
        'dismissed'
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'report_status_enum already exists, skipping.';
END $$;

CREATE TABLE IF NOT EXISTS reported_posts (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id     UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id         UUID                NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    reason          report_reason_enum  NOT NULL,
    description     TEXT,               -- optional extra context from the reporter

    status          report_status_enum  NOT NULL DEFAULT 'pending',

    -- Admin resolution
    admin_notes     TEXT,
    -- Plain UUID — FK constraint to admin_users is added in migration 017
    reviewed_by     UUID,
    reviewed_at     TIMESTAMP WITH TIME ZONE,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── One report per user per post ──────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_reported_posts_unique_reporter_post
    ON reported_posts (reporter_id, post_id);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Admin panel: open reports queue (oldest first = FIFO triage)
CREATE INDEX IF NOT EXISTS idx_reported_posts_status
    ON reported_posts (status, created_at ASC)
    WHERE status IN ('pending', 'under_review');

-- How many times a post has been reported
CREATE INDEX IF NOT EXISTS idx_reported_posts_post_id
    ON reported_posts (post_id);