-- V4__create_wallet_transactions.sql
-- (Passive copy for payment-service)
DROP TABLE IF EXISTS wallet_transactions CASCADE;

CREATE TABLE wallet_transactions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_txn_id        VARCHAR(30)    NOT NULL UNIQUE,  -- WTXN-88-2026-XXXXX
    paystack_reference   VARCHAR(100),
    user_id              VARCHAR(50)    NOT NULL,

    -- Owner snapshot (denormalized for receipt integrity)
    owner_name           VARCHAR(100)   NOT NULL,
    owner_student_id     VARCHAR(20)    NOT NULL,
    owner_email          VARCHAR(150)   NOT NULL,

    -- Transaction classification
    type                 VARCHAR(20)    NOT NULL CHECK (type IN ('DEPOSIT','WITHDRAWAL')),
    status               VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','SUCCESS','FAILED','PROCESSING')),

    -- Financials
    amount               DECIMAL(12,2)  NOT NULL,
    fees_charged         DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    net_amount           DECIMAL(12,2)  NOT NULL,
    balance_before       DECIMAL(12,2)  NOT NULL,
    balance_after        DECIMAL(12,2)  NOT NULL,
    currency             VARCHAR(5)     NOT NULL DEFAULT 'GHS',

    -- Payment channel
    payment_method       VARCHAR(50)    NOT NULL,
    mobile_number        VARCHAR(20),   -- stored masked
    bank_name            VARCHAR(100),
    account_number_masked VARCHAR(20),

    -- Metadata
    narration            VARCHAR(255),
    failure_reason       VARCHAR(500),
    ip_address           VARCHAR(50),

    -- Timestamps
    initiated_at         TIMESTAMP      NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMP,
    failed_at            TIMESTAMP,

    -- Audit
    created_at           TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- Indexes for fast wallet history queries
CREATE INDEX idx_wallet_txns_user_id    ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_txns_status     ON wallet_transactions(status);
CREATE INDEX idx_wallet_txns_type       ON wallet_transactions(type);
CREATE INDEX idx_wallet_txns_initiated  ON wallet_transactions(initiated_at DESC);
