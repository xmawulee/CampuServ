-- V25__add_email_verification.sql

-- 1. Alter users table default for account_status
ALTER TABLE users ALTER COLUMN account_status SET DEFAULT 'PENDING_VERIFICATION';

-- 2. Create email_verification_tokens table
CREATE TABLE email_verification_tokens (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_evt_token_hash ON email_verification_tokens(token_hash);
