-- V27__split_wallets.sql
-- Split single legacy wallet table into separate Student and Provider wallets

-- Rename legacy tables to avoid schema conflicts while keeping migration paths valid
ALTER TABLE IF EXISTS wallets RENAME TO legacy_wallets;
ALTER TABLE IF EXISTS wallet_transactions RENAME TO legacy_wallet_transactions;

-- 1. student_wallets table
CREATE TABLE student_wallets (
    user_id       VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance       DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    held_balance  DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (held_balance >= 0.00),
    currency      VARCHAR(5) NOT NULL DEFAULT 'GHS',
    version       BIGINT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. provider_wallets table
CREATE TABLE provider_wallets (
    user_id       VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance       DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    currency      VARCHAR(5) NOT NULL DEFAULT 'GHS',
    version       BIGINT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. student_wallet_transactions ledger (append-only)
CREATE TABLE student_wallet_transactions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_txn_id        VARCHAR(30) NOT NULL UNIQUE,  -- SWTXN-XXXX
    user_id              VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                 VARCHAR(30) NOT NULL CHECK (type IN ('DEPOSIT', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'ESCROW_REFUND')),
    status               VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'PROCESSING')),
    amount               DECIMAL(12,2) NOT NULL,
    balance_before       DECIMAL(12,2) NOT NULL,
    balance_after        DECIMAL(12,2) NOT NULL,
    currency             VARCHAR(5) NOT NULL DEFAULT 'GHS',
    reference_id         VARCHAR(100) UNIQUE, -- Idempotency key / Paystack ref
    related_job_id       VARCHAR(50),
    narration            VARCHAR(255),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. provider_wallet_transactions ledger (append-only)
CREATE TABLE provider_wallet_transactions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_txn_id        VARCHAR(30) NOT NULL UNIQUE,  -- PWTXN-XXXX
    user_id              VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                 VARCHAR(30) NOT NULL CHECK (type IN ('JOB_PAYOUT', 'WITHDRAWAL', 'COMMISSION_DEDUCTED')),
    status               VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'PROCESSING')),
    amount               DECIMAL(12,2) NOT NULL,
    balance_before       DECIMAL(12,2) NOT NULL,
    balance_after        DECIMAL(12,2) NOT NULL,
    currency             VARCHAR(5) NOT NULL DEFAULT 'GHS',
    reference_id         VARCHAR(100) UNIQUE, -- Idempotency key / Paystack ref
    related_job_id       VARCHAR(50),
    narration            VARCHAR(255),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indices
CREATE INDEX idx_student_txns_user ON student_wallet_transactions(user_id);
CREATE INDEX idx_student_txns_ref ON student_wallet_transactions(reference_id);
CREATE INDEX idx_provider_txns_user ON provider_wallet_transactions(user_id);
CREATE INDEX idx_provider_txns_ref ON provider_wallet_transactions(reference_id);

-- Backfill from legacy wallets
-- Legacy wallet balances top-up the student wallet by default
INSERT INTO student_wallets (user_id, balance, held_balance, currency, version, created_at, updated_at)
SELECT user_id, balance, pending_escrow, 'GHS', 0, created_at, updated_at
FROM legacy_wallets;

-- For users who are approved providers, also seed their provider wallet (initially 0.00 GHS)
INSERT INTO provider_wallets (user_id, balance, currency, version, created_at, updated_at)
SELECT id, 0.00, 'GHS', 0, NOW(), NOW()
FROM users
WHERE primary_role = 'PROVIDER' OR (secondary_role = 'PROVIDER' AND secondary_role_status = 'APPROVED');
