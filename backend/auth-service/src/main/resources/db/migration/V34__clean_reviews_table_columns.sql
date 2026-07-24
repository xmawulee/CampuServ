-- V34__clean_reviews_table_columns.sql
-- Removes stale/unused columns from the reviews table that are not mapped in the JPA entity and violate constraints.

ALTER TABLE reviews DROP COLUMN IF EXISTS status;
ALTER TABLE reviews DROP COLUMN IF EXISTS due_date;
ALTER TABLE reviews DROP COLUMN IF EXISTS auto_generated;
