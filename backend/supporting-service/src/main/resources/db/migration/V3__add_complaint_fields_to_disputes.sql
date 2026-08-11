ALTER TABLE disputes ALTER COLUMN job_id DROP NOT NULL;
ALTER TABLE disputes ADD COLUMN complaint_type VARCHAR(255);
ALTER TABLE disputes ADD COLUMN incident_date TIMESTAMP;
ALTER TABLE disputes ADD COLUMN request_refund BOOLEAN;
