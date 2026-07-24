-- V42__add_email_verified_to_users.sql
-- Add email_verified column to track email verification status independently of legacy is_verified logic.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Mark all existing active/verified users as email verified
UPDATE users SET email_verified = TRUE WHERE is_verified = TRUE OR account_status = 'ACTIVE';
