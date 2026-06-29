-- ============================================================
-- Migration 006: Posts Table
-- Depends on: 002_create_users.sql (users.id FK)
-- Referenced by: post_images, bookings, saved_posts, reported_posts
-- ============================================================

-- ── ENUM: post type ───────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE post_type_enum AS ENUM (
        'need_transport',    -- Customer wants to ship goods; needs a vehicle
        'vehicle_available', -- Transporter has a vehicle ready for cargo
        'return_journey'     -- Transporter completed delivery; wants load for return trip
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'post_type_enum already exists, skipping.';
END $$;

-- ── ENUM: post status ─────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE post_status_enum AS ENUM (
        'active',    -- Visible in feed; accepts new booking requests
        'inactive',  -- Hidden by post owner; can be re-activated
        'booked',    -- An accepted booking exists; no new requests allowed
        'completed', -- Booking completed; post lifecycle ended
        'expired',   -- Set by cron job when availability_date has passed
        'deleted'    -- Soft delete; record retained for booking history integrity
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'post_status_enum already exists, skipping.';
END $$;

-- ── Table ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
    id                      UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_type               post_type_enum      NOT NULL,
    status                  post_status_enum    NOT NULL DEFAULT 'active',
    description             TEXT,
    view_count              INTEGER             NOT NULL DEFAULT 0,

    -- ── Origin location ───────────────────────────────────────────────────────
    -- need_transport: pickup location
    -- vehicle_available / return_journey: current vehicle location
    origin_address          TEXT                NOT NULL,
    origin_city             VARCHAR(100),
    origin_state            VARCHAR(100),
    origin_lat              DECIMAL(10, 8)      NOT NULL,
    origin_lng              DECIMAL(11, 8)      NOT NULL,

    -- ── Destination location ──────────────────────────────────────────────────
    -- need_transport: delivery destination
    -- vehicle_available: intended destination (NULL = flexible)
    -- return_journey: return home base
    destination_address     TEXT,
    destination_city        VARCHAR(100),
    destination_state       VARCHAR(100),
    destination_lat         DECIMAL(10, 8),
    destination_lng         DECIMAL(11, 8),

    -- ── Vehicle fields ────────────────────────────────────────────────────────
    -- vehicle_type: required vehicle for need_transport; available vehicle for others
    vehicle_type            VARCHAR(50),
    -- Full capacity of the vehicle (vehicle_available)
    vehicle_capacity_kg     DECIMAL(10, 2),
    -- Remaining capacity after partial load (return_journey)
    remaining_capacity_kg   DECIMAL(10, 2),

    -- ── Goods fields (need_transport only — NULL for other types) ─────────────
    goods_type              VARCHAR(100),
    goods_category          VARCHAR(100),
    goods_weight_kg         DECIMAL(10, 2),
    goods_length_cm         DECIMAL(10, 2),
    goods_width_cm          DECIMAL(10, 2),
    goods_height_cm         DECIMAL(10, 2),
    is_fragile              BOOLEAN             NOT NULL DEFAULT FALSE,

    -- ── Pricing ───────────────────────────────────────────────────────────────
    -- Customer's budget range (need_transport)
    budget_min              DECIMAL(12, 2),
    budget_max              DECIMAL(12, 2),
    -- Transporter's asking price (vehicle_available, return_journey)
    price_expectation       DECIMAL(12, 2),

    -- ── Scheduling ───────────────────────────────────────────────────────────
    availability_date       DATE                NOT NULL,
    -- Soft expiry date — set to NOW() + post_expiry_days on creation
    expires_at              TIMESTAMP WITH TIME ZONE,

    -- ── Timestamps ───────────────────────────────────────────────────────────
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMP WITH TIME ZONE,   -- soft delete

    -- ── Data Integrity Constraints ────────────────────────────────────────────
    CONSTRAINT chk_posts_budget_range CHECK (
        budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max
    ),
    CONSTRAINT chk_posts_origin_lat CHECK (origin_lat BETWEEN -90 AND 90),
    CONSTRAINT chk_posts_origin_lng CHECK (origin_lng BETWEEN -180 AND 180)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- "My posts" page: all posts by a user
CREATE INDEX IF NOT EXISTS idx_posts_user_id
    ON posts (user_id, created_at DESC);

-- Feed: filter by post type
CREATE INDEX IF NOT EXISTS idx_posts_post_type
    ON posts (post_type)
    WHERE deleted_at IS NULL;

-- Feed: filter active posts (most common query)
CREATE INDEX IF NOT EXISTS idx_posts_status
    ON posts (status)
    WHERE deleted_at IS NULL;

-- Feed: filter by vehicle type
CREATE INDEX IF NOT EXISTS idx_posts_vehicle_type
    ON posts (vehicle_type)
    WHERE vehicle_type IS NOT NULL AND deleted_at IS NULL;

-- Feed: filter by goods category
CREATE INDEX IF NOT EXISTS idx_posts_goods_category
    ON posts (goods_category)
    WHERE goods_category IS NOT NULL AND deleted_at IS NULL;

-- Feed: filter by origin city (most common location filter)
CREATE INDEX IF NOT EXISTS idx_posts_origin_city
    ON posts (origin_city)
    WHERE origin_city IS NOT NULL;

-- Feed: filter by destination city
CREATE INDEX IF NOT EXISTS idx_posts_destination_city
    ON posts (destination_city)
    WHERE destination_city IS NOT NULL;

-- Feed: filter by availability date
CREATE INDEX IF NOT EXISTS idx_posts_availability_date
    ON posts (availability_date);

-- Default feed ordering: newest first
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc
    ON posts (created_at DESC)
    WHERE deleted_at IS NULL AND status = 'active';

-- Geo-search: haversine queries filter on origin coords
CREATE INDEX IF NOT EXISTS idx_posts_origin_coords
    ON posts (origin_lat, origin_lng)
    WHERE deleted_at IS NULL;

-- Cron job: find posts where expires_at < NOW() AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_posts_expires_at
    ON posts (expires_at)
    WHERE status = 'active' AND deleted_at IS NULL;

-- Full-text search on description (requires pg_trgm from 001)
CREATE INDEX IF NOT EXISTS idx_posts_description_fts
    ON posts USING GIN (to_tsvector('english', COALESCE(description, '')));

-- Trigram search on city names for ILIKE queries
CREATE INDEX IF NOT EXISTS idx_posts_origin_city_trgm
    ON posts USING GIN (origin_city gin_trgm_ops)
    WHERE origin_city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_destination_city_trgm
    ON posts USING GIN (destination_city gin_trgm_ops)
    WHERE destination_city IS NOT NULL;

-- ── Updated_at Trigger ────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();