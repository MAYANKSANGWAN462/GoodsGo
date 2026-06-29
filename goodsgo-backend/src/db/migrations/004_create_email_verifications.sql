-- ============================================================
-- Migration 004: Email Verifications Table
-- Depends on: 002_create_users.sql (users.id FK)
-- Used by: auth.service.js — register, resend-verification, verify-email
-- ============================================================

CREATE TABLE IF NOT EXISTS email_verifications (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 64-character hex string (32 crypto-random bytes via generateOTP.js)
    -- Embedded in verification link: FRONTEND_URL/verify-email?token=<token>
    -- Stored as plaintext — single-use, server-side lookup only
    token       VARCHAR(64) NOT NULL UNIQUE,

    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,  -- 1 hour from creation
    used_at     TIMESTAMP WITH TIME ZONE,            -- set on successful verification
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Primary lookup: find token from email link click
CREATE INDEX IF NOT EXISTS idx_email_verifications_token
    ON email_verifications (token);

-- Check for existing pending token before creating a new one
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_pending
    ON email_verifications (user_id)
    WHERE used_at IS NULL;