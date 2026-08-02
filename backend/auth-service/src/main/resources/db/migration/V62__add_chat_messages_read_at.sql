-- V62: Add missing read_at column to chat_messages table to satisfy supporting-service schema validation.

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
