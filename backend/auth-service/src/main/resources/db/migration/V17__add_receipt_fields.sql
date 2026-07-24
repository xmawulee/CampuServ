-- V17__add_receipt_fields.sql
ALTER TABLE transactions ADD COLUMN payer_name VARCHAR(100);
ALTER TABLE transactions ADD COLUMN payer_student_id VARCHAR(20);
ALTER TABLE transactions ADD COLUMN payer_email VARCHAR(100);
ALTER TABLE transactions ADD COLUMN provider_name VARCHAR(100);
ALTER TABLE transactions ADD COLUMN provider_student_id VARCHAR(20);
ALTER TABLE transactions ADD COLUMN service_title VARCHAR(255);
ALTER TABLE transactions ADD COLUMN service_category VARCHAR(100);
ALTER TABLE transactions ADD COLUMN service_description TEXT;
ALTER TABLE transactions ADD COLUMN agreed_bid_amount DECIMAL(10,2);
ALTER TABLE transactions ADD COLUMN platform_commission DECIMAL(10,2);
ALTER TABLE transactions ADD COLUMN provider_payout DECIMAL(10,2);
ALTER TABLE transactions ADD COLUMN payment_method VARCHAR(50);
ALTER TABLE transactions ADD COLUMN payment_channel VARCHAR(50);
ALTER TABLE transactions ADD COLUMN escrow_status VARCHAR(30) DEFAULT 'IN_ESCROW';
ALTER TABLE transactions ADD COLUMN confirmed_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN escrow_released_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN campus_zone VARCHAR(100);

-- Fix pre-seeded user password hashes to match the plaintext password 'password'
UPDATE users SET password_hash = '$2a$10$6AZxV6EBeQHQBd2bQLa3c.xau5wQYjLRmvt9QPF1G2o2gjLXoFR32' WHERE id IN ('usr-admin', 'usr-student', 'usr-provider');
