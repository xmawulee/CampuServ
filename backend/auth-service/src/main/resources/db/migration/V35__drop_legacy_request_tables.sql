-- V35__drop_legacy_request_tables.sql
-- Cleans up legacy/unused tables and their foreign key constraints that conflict with active tables.

ALTER TABLE request_attachments DROP CONSTRAINT IF EXISTS fkjt6fiswjs7jgm8274824yx0i;
DROP TABLE IF EXISTS provider_offers;
DROP TABLE IF EXISTS requests;
