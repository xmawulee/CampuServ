-- V53__add_dual_location_support.sql

-- 1. Add requires_dual_location flag to service_categories table
ALTER TABLE service_categories ADD COLUMN requires_dual_location BOOLEAN DEFAULT FALSE;

-- 2. Seed/Update the existing 'Delivery' category to have requires_dual_location = TRUE
UPDATE service_categories SET requires_dual_location = TRUE WHERE name = 'Delivery';

-- 3. Add pickup location columns to service_requests table
ALTER TABLE service_requests ADD COLUMN pickup_address VARCHAR(500);
ALTER TABLE service_requests ADD COLUMN pickup_latitude DOUBLE PRECISION;
ALTER TABLE service_requests ADD COLUMN pickup_longitude DOUBLE PRECISION;
ALTER TABLE service_requests ADD COLUMN pickup_place_id VARCHAR(255);
ALTER TABLE service_requests ADD COLUMN pickup_landmark TEXT;

-- 4. Add dropoff location columns to service_requests table
ALTER TABLE service_requests ADD COLUMN dropoff_address VARCHAR(500);
ALTER TABLE service_requests ADD COLUMN dropoff_latitude DOUBLE PRECISION;
ALTER TABLE service_requests ADD COLUMN dropoff_longitude DOUBLE PRECISION;
ALTER TABLE service_requests ADD COLUMN dropoff_place_id VARCHAR(255);
ALTER TABLE service_requests ADD COLUMN dropoff_landmark TEXT;

-- 5. Add pickup location columns to jobs table
ALTER TABLE jobs ADD COLUMN pickup_address VARCHAR(500);
ALTER TABLE jobs ADD COLUMN pickup_latitude DOUBLE PRECISION;
ALTER TABLE jobs ADD COLUMN pickup_longitude DOUBLE PRECISION;
ALTER TABLE jobs ADD COLUMN pickup_place_id VARCHAR(255);
ALTER TABLE jobs ADD COLUMN pickup_landmark TEXT;

-- 6. Add dropoff location columns to jobs table
ALTER TABLE jobs ADD COLUMN dropoff_address VARCHAR(500);
ALTER TABLE jobs ADD COLUMN dropoff_latitude DOUBLE PRECISION;
ALTER TABLE jobs ADD COLUMN dropoff_longitude DOUBLE PRECISION;
ALTER TABLE jobs ADD COLUMN dropoff_place_id VARCHAR(255);
ALTER TABLE jobs ADD COLUMN dropoff_landmark TEXT;
