-- Add matching engine columns to service_requests table
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS bid_window_closes TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS escrow_held BOOLEAN DEFAULT FALSE;

-- Seed default values for existing requests
UPDATE service_requests SET bid_window_closes = deadline - INTERVAL '30 minutes' WHERE bid_window_closes IS NULL;
UPDATE service_requests SET escrow_held = TRUE WHERE status = 'ASSIGNED' OR status = 'COMPLETED';
