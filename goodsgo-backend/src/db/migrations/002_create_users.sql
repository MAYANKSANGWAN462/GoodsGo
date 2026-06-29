-- ============================================================
-- Migration 002: Users Table
-- Depends on: 001_create_extensions.sql (uuid_generate_v4, trigger fn)
-- Referenced by: refresh_tokens, email_verifications, password_resets,
--                posts, bookings, conversations, messages, reviews,
--                payments, notifications, saved_posts, reported_posts,
--                identity_documents
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id                          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ── Credentials ───────────────────────────────────────────────────────────
    email                       VARCHAR(255)    NOT NULL UNIQUE,
    phone                       VARCHAR(20)     UNIQUE,
    password_hash               TEXT            NOT NULL,

    -- ── Profile ───────────────────────────────────────────────────────────────
    full_name                   VARCHAR(255)    NOT NULL,
    profile_image_url           TEXT,
    profile_image_public_id     VARCHAR(255),       -- Cloudinary public_id for deletion API
    bio                         TEXT,
    city                        VARCHAR(100),
    state                       VARCHAR(100),
    country                     VARCHAR(100)    NOT NULL DEFAULT 'India',

    -- ── Verification flags ────────────────────────────────────────────────────
    -- Each flag is set independently through its own verification flow
    is_email_verified           BOOLEAN         NOT NULL DEFAULT FALSE,
    is_phone_verified           BOOLEAN         NOT NULL DEFAULT FALSE,
    is_identity_verified        BOOLEAN         NOT NULL DEFAULT FALSE, -- admin-approved KYC

    -- ── Account status ────────────────────────────────────────────────────────
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    suspended_at                TIMESTAMP WITH TIME ZONE,
    suspension_reason           TEXT,

    -- ── Rating aggregate (updated by reviews.service.js on each review) ───────
    -- Stored as aggregate to avoid expensive COUNT/AVG joins on every profile view
    rating                      DECIMAL(3, 2)   NOT NULL DEFAULT 0.00,
    total_reviews               INTEGER         NOT NULL DEFAULT 0,

    -- ── Cancellation tracking (visible on public profile) ────────────────────
    -- Incremented by bookings.service.js on each post-acceptance cancellation
    cancellation_count          INTEGER         NOT NULL DEFAULT 0,

    -- ── Timestamps ───────────────────────────────────────────────────────────
    last_login_at               TIMESTAMP WITH TIME ZONE,
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMP WITH TIME ZONE    -- soft delete
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Auth middleware: lookup by email on login
CREATE INDEX IF NOT EXISTS idx_users_email
    ON users (email);

-- Phone verification flow: lookup by phone
CREATE INDEX IF NOT EXISTS idx_users_phone
    ON users (phone)
    WHERE phone IS NOT NULL;

-- Most queries exclude deleted/suspended accounts
CREATE INDEX IF NOT EXISTS idx_users_active
    ON users (is_active)
    WHERE deleted_at IS NULL;

-- City-based user search (admin panel, public profile discovery)
CREATE INDEX IF NOT EXISTS idx_users_city
    ON users (city)
    WHERE city IS NOT NULL;

-- Full-text: admin user search (requires pg_trgm from 001)
CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm
    ON users USING GIN (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_email_trgm
    ON users USING GIN (email gin_trgm_ops);

-- ── Updated_at Trigger ────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();