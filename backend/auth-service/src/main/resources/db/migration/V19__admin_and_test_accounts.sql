ALTER TABLE provider_profiles 
    ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
      CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    ADD COLUMN rejection_reason TEXT,
    ADD COLUMN approved_at TIMESTAMP,
    ADD COLUMN approved_by VARCHAR(50),
    ADD COLUMN is_test_account BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users 
    ADD COLUMN verification_status VARCHAR(20) DEFAULT 'PENDING_REVIEW'
      CHECK (verification_status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    ADD COLUMN rejection_reason TEXT;

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id VARCHAR(50) REFERENCES users(id),
    reported_user_id VARCHAR(50) REFERENCES users(id),
    reported_job_id VARCHAR(50) REFERENCES jobs(id),
    reported_request_id VARCHAR(50),
    category VARCHAR(50),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN',
    admin_note TEXT,
    resolved_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    target_role VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_pushed BOOLEAN DEFAULT FALSE
);

-- Seed test accounts
-- Ensure admin exists and is APPROVED (Admin account is seeded in V7)

INSERT INTO users (id, email, password_hash, full_name, role, is_verified, student_id_photo_url, verification_status)
VALUES
('usr-test-provider', 'testprovider@st.knust.edu.gh', '$2a$10$O.Y4uGv7lJbe5.6j27lJ7.fJ2eM8m9m5E8.e6X15tVvQ3WqK79oJu', 'Test Provider', 'PROVIDER', TRUE, 'https://placeholder.com/test-id.png', 'APPROVED'),
('usr-test-student', 'teststudent@st.knust.edu.gh', '$2a$10$O.Y4uGv7lJbe5.6j27lJ7.fJ2eM8m9m5E8.e6X15tVvQ3WqK79oJu', 'Test Student', 'STUDENT', TRUE, NULL, 'APPROVED');

INSERT INTO provider_profiles (id, bio, rating, completed_jobs_count, approval_status, is_test_account)
VALUES
('usr-test-provider', 'Official test provider account for CampusServ QA. Pre-approved.', 5.00, 0, 'APPROVED', TRUE);

-- Insert into provider_services for test account
INSERT INTO provider_services (id, provider_id, category_id, base_price)
SELECT 'ps-test-' || id, 'usr-test-provider', id, 50.00
FROM service_categories;

INSERT INTO wallets (id, user_id, balance, pending_escrow)
VALUES
('wlt-test-prov', 'usr-test-provider', 500.00, 0.00),
('wlt-test-stud', 'usr-test-student', 1000.00, 0.00);
