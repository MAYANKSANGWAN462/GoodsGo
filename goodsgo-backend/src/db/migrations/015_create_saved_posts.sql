-- ============================================================
-- Migration 015: Saved Posts Table
-- Depends on: 002_create_users.sql (users.id FK)
--             006_create_posts.sql (posts.id FK)
-- Used by: posts.service.js — toggle save/unsave, list saved posts
-- ============================================================
-- Toggle pattern: INSERT on save → unique constraint returns 409 if already saved
-- posts.service.js handles both cases as a toggle (save = insert, unsave = delete)
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_posts (
    id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id     UUID    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── One save per user per post ────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_posts_unique_user_post
    ON saved_posts (user_id, post_id);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- "My saved posts" page (most recently saved first)
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id
    ON saved_posts (user_id, created_at DESC);

-- Check if a specific post is saved by the current user (feed card heart indicator)
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id
    ON saved_posts (post_id);