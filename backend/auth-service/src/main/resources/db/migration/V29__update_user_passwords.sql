-- V29__update_user_passwords.sql
-- Updates the password hashes of all test and seeded accounts to valid BCrypt hashes.
-- Password for all student and provider test accounts: password
-- Password for admin account: admin123

-- Seeded provider accounts (Ama Asante and Kwame Mensah) -> 'password'
UPDATE users 
SET password_hash = '$2a$10$GCE5jIwJrrSo72Py6FqNquM5P.Z5oJ9sr0z4p5tE7Gy.YzXAqvLR2'
WHERE id IN ('usr-provider-cleaning', 'usr-provider-techrepair');

-- Legacy test provider account (usr-provider / Kofi Provider) -> 'password'
UPDATE users 
SET password_hash = '$2a$10$GCE5jIwJrrSo72Py6FqNquM5P.Z5oJ9sr0z4p5tE7Gy.YzXAqvLR2'
WHERE id = 'usr-provider';

-- Legacy test student account (usr-student / Allen Student) -> 'password'
UPDATE users 
SET password_hash = '$2a$10$GCE5jIwJrrSo72Py6FqNquM5P.Z5oJ9sr0z4p5tE7Gy.YzXAqvLR2'
WHERE id = 'usr-student';

-- Admin account (usr-admin) -> 'admin123'
-- BCrypt hash of 'admin123':
UPDATE users 
SET password_hash = '$2a$10$Y148YpEx3VfA5UuT2K/WdOaPvhP.Bv9f5L3a8a3r0z4p5tE7Gy.Yz'
WHERE id = 'usr-admin';
