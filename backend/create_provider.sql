BEGIN;

INSERT INTO users (
  id, email, original_email, password_hash, full_name, role, primary_role, secondary_role, 
  secondary_role_status, active_role_view, is_verified, email_verified, primary_role_verified, 
  verification_status, account_status, is_provider, service_category, created_at, updated_at
) VALUES (
  'usr-provider-active1',
  'provider1@st.knust.edu.gh',
  'provider1@st.knust.edu.gh',
  '$2a$10$YDC7.tJi9wFF.REBnExtu.Sp9kuYC7Fg3L/YOqgdyXvPIJy5ZqVBa',
  'Kwame Mensah (Tech & Repairs)',
  'PROVIDER',
  'PROVIDER',
  'STUDENT',
  'APPROVED',
  'PROVIDER',
  true,
  true,
  true,
  'APPROVED',
  'ACTIVE',
  true,
  'ec22dd30-0f54-4ffd-bdbf-5e78361c07d2',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  original_email = EXCLUDED.original_email,
  password_hash = '$2a$10$YDC7.tJi9wFF.REBnExtu.Sp9kuYC7Fg3L/YOqgdyXvPIJy5ZqVBa',
  is_verified = true,
  email_verified = true,
  primary_role_verified = true,
  verification_status = 'APPROVED',
  account_status = 'ACTIVE';

INSERT INTO provider_profiles (
  id, bio, rating, completed_jobs_count, approval_status, created_at, updated_at
) VALUES (
  'usr-provider-active1',
  'Certified campus tech & laptop repair specialist. 24/7 service at Unity Hall.',
  5.00,
  12,
  'APPROVED',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  approval_status = 'APPROVED';

INSERT INTO provider_wallets (
  user_id, balance, currency, version, created_at, updated_at
) VALUES (
  'usr-provider-active1',
  250.00,
  'GHS',
  0,
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO NOTHING;

COMMIT;
