-- V66: Comprehensive fix for all remaining schema mismatches across microservices.
-- Aligns production DB with supporting-service and other service entity definitions.

-- ── reviews table ─────────────────────────────────────────────────────────────
-- Add direction column (required NOT NULL in entity, but old rows exist with no value)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS direction VARCHAR(50);
-- Backfill existing rows so NOT NULL constraint can be satisfied later
UPDATE reviews SET direction = 'REQUESTER_TO_PROVIDER' WHERE direction IS NULL;

-- Add category_id column
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS category_id VARCHAR(255);

-- Add is_auto_generated column
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE;

-- Add unique constraint on (job_id, direction) if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'reviews' AND constraint_name = 'reviews_job_id_direction_key'
    ) THEN
        ALTER TABLE reviews ADD CONSTRAINT reviews_job_id_direction_key UNIQUE (job_id, direction);
    END IF;
END $$;

-- Create review_tags table (used by @ElementCollection on Review.tags)
CREATE TABLE IF NOT EXISTS review_tags (
    review_id VARCHAR(255) NOT NULL,
    tag VARCHAR(255),
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
);

-- ── notifications table ───────────────────────────────────────────────────────
-- Add notification_type column (mapped as 'type' in Notification entity)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(100);
-- Add reference_id column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255);

-- ── admin_notifications table ─────────────────────────────────────────────────
-- Entity uses 'timestamp' column; DB has 'created_at'. Add timestamp column.
ALTER TABLE admin_notifications ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- Backfill timestamp from created_at if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_notifications' AND column_name = 'created_at'
    ) THEN
        UPDATE admin_notifications SET timestamp = created_at WHERE timestamp IS NULL;
    END IF;
END $$;

-- ── chat_messages table ───────────────────────────────────────────────────────
-- Add image_url column
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
-- Add read_at column
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
-- Add media_url column (legacy read-only in entity)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS media_url VARCHAR(500);
-- Add media_duration_seconds column (legacy read-only in entity)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS media_duration_seconds INT;
-- Add client_temp_id column (legacy read-only in entity)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS client_temp_id VARCHAR(255);

-- ── chat_threads table ────────────────────────────────────────────────────────
-- Add status column (legacy read-only in entity)
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS status VARCHAR(50);
