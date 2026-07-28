-- V2 Add Listing Feed fields, Key Services, Saved Listings, and Reports

ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0;

CREATE TABLE IF NOT EXISTS provider_key_services (
    provider_id VARCHAR(255) NOT NULL,
    service_tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (provider_id, service_tag)
);

CREATE TABLE IF NOT EXISTS saved_listings (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_student_provider UNIQUE (student_id, provider_id)
);

CREATE TABLE IF NOT EXISTS listing_reports (
    id VARCHAR(36) PRIMARY KEY,
    provider_id VARCHAR(255) NOT NULL,
    reporter_id VARCHAR(255) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
