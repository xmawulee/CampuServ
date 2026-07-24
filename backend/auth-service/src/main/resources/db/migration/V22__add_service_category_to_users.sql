-- Add service_category column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_category VARCHAR(100);

-- Migrate existing provider_categories data to the new column
UPDATE users u
SET service_category = (
    SELECT c.name
    FROM provider_categories pc
    JOIN service_categories c ON pc.category_id = c.id
    WHERE pc.provider_id = u.id
    LIMIT 1
)
WHERE role = 'PROVIDER';
