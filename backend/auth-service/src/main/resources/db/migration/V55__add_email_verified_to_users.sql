-- V55__add_email_verified_to_users.sql
-- Add email_verified column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Mark existing active or verified users as email verified so they are not gated
UPDATE users 
SET email_verified = TRUE 
WHERE is_verified = TRUE OR account_status = 'ACTIVE';

-- Create email_verification_codes table
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evc_user ON email_verification_codes(user_id);
