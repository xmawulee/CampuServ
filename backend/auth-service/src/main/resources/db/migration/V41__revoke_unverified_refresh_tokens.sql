-- V41__revoke_unverified_refresh_tokens.sql
-- Revoke all refresh tokens for unverified users.

UPDATE refresh_tokens
SET revoked_at = CURRENT_TIMESTAMP
WHERE user_id IN (SELECT id FROM users WHERE is_verified = false);
