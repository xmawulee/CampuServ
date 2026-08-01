-- V52__create_account_deletion_tracker.sql
CREATE TABLE IF NOT EXISTS account_deletion_trackers (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    user_svc_ack BOOLEAN DEFAULT FALSE,
    request_svc_ack BOOLEAN DEFAULT FALSE,
    job_svc_ack BOOLEAN DEFAULT FALSE,
    payment_svc_ack BOOLEAN DEFAULT FALSE,
    support_svc_ack BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed the dummy 'DELETED' user to satisfy foreign key constraints for anonymized records
INSERT INTO users (id, email, password_hash, full_name, role, is_verified, account_status)
VALUES ('DELETED', 'deleted@campusserv.com', '$2a$10$O.Y4uGv7lJbe5.6j27lJ7.fJ2eM8m9m5E8.e6X15tVvQ3WqK79oJu', 'Deleted User', 'STUDENT', TRUE, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
