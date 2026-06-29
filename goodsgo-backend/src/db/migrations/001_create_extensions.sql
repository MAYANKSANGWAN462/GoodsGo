-- ============================================================
-- Migration 001: Extensions, Shared Functions, and Reference Tables
-- Depends on: nothing — this is the root migration
-- Provides:   uuid_generate_v4(), update_updated_at_column(),
--             vehicle_types table, goods_categories table
-- ============================================================


-- ── Extensions ────────────────────────────────────────────────────────────────

-- uuid-ossp: provides uuid_generate_v4() used as PRIMARY KEY DEFAULT in all tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm: enables GIN trigram indexes for ILIKE queries on city names and
--          full-text search on post descriptions without a dedicated search engine
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ── Shared Trigger Function ───────────────────────────────────────────────────
-- Applied to every table that has an updated_at column.
-- Defined once here and reused via CREATE TRIGGER across all relevant tables.
-- Using CREATE OR REPLACE means this is fully idempotent.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── Vehicle Types Reference Table ─────────────────────────────────────────────
-- No FK dependencies — placed here as it has no ordering constraints.
-- Populated by: seeds/seed_vehicle_types.js
-- Read by:      GET /api/v1/config/options (frontend dropdown data)
-- posts.vehicle_type stores the `name` value; validated at app level via Joi

CREATE TABLE IF NOT EXISTS vehicle_types (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(50)  NOT NULL UNIQUE,   -- code value (stored in posts)
    label           VARCHAR(100) NOT NULL,           -- display label for UI
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    display_order   SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_types_active
    ON vehicle_types (is_active, display_order ASC);


-- ── Goods Categories Reference Table ─────────────────────────────────────────
-- Same pattern as vehicle_types.
-- Populated by: seeds/seed_goods_categories.js
-- Read by:      GET /api/v1/config/options

CREATE TABLE IF NOT EXISTS goods_categories (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL UNIQUE,   -- code value (stored in posts)
    label           VARCHAR(150) NOT NULL,           -- display label for UI
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    display_order   SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goods_categories_active
    ON goods_categories (is_active, display_order ASC);