-- Migration to add agreed_price column to service_requests table
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS agreed_price DECIMAL(19, 2);
