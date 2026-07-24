ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS budget_min DECIMAL(10, 2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS budget_max DECIMAL(10, 2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS timing_type VARCHAR(50);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS location_type VARCHAR(50);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS location_detail VARCHAR(255);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(50);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS target_provider_id VARCHAR(50);
