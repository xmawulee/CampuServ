-- V63: Add missing columns to chat_threads and chat_messages to satisfy supporting-service schema validation.

-- Add columns to chat_threads
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS student_id VARCHAR(255);
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Recreate unique constraint for student-provider pair on chat_threads
ALTER TABLE chat_threads DROP CONSTRAINT IF EXISTS uq_student_provider;
ALTER TABLE chat_threads ADD CONSTRAINT uq_student_provider UNIQUE (student_id, provider_id);

-- Add column to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
