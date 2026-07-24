-- Explicit role hierarchy columns on users
ALTER TABLE users
    ADD COLUMN primary_role VARCHAR(30) NOT NULL DEFAULT 'STUDENT',
    ADD COLUMN secondary_role VARCHAR(30),
    ADD COLUMN secondary_role_status VARCHAR(30), -- PENDING_VERIFICATION, APPROVED, REJECTED, NONE
    ADD COLUMN secondary_role_requested_at TIMESTAMP,
    ADD COLUMN secondary_role_acquired_at TIMESTAMP,
    ADD COLUMN active_role_view VARCHAR(30), -- which role the client UI is currently rendering; defaults to primary_role
    ADD COLUMN primary_role_verified BOOLEAN NOT NULL DEFAULT true;

-- Backfill from existing data:
-- Every existing user's current `role` becomes their primary_role.
UPDATE users SET primary_role = role WHERE role IS NOT NULL;

-- Any user with is_provider = true is mid-flow or already a provider.
-- Map existing verification_status onto the new secondary_role_status.
UPDATE users
SET secondary_role = 'PROVIDER',
    secondary_role_status = verification_status,
    active_role_view = CASE WHEN verification_status IN ('APPROVED','VERIFIED') THEN 'PROVIDER' ELSE primary_role END
WHERE is_provider = true;

-- Set primary_role_verified = false only for accounts where primary_role = 'PROVIDER' and verification_status is not APPROVED/VERIFIED
UPDATE users
SET primary_role_verified = false
WHERE primary_role = 'PROVIDER' AND (verification_status IS NULL OR verification_status NOT IN ('APPROVED','VERIFIED'));

UPDATE users SET active_role_view = primary_role WHERE active_role_view IS NULL;

CREATE INDEX idx_users_secondary_role_status ON users (secondary_role_status);

-- Enforce "one secondary role at a time" at the DB level
ALTER TABLE users
    ADD CONSTRAINT chk_secondary_role_requires_status
    CHECK (secondary_role IS NULL OR secondary_role_status IS NOT NULL);
