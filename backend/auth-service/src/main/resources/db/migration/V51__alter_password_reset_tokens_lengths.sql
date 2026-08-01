-- V51__alter_password_reset_tokens_lengths.sql
-- Alter columns id and user_id to match users table id column length (VARCHAR(50))

ALTER TABLE password_reset_tokens ALTER COLUMN id TYPE VARCHAR(50);
ALTER TABLE password_reset_tokens ALTER COLUMN user_id TYPE VARCHAR(50);
