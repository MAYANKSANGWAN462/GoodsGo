-- ============================================================
-- Migration 012: Reviews Table
-- Depends on: 008_create_bookings.sql (bookings.id FK)
--             002_create_users.sql (users.id FK × 2)
-- Used by: reviews.service.js — create review, update user rating aggregate
-- ============================================================

-- Records the role the REVIEWEE played in this booking:
--   requester reviews post_owner → review_role = 'as_transporter'
--   post_owner reviews requester → review_role = 'as_customer'
DO $$ BEGIN
    CREATE TYPE review_role_enum AS ENUM (
        'as_customer',      -- reviewee was the goods sender in this booking
        'as_transporter'    -- reviewee was the vehicle operator in this booking
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'review_role_enum already exists, skipping.';
END $$;

CREATE TABLE IF NOT EXISTS reviews (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID                NOT NULL REFERENCES bookings(id),
    reviewer_id     UUID                NOT NULL REFERENCES users(id),
    reviewee_id     UUID                NOT NULL REFERENCES users(id),

    -- 1–5 stars; enforced by CHECK constraint
    rating          SMALLINT            NOT NULL,
    comment         TEXT,
    review_role     review_role_enum    NOT NULL,

    -- Admin can hide abusive reviews without deleting the record
    is_visible      BOOLEAN             NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- ── Constraints ──────────────────────────────────────────────────────────
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

-- ── One review per reviewer per booking per role ──────────────────────────────
-- Prevents a reviewer from submitting two reviews for the same booking in the same role.
-- Both parties can still review each other (different reviewer_id values).
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_per_booking_role
    ON reviews (booking_id, reviewer_id, review_role);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- "Reviews for this user" (public profile page — visible reviews only)
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id
    ON reviews (reviewee_id, created_at DESC)
    WHERE is_visible = TRUE;

-- Admin: all reviews for a booking
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id
    ON reviews (booking_id);

-- ── Updated_at Trigger ────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews;
CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();