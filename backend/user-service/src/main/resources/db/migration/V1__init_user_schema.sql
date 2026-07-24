-- User Service Initial Flyway Baseline Schema

CREATE TABLE IF NOT EXISTS provider_profiles (
    id VARCHAR(255) PRIMARY KEY,
    bio TEXT,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    completed_jobs_count INT DEFAULT 0,
    portfolio_urls TEXT,
    approval_status VARCHAR(50) DEFAULT 'PENDING',
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_key VARCHAR(100),
    bg_color VARCHAR(50),
    icon_color VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_services (
    id VARCHAR(255) PRIMARY KEY,
    provider_id VARCHAR(255) NOT NULL,
    category_id VARCHAR(255) NOT NULL,
    base_price DECIMAL(19, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
