-- Drop the old chat_messages table to recreate it with the correct schema
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Create chat_threads table
CREATE TABLE IF NOT EXISTS chat_threads (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE UNIQUE,
    client_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'LOCKED'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Recreate chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(50) PRIMARY KEY,
    thread_id VARCHAR(50) NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'TEXT', -- 'TEXT', 'VOICE_NOTE', 'SYSTEM'
    content TEXT,
    media_url VARCHAR(255),
    media_duration_seconds INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT', -- 'SENT', 'DELIVERED', 'READ'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
    id VARCHAR(50) PRIMARY KEY,
    thread_id VARCHAR(50) NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    caller_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callee_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'missed' -- 'completed', 'missed', 'declined'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_threads_request ON chat_threads(request_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_thread ON call_logs(thread_id);
