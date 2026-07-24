-- Request Service Initial Flyway Baseline Schema

CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR(255) PRIMARY KEY,
    requester_id VARCHAR(255) NOT NULL,
    category_id VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    deadline TIMESTAMP,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'OPEN',
    budget_min DECIMAL(19, 2),
    budget_max DECIMAL(19, 2),
    timing_type VARCHAR(50),
    scheduled_date TIMESTAMP,
    location_type VARCHAR(50),
    delivery_mode VARCHAR(50),
    target_provider_id VARCHAR(255),
    escrow_held BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offers (
    id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    price DECIMAL(19, 2) NOT NULL,
    eta VARCHAR(100),
    message TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_attachments (
    id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_locations (
    id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
