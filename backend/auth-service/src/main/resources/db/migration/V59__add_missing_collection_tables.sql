-- V59: Create missing collection tables for JPA @ElementCollections.
-- This prevents SchemaManagementExceptions across all services during ddl-auto validation.

CREATE TABLE IF NOT EXISTS offer_attachments (
    offer_id VARCHAR(255) NOT NULL,
    url VARCHAR(1024) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_portfolio (
    user_id VARCHAR(255) NOT NULL,
    portfolio_url VARCHAR(1024) NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_key_services (
    provider_id VARCHAR(255) NOT NULL,
    service_tag VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS review_tags (
    review_id VARCHAR(255) NOT NULL,
    tag VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS job_attachments (
    job_id VARCHAR(255) NOT NULL,
    url VARCHAR(1024) NOT NULL
);
