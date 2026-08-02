-- V58: Create missing database tables required by the supporting-service entities.
-- Since supporting-service has Flyway disabled (managed by the main migration sequence),
-- this migration is defined here in auth-service so that it is executed during initial startup.

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(255) NOT NULL,
    target_entity VARCHAR(255) NOT NULL,
    target_id VARCHAR(255),
    reason VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS call_logs (
    id VARCHAR(255) PRIMARY KEY,
    thread_id VARCHAR(255) NOT NULL,
    caller_id VARCHAR(255) NOT NULL,
    callee_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INT,
    status VARCHAR(50) NOT NULL DEFAULT 'missed'
);

CREATE TABLE IF NOT EXISTS dispute_evidence (
    id VARCHAR(255) PRIMARY KEY,
    dispute_id VARCHAR(255) NOT NULL,
    uploaded_by_user_id VARCHAR(255) NOT NULL,
    file_url TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_announcements (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'INFO',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
