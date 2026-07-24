-- Migration: Restore Dual-Role Architecture and Preserve Existing Users
-- 1. Restore the dropped columns so existing dual-role users don't lose capabilities
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_role VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_role VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_role_status VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_role_requested_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_role_acquired_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_role_view VARCHAR(50);

-- 2. Migrate the existing 'role' column back to 'primary_role'
UPDATE users SET primary_role = role;
UPDATE users SET active_role_view = role;

-- 3. We keep 'role' as a NOT NULL field that acts as a denormalized mirror for JWT backwards compatibility, 
-- but the application logic will now respect primary_role and secondary_role again.
