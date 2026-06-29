-- ============================================================
-- Migration 017: Admin Users Table
-- Depends on: 001_create_extensions.sql (uuid_generate_v4, trigger fn)
-- Referenced by: 018_create_platform_settings.sql (updated_by FK)
-- ALSO: Adds the deferred FK from reported_posts.reviewed_by to admin_users(id)
--       This must run AFTER 016_create_reported_posts.sql — which it does.
-- ============================================================

-- Admin role hierarchy (numeric levels used in adminAuth.middleware.js):
--   super_admin (3): full access — delete users, change platform settings, manage admins
--   admin       (2): moderate content, suspend users, manage payments and disputes
--   moderator   (1): review reports, hide posts, view dashboard
DO $$ BEGIN
    CREATE TYPE admin_role_enum AS ENUM (
        'super_admin',
        'admin',
        'moderator'
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'admin_role_enum already exists, skipping.';
END $$;

CREATE TABLE IF NOT EXISTS admin_users (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255)        NOT NULL UNIQUE,
    password_hash   TEXT                NOT NULL,
    full_name       VARCHAR(255)        NOT NULL,
    role            admin_role_enum     NOT NULL DEFAULT 'moderator',
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_admin_users_email
    ON admin_users (email);

CREATE INDEX IF NOT EXISTS idx_admin_users_active
    ON admin_users (is_active);

-- ── Updated_at Trigger ────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin_users;
CREATE TRIGGER trg_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ── Deferred FK: reported_posts.reviewed_by → admin_users(id) ────────────────
-- reported_posts was created in migration 016, before this table existed.
-- The reviewed_by column was left as a plain UUID at that point.
-- Now that admin_users exists, we add the FK constraint.
-- Using DO/EXCEPTION for idempotency — safe to re-run.
DO $$ BEGIN
    ALTER TABLE reported_posts
        ADD CONSTRAINT fk_reported_posts_reviewed_by
        FOREIGN KEY (reviewed_by)
        REFERENCES admin_users(id)
        ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'fk_reported_posts_reviewed_by already exists, skipping.';
END $$;