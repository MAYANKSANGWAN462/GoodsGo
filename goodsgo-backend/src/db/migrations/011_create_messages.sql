-- ============================================================
-- Migration 011: Messages Table
-- Depends on: 010_create_conversations.sql (conversations.id FK)
--             002_create_users.sql (users.id FK — nullable for system messages)
-- Used by: chat.service.js, chat.socket.js (Block J)
-- ============================================================

-- text   → standard user text message
-- image  → image shared in chat (Cloudinary URL stored in image_url)
-- system → auto-generated platform message (e.g. "Booking accepted. You can now chat.")
--          sender_id is NULL for system messages
DO $$ BEGIN
    CREATE TYPE message_type_enum AS ENUM (
        'text',
        'image',
        'system'
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'message_type_enum already exists, skipping.';
END $$;

CREATE TABLE IF NOT EXISTS messages (
    id                  UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id     UUID                NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- NULL for system-generated messages (booking lifecycle notifications in chat)
    sender_id           UUID    REFERENCES users(id) ON DELETE SET NULL,

    content             TEXT                NOT NULL,
    message_type        message_type_enum   NOT NULL DEFAULT 'text',

    -- Populated only for image messages
    image_url           TEXT,
    image_public_id     VARCHAR(255),   -- Cloudinary public_id for potential deletion

    -- Read receipt: set when the recipient opens the conversation
    is_read             BOOLEAN             NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMP WITH TIME ZONE,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Primary access: paginate messages for a conversation (oldest-first for chat display)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
    ON messages (conversation_id, created_at ASC);

-- Unread count per conversation — partial index covers only unread rows
-- Used for unread badge count and "mark as read" operations
CREATE INDEX IF NOT EXISTS idx_messages_unread
    ON messages (conversation_id, is_read)
    WHERE is_read = FALSE;