CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_users_fullname_trgm ON users USING gin (lower(full_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_bio_trgm ON users USING gin (lower(bio) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_bio_trgm ON provider_profiles USING gin (lower(bio) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_provider_key_services_tag_trgm ON provider_key_services USING gin (lower(service_tag) gin_trgm_ops);
