-- ============================================================
-- Migration 020: Admin Audit Logs Table
-- Depends on: 017_create_admin_users.sql (admin_users.id FK — admin_id)
-- Referenced by: adminAuth.middleware.logAdminAction()
--               (fires post-response on every successful admin mutation)
-- ============================================================

-- Audit logs are append-only records — there is no updated_at column or trigger.
-- Rows are never modified or deleted once inserted.

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Which admin performed the action.
    -- SET NULL: preserve audit trail even if the admin account is removed,
    -- so historical actions remain traceable (admin_id becomes NULL after removal).
    admin_id    UUID REFERENCES admin_users(id) ON DELETE SET NULL,

    -- Human-readable action name, e.g. 'suspend_user', 'resolve_dispute'.
    action_type VARCHAR(100) NOT NULL,

    -- Entity type the action targeted, e.g. 'user', 'post', 'booking'.
    target_type VARCHAR(100),

    -- Primary key of the targeted entity (NULL for actions with no specific target,
    -- such as listing queries or settings reads, or for param names not yet in the
    -- logAdminAction extractor — see adminAuth.middleware.js logAdminAction()).
    target_id   UUID,

    -- Source IP of the admin request, for security forensics.
    ip_address  INET,

    -- Arbitrary JSON payload for additional context (future use).
    metadata    JSONB,

    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
-- Composite: "what did admin X do, in time order" — primary audit query pattern
CREATE INDEX IF NOT EXISTS idx_audit_admin_id_created_at
    ON admin_audit_logs (admin_id, created_at DESC);

-- target_id: "who touched entity Y" — secondary query pattern for forensics
CREATE INDEX IF NOT EXISTS idx_audit_target_id
    ON admin_audit_logs (target_id)
    WHERE target_id IS NOT NULL;
