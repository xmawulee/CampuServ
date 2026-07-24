CREATE TABLE jobs (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL REFERENCES service_requests(id),
    offer_id VARCHAR(50) NOT NULL REFERENCES offers(id),
    requester_id VARCHAR(50) NOT NULL REFERENCES users(id),
    provider_id VARCHAR(50) NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'PROOF_SUBMITTED', 'COMPLETED', 'DISPUTED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_proofs (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_url VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_requester ON jobs(requester_id);
CREATE INDEX idx_jobs_provider ON jobs(provider_id);
CREATE INDEX idx_jobs_status ON jobs(status);
