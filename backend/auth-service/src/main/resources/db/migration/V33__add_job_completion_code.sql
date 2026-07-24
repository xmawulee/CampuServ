-- V33__add_job_completion_code.sql
-- Add completion_code column to jobs table.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_code VARCHAR(10);
