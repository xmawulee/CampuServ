-- V32__add_notification_type_and_reference.sql
-- Add notification_type and reference_id columns to notifications table.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id VARCHAR(50);
