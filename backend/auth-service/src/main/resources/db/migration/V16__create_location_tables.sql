-- Create request_locations table
CREATE TABLE request_locations (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    pickup_address VARCHAR(500) NOT NULL,
    pickup_place_id VARCHAR(255),
    pickup_landmark TEXT,
    location_method VARCHAR(20) NOT NULL, -- 'auto_gps', 'manual_pin', 'search'
    pickup_confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_locked BOOLEAN DEFAULT FALSE
);

-- Create location_history table
CREATE TABLE location_history (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    provider_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DOUBLE PRECISION,
    bearing DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_req_loc_req ON request_locations(request_id);
CREATE INDEX idx_loc_hist_task ON location_history(task_id);
CREATE INDEX idx_loc_hist_provider ON location_history(provider_id);
