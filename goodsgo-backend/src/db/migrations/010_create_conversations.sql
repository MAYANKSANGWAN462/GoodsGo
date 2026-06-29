-- ============================================================
-- Migration 010: Conversations Table
-- Depends on: 008_create_bookings.sql (bookings.id FK)
--             002_create_users.sql (users.id FK × 2)
-- Referenced by: 011_create_messages.sql
-- Used by: bookings.service.js (auto-create on accept), chat.service.js
-- ============================================================

-- Conversation lifecycle mirrors booking status:
--   active   → booking accepted or in_progress (both users can send messages)
--   locked   → booking cancelled or rejected (read-only; history preserved for disputes)
--   archived → booking completed (read-only after configured retention period)
DO $$ BEGIN
    CREATE TYPE conversation_status_enum AS ENUM (
        'active',
        'locked',
        'archived'
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'conversation_status_enum already exists, skipping.';
END $$;

CREATE TABLE IF NOT EXISTS conversations (
    id                  UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Each accepted booking gets exactly ONE conversation (enforced by UNIQUE below)
    booking_id          UUID                        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    -- Stored explicitly for fast "my conversations" queries without joining bookings
    participant_1_id    UUID                        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_2_id    UUID                        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Controls whether new messages can be sent
    status              conversation_status_enum    NOT NULL DEFAULT 'active',

    -- Denormalised for fast conversation list rendering
    -- Avoids sub-query per conversation on the chat page
    last_message_at     TIMESTAMP WITH TIME ZONE,
    last_message_preview VARCHAR(255),  -- first 255 chars of last message content

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── One conversation per booking ──────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_booking_id_unique
    ON conversations (booking_id);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- "My conversations" for participant 1 (ordered by most recent message)
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1
    ON conversations (participant_1_id, last_message_at DESC NULLS LAST);

-- "My conversations" for participant 2
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2
    ON conversations (participant_2_id, last_message_at DESC NULLS LAST);