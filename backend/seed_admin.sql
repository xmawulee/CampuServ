-- NOTE: This SQL file is for schema documentation and manual environment setup reference only.
-- Dev/Test accounts are seeded dynamically at startup by DataInitializer.java (in local-dev profile).
-- Admin account details (email/password hash) are generated from ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD environment variables.

-- To seed manually, replace placeholders below with actual hashed values:
-- ADMIN_PASS_HASH = Hashed password from ADMIN_SEED_PASSWORD
-- TEST_PROV_PASS_HASH = Hashed password for testprovider
-- TEST_STUD_PASS_HASH = Hashed password for teststudent

BEGIN;

INSERT INTO users (id, email, password_hash, full_name, role, is_verified, verification_status, account_status, is_provider)
VALUES 
  ('usr-admin', 'admin@campusserv.com', 'ADMIN_PASS_HASH_PLACEHOLDER', 'CampusServ Administrator', 'ADMIN', true, 'APPROVED', 'ACTIVE', false),
  ('usr-test-provider', 'testprovider@st.knust.edu.gh', 'TEST_PROV_PASS_HASH_PLACEHOLDER', 'Test Provider', 'STUDENT', true, 'APPROVED', 'ACTIVE', true),
  ('usr-test-student', 'teststudent@st.knust.edu.gh', 'TEST_STUD_PASS_HASH_PLACEHOLDER', 'Test Student', 'STUDENT', true, 'APPROVED', 'ACTIVE', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provider_profiles (id, bio, rating, completed_jobs_count, approval_status)
VALUES 
  ('usr-test-provider', 'Official test provider account for CampusServ. Pre-approved.', 5.00, 0, 'APPROVED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (id, user_id, balance, pending_escrow)
VALUES 
  ('wlt-admin', 'usr-admin', 1000.00, 0.00),
  ('wlt-test-prov', 'usr-test-provider', 500.00, 0.00),
  ('wlt-test-stud', 'usr-test-student', 1000.00, 0.00)
ON CONFLICT (id) DO NOTHING;

COMMIT;
