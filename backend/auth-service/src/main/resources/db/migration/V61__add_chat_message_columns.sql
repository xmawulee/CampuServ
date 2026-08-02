-- V61: Add missing columns to chat_messages table to satisfy supporting-service schema validation.

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS client_temp_id VARCHAR(255);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url VARCHAR(1024);
