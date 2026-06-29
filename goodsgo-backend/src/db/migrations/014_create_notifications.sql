-- ============================================================
-- Migration 014: Notifications Table
-- Depends on: 002_create_users.sql (users.id FK)
-- Used by: notifications.service.js — create + socket emit, all service modules
-- ============================================================
-- Entity references (booking_id, post_id, conversation_id) are stored in the
-- JSONB `data` column, NOT as FK columns. This allows notifications to survive
-- the deletion of the referenced entity while still enabling deep-linking.
-- ============================================================

DO $$ BEGIN
    CREATE TYPE notification_type_enum AS ENUM (
        'booking_request_received',
        'booking_accepted',
        'booking_rejected',
        'booking_withdrawn',
        'booking_cancelled',
        'booking_completed',
        'booking_auto_rejected',
        'new_message',
        'review_received',
        'payment_received',
        'payment_released',
        'post_expired',
        'post_expiry_warning',
        'dispute_raised',
        'dispute_resolved',
        'account_verified',
        'system'
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'notification_type_enum already exists, skipping.';
END $$;

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID                        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        notification_type_enum      NOT NULL,

    -- Display text shown in notification list and future push notification
    title       VARCHAR(255)                NOT NULL,
    body        TEXT                        NOT NULL,

    -- Deep-link payload for frontend navigation on tap
    -- e.g. { "booking_id": "uuid", "post_id": "uuid", "conversation_id": "uuid" }
    data        JSONB,

    is_read     BOOLEAN                     NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMP WITH TIME ZONE,

    created_at  TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- "My notifications" feed (most recent first)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications (user_id, created_at DESC);

-- Unread badge count — partial index covers only unread rows (fast COUNT)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications (user_id)
    WHERE is_read = FALSE;