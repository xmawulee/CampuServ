CREATE TABLE provider_profiles (
    id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    rating NUMERIC(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    completed_jobs_count INTEGER DEFAULT 0,
    portfolio_urls TEXT,
    approval_status VARCHAR(50) DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    rejection_reason VARCHAR(255),
    approved_at TIMESTAMP,
    approved_by VARCHAR(50),
    is_test_account BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE service_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE provider_services (
    id VARCHAR(50) PRIMARY KEY,
    provider_id VARCHAR(50) NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    category_id VARCHAR(50) NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    base_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
