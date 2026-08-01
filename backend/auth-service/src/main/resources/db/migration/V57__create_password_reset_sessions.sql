-- V57__create_password_reset_sessions.sql
-- Table for short-lived, hashed password reset session authorization tokens

CREATE TABLE IF NOT EXISTS password_reset_sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_session_token_hash ON password_reset_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_session_user_id ON password_reset_sessions(user_id);
