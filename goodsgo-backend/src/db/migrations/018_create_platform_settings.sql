-- ============================================================
-- Migration 018: Platform Settings Table
-- Depends on: 017_create_admin_users.sql (admin_users.id FK)
-- Used by: admin.service.js (read/update), posts.service.js, bookings.service.js
-- ============================================================
-- Key-value store for runtime-configurable platform behaviour.
-- Changes take effect immediately without code deploy or server restart.
-- Seeds are inserted by: seeds/seed_platform_settings.js (Block E)
--
-- value_type tells service layer how to parse the stored string:
--   'string'  → use value as-is
--   'number'  → parseFloat(value)
--   'boolean' → value === 'true'
--   'json'    → JSON.parse(value)
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_settings (
    key         VARCHAR(100)    PRIMARY KEY,
    value       TEXT            NOT NULL,
    value_type  VARCHAR(20)     NOT NULL DEFAULT 'string',
    description TEXT,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Nullable: NULL means default/system value, not set by an admin yet
    updated_by  UUID REFERENCES admin_users(id) ON DELETE SET NULL
);