CREATE TABLE provider_terms_acceptance (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_accepted_at TIMESTAMP NOT NULL,
    terms_version VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50),
    CONSTRAINT unique_user_terms UNIQUE (user_id, terms_version)
);

ALTER TABLE users ADD COLUMN terms_accepted_version VARCHAR(100);

-- Backfill terms_accepted_version for existing pending or active providers so they pass the check constraint
UPDATE users 
SET terms_accepted_version = 'v1' 
WHERE primary_role = 'PROVIDER' AND (account_status = 'PENDING_VERIFICATION' OR account_status = 'ACTIVE');

-- Enforce at the DB level that any provider in pending verification status must have accepted the terms
ALTER TABLE users ADD CONSTRAINT chk_pending_verification_terms
CHECK (
    (primary_role = 'PROVIDER' AND account_status = 'PENDING_VERIFICATION' AND terms_accepted_version IS NOT NULL)
    OR
    (NOT (primary_role = 'PROVIDER' AND account_status = 'PENDING_VERIFICATION'))
);
