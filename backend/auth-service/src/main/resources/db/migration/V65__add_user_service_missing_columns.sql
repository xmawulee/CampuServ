-- V65: Add missing columns and tables required by user-service schema validation.
-- user-service/V2, V3, V4 are managed locally but never applied to the shared production DB.

-- Add view_count to provider_profiles (user-service V2)
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0;

-- Create provider_key_services table (user-service V2)
CREATE TABLE IF NOT EXISTS provider_key_services (
    provider_id VARCHAR(255) NOT NULL,
    service_tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (provider_id, service_tag)
);

-- Add per-listing independent fields to provider_services (user-service V4)
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS listing_key_services TEXT;
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS listing_portfolio TEXT;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_users_fullname_trgm ON users USING gin (lower(full_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_bio_trgm ON provider_profiles USING gin (lower(bio) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_provider_key_services_tag_trgm ON provider_key_services USING gin (lower(service_tag) gin_trgm_ops);

