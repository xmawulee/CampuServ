-- V40__add_original_email_to_users.sql
-- Add original_email column to users to support soft-delete email release.

ALTER TABLE users ADD COLUMN IF NOT EXISTS original_email VARCHAR(255);
