-- ============================================================
-- Migration 003: Refresh Tokens Table
-- Depends on: 002_create_users.sql (users.id FK)
-- Used by: auth.service.js — login, logout, token rotation
-- ============================================================
-- SECURITY: Only SHA-256 hashes are stored, never plaintext tokens.
-- The plaintext token lives exclusively in the client's httpOnly cookie.
-- A database breach cannot be used to impersonate users.
-- ============================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- SHA-256 hash of the actual JWT refresh token sent to the client
    token_hash      TEXT        NOT NULL UNIQUE,

    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- NULL = active token. Set on logout, password change, or rotation.
    revoked_at      TIMESTAMP WITH TIME ZONE,
    -- 'logout' | 'password_change' | 'rotation' | 'admin' | 'reuse_detected'
    revoked_reason  VARCHAR(50)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Primary lookup: verify token hash on every /auth/refresh-token request
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
    ON refresh_tokens (token_hash);

-- Revoke all tokens for a user (logout-all, password change)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
    ON refresh_tokens (user_id);

-- Cron cleanup: delete expired and revoked tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
    ON refresh_tokens (expires_at)
    WHERE revoked_at IS NULL;