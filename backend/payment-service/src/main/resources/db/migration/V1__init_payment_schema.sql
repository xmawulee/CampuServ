-- Payment Service Initial Flyway Baseline Schema

CREATE TABLE IF NOT EXISTS student_wallets (
    user_id VARCHAR(255) PRIMARY KEY,
    balance DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    held_balance DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'GHS',
    version BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS provider_wallets (
    user_id VARCHAR(255) PRIMARY KEY,
    balance DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'GHS',
    version BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS student_wallet_transactions (
    id VARCHAR(255) PRIMARY KEY,
    wallet_txn_id VARCHAR(255) UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    amount DECIMAL(19, 2) NOT NULL,
    balance_before DECIMAL(19, 2),
    balance_after DECIMAL(19, 2),
    reference_id VARCHAR(255),
    related_job_id VARCHAR(255),
    narration TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_wallet_transactions (
    id VARCHAR(255) PRIMARY KEY,
    wallet_txn_id VARCHAR(255) UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    amount DECIMAL(19, 2) NOT NULL,
    balance_before DECIMAL(19, 2),
    balance_after DECIMAL(19, 2),
    reference_id VARCHAR(255),
    related_job_id VARCHAR(255),
    narration TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255),
    amount DECIMAL(19, 2) NOT NULL,
    paystack_reference VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    escrow_status VARCHAR(50),
    platform_commission DECIMAL(19, 2) DEFAULT 0.00,
    provider_payout DECIMAL(19, 2) DEFAULT 0.00,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payout_methods (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_name VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
