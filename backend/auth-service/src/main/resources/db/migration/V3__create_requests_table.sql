CREATE TABLE service_requests (
    id VARCHAR(50) PRIMARY KEY,
    requester_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR(50) NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    deadline TIMESTAMP NOT NULL,
    location VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'ASSIGNED', 'COMPLETED', 'CANCELLED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE request_attachments (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    file_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_requests_requester ON service_requests(requester_id);
CREATE INDEX idx_requests_category ON service_requests(category_id);
