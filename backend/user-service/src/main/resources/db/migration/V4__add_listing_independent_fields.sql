-- V4: Add per-listing independent fields so each provider service listing
--     stores its own title, description, key services and portfolio photos
--     independent of the provider's shared profile data.
ALTER TABLE provider_services
    ADD COLUMN IF NOT EXISTS title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS listing_key_services TEXT,
    ADD COLUMN IF NOT EXISTS listing_portfolio TEXT;
