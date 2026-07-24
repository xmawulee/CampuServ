CREATE TABLE chat_messages (
    id VARCHAR(50) PRIMARY KEY,
    sender_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id VARCHAR(50) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    content TEXT,
    file_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disputes (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    raised_by_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RAISED', -- 'RAISED', 'EVIDENCE', 'UNDER_REVIEW', 'RESOLVED'
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chats_job ON chat_messages(job_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_disputes_job ON disputes(job_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- --- SEED DATA ---
-- 1. Service Categories
INSERT INTO service_categories (id, name, description) VALUES
('cat-1', 'Laundry', 'Washing, folding, and ironing of clothes and bedding'),
('cat-2', 'Cleaning', 'Room cleaning, hostel room tidying, and washroom sanitation'),
('cat-3', 'Tutoring', 'Academic help, coding mentoring, and exam preparation assistance'),
('cat-4', 'Errands', 'Food pickup, grocery shopping, and parcel delivery within campus'),
('cat-5', 'Design & Print', 'Graphic designs, slides prep, and printing/binding errands'),
('cat-6', 'Tech Repairs', 'Software installation, laptop servicing, and mobile phone screen repairs'),
('cat-7', 'Styling & Grooming', 'Hair braiding, dreadlock maintenance, and professional barbering');

-- 2. Test Users (Passwords are pre-hashed using BCrypt for 'password')
INSERT INTO users (id, email, password_hash, full_name, role, is_verified) VALUES
('usr-admin', 'admin@campusserv.com', '$2a$10$O.Y4uGv7lJbe5.6j27lJ7.fJ2eM8m9m5E8.e6X15tVvQ3WqK79oJu', 'CampusServ Administrator', 'ADMIN', TRUE),
('usr-student', 'allen.student@st.knust.edu.gh', '$2a$10$O.Y4uGv7lJbe5.6j27lJ7.fJ2eM8m9m5E8.e6X15tVvQ3WqK79oJu', 'Allen Student', 'STUDENT', TRUE),
('usr-provider', 'kofi.provider@st.knust.edu.gh', '$2a$10$O.Y4uGv7lJbe5.6j27lJ7.fJ2eM8m9m5E8.e6X15tVvQ3WqK79oJu', 'Kofi Provider', 'PROVIDER', TRUE);

-- 3. Seed Provider Profiles & Wallets
INSERT INTO provider_profiles (id, bio, rating, completed_jobs_count) VALUES
('usr-provider', 'Professional laptop repairs and hair cutting service.', 5.0, 2);

INSERT INTO wallets (id, user_id, balance, pending_escrow) VALUES
('wlt-student', 'usr-student', 0.00, 0.00),
('wlt-provider', 'usr-provider', 15.00, 0.00),
('wlt-admin', 'usr-admin', 0.00, 0.00);
