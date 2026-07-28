-- V2: Drop legacy request-bound chat tables and recreate them as student-provider pair threads.
-- The old tables used request_id as the primary scope; new design uses (student_id, provider_id) pairs.

DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_threads;

-- New chat_threads: one persistent thread per (student, provider) pair
CREATE TABLE chat_threads (
    id            VARCHAR(255) PRIMARY KEY,
    student_id    VARCHAR(255) NOT NULL,
    provider_id   VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_provider UNIQUE (student_id, provider_id)
);

-- New chat_messages: text or image messages within a thread
CREATE TABLE chat_messages (
    id          VARCHAR(255) PRIMARY KEY,
    thread_id   VARCHAR(255) NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender_id   VARCHAR(255) NOT NULL,
    content     TEXT,
    image_url   VARCHAR(1024),
    sent_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at     TIMESTAMP
);

CREATE INDEX idx_chat_messages_thread_sent ON chat_messages(thread_id, sent_at DESC);
CREATE INDEX idx_chat_threads_student ON chat_threads(student_id);
CREATE INDEX idx_chat_threads_provider ON chat_threads(provider_id);
