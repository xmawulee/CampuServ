-- V31__drop_target_provider_id.sql
-- Drops the unused target_provider_id column from the service_requests table.
-- As targeted requests are now removed, every request is broadcast-only.

ALTER TABLE service_requests DROP COLUMN IF EXISTS target_provider_id;
