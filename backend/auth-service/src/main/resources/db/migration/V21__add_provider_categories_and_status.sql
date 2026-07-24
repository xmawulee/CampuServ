-- Add icon_key, active, created_at to service_categories
ALTER TABLE service_categories
ADD COLUMN IF NOT EXISTS icon_key VARCHAR(50),
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Seed service categories
INSERT INTO service_categories (id, name, description, icon_key, active) VALUES
(gen_random_uuid()::varchar, 'Laundry', 'Washing, drying, and ironing services', 'shirt', TRUE),
(gen_random_uuid()::varchar, 'Tutoring', 'Academic help and coaching', 'book-open', TRUE),
(gen_random_uuid()::varchar, 'Errands', 'Running campus errands', 'shopping-bag', TRUE),
(gen_random_uuid()::varchar, 'Tech Repair', 'Laptop and phone repairs', 'wrench', TRUE),
(gen_random_uuid()::varchar, 'Room Cleaning', 'Dorm and hostel cleaning', 'sparkles', TRUE),
(gen_random_uuid()::varchar, 'Printing', 'Document printing and delivery', 'printer', TRUE),
(gen_random_uuid()::varchar, 'Delivery', 'Food and package delivery', 'truck', TRUE),
(gen_random_uuid()::varchar, 'Hair & Beauty', 'Barbering and styling', 'scissors', TRUE),
(gen_random_uuid()::varchar, 'Event Setup', 'Helping set up campus events', 'calendar', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Update users table verification_status
-- Drop constraint if it exists from older schema
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_verification_status_check;

-- Default to PENDING_VERIFICATION for new users
ALTER TABLE users ALTER COLUMN verification_status SET DEFAULT 'PENDING_VERIFICATION';

-- Update existing statuses to the new enum values
UPDATE users SET verification_status = 'PENDING_VERIFICATION' WHERE verification_status = 'PENDING_REVIEW';
UPDATE users SET verification_status = 'VERIFIED' WHERE verification_status = 'APPROVED';

-- Update provider_profiles approval_status similarly
ALTER TABLE provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_approval_status_check;
ALTER TABLE provider_profiles ALTER COLUMN approval_status SET DEFAULT 'PENDING_VERIFICATION';
UPDATE provider_profiles SET approval_status = 'PENDING_VERIFICATION' WHERE approval_status = 'PENDING';
UPDATE provider_profiles SET approval_status = 'VERIFIED' WHERE approval_status = 'APPROVED';

-- Create provider_categories join table
CREATE TABLE provider_categories (
    provider_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR(50) NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'VERIFIED', -- 'PENDING', 'VERIFIED', 'REJECTED'
    PRIMARY KEY (provider_id, category_id)
);
