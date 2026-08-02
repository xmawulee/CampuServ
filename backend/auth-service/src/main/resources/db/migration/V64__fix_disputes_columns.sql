-- V64: Rename description to reason and add missing resolution columns in disputes table to satisfy supporting-service schema validation.

-- Rename description to reason if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='disputes' AND column_name='description'
    ) THEN
        ALTER TABLE disputes RENAME COLUMN description TO reason;
    END IF;
END $$;

-- Add reason column if not exists (in case description didn't exist)
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS reason TEXT;

-- Set reason to not null after adding/renaming
UPDATE disputes SET reason = '' WHERE reason IS NULL;
ALTER TABLE disputes ALTER COLUMN reason SET NOT NULL;

-- Add missing columns resolved_by_admin_id and resolved_at
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_by_admin_id VARCHAR(255);
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
