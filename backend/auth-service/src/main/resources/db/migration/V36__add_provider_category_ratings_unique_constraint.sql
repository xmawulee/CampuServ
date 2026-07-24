-- V36__add_provider_category_ratings_unique_constraint.sql
-- Adds a unique constraint on (provider_id, category_id) to support ON CONFLICT upserts.

ALTER TABLE provider_category_ratings ADD CONSTRAINT uq_provider_category_rating UNIQUE (provider_id, category_id);
