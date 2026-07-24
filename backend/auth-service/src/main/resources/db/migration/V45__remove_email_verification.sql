-- Migration: Complete Removal of Email Verification
DROP TABLE IF EXISTS email_verification_tokens;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;

-- Backfill existing database rows to ensure no legacy accounts remain unverified
UPDATE users 
SET is_verified = TRUE 
WHERE role != 'PROVIDER' OR primary_role_verified = TRUE;
