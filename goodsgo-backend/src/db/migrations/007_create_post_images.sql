-- ============================================================
-- Migration 007: Post Images Table
-- Depends on: 006_create_posts.sql (posts.id FK)
-- Used by: posts.service.js — create post, edit post, delete post images
-- ============================================================

CREATE TABLE IF NOT EXISTS post_images (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id                 UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    -- Cloudinary secure_url — the CDN URL used to display the image
    image_url               TEXT        NOT NULL,

    -- Cloudinary public_id — required to call cloudinary.uploader.destroy() on delete
    -- Without this, deleted posts would leave orphaned images in Cloudinary
    cloudinary_public_id    VARCHAR(255),

    -- 0 = primary / hero image shown in feed card
    display_order           SMALLINT    NOT NULL DEFAULT 0,

    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Primary access: fetch all images for a post in display order
-- Used in feed JOIN query and post detail page
CREATE INDEX IF NOT EXISTS idx_post_images_post_id
    ON post_images (post_id, display_order ASC);