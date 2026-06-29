-- ============================================================
-- Migration 005: Password Resets Table
-- Depends on: 002_create_users.sql (users.id FK)
-- Used by: auth.service.js — forgot-password, reset-password
-- ============================================================

CREATE TABLE IF NOT EXISTS password_resets (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 64-character hex string. Embedded in reset link: FRONTEND_URL/reset-password?token=<token>
    token       VARCHAR(64) NOT NULL UNIQUE,

    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,  -- 1 hour from creation
    used_at     TIMESTAMP WITH TIME ZONE,            -- set on successful reset; prevents token reuse
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Primary lookup: find token from email link click
CREATE INDEX IF NOT EXISTS idx_password_resets_token
    ON password_resets (token);

-- Check for existing unexpired reset before issuing a new one
CREATE INDEX IF NOT EXISTS idx_password_resets_user_pending
    ON password_resets (user_id)
    WHERE used_at IS NULL;