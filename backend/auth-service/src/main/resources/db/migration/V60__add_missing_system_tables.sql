-- V60: Create missing tables for JPA entities across microservices.
-- This resolves SchemaManagementExceptions during strict ddl-auto validation on startup.

CREATE TABLE IF NOT EXISTS saved_listings (
    id VARCHAR(255) PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_provider_listing UNIQUE (student_id, provider_id)
);

CREATE TABLE IF NOT EXISTS provider_category_ratings (
    id VARCHAR(255) PRIMARY KEY,
    provider_id VARCHAR(255) NOT NULL,
    category_id VARCHAR(255) NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    CONSTRAINT uq_provider_category_rating UNIQUE (provider_id, category_id)
);

CREATE TABLE IF NOT EXISTS listing_reports (
    id VARCHAR(255) PRIMARY KEY,
    provider_id VARCHAR(255) NOT NULL,
    reporter_id VARCHAR(255) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payout_methods (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    account_number VARCHAR(255) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
