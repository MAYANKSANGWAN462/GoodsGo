-- ============================================================
-- Migration 021: Google OAuth Support
-- Adds google_id, auth_provider to users;
-- makes password_hash nullable for Google-only accounts.
-- ============================================================

-- Allow users created via Google OAuth to have no password
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Google subject identifier (sub) — unique per Google account
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id     VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20)  NOT NULL DEFAULT 'email';

-- Fast lookup on Google sign-in (only non-null rows indexed)
CREATE INDEX IF NOT EXISTS idx_users_google_id
  ON users (google_id)
  WHERE google_id IS NOT NULL;
