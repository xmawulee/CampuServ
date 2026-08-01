-- V54__add_provider_notification_preference.sql
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS notify_new_requests BOOLEAN DEFAULT TRUE;
