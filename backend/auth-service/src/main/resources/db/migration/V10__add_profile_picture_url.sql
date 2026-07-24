-- Add profile_picture_url column to users table.
-- This column is referenced by both auth-service and user-service JPA entities
-- but was missing from the original migration.
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(255);
