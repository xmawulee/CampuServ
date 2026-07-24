-- Migration: Enforce Single-Role-Per-Account
-- Backfill Decision: Accounts with approved secondary role or primary_role 'PROVIDER' are consolidated to 'PROVIDER'.
-- All other accounts are set to 'STUDENT' or 'ADMIN'.

UPDATE users 
SET role = CASE 
    WHEN primary_role = 'ADMIN' OR role = 'ADMIN' THEN 'ADMIN'
    WHEN secondary_role_status = 'APPROVED' OR primary_role = 'PROVIDER' THEN 'PROVIDER'
    ELSE 'STUDENT'
END;

ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'STUDENT';

-- Drop legacy multi-role columns
ALTER TABLE users DROP COLUMN IF EXISTS primary_role;
ALTER TABLE users DROP COLUMN IF EXISTS secondary_role;
ALTER TABLE users DROP COLUMN IF EXISTS secondary_role_status;
ALTER TABLE users DROP COLUMN IF EXISTS secondary_role_requested_at;
ALTER TABLE users DROP COLUMN IF EXISTS secondary_role_acquired_at;
ALTER TABLE users DROP COLUMN IF EXISTS active_role_view;
