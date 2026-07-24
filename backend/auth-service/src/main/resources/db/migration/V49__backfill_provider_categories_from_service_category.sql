-- V49__backfill_provider_categories_from_service_category.sql
-- Fixes data integrity gap where providers had service_category set on their user record
-- but were missing the corresponding row in provider_categories join table.
-- This made them invisible to all category-filtered provider search queries.

INSERT INTO provider_categories (provider_id, category_id, status)
SELECT 
    u.id,
    sc.id,
    'VERIFIED'
FROM users u
JOIN service_categories sc ON sc.name = u.service_category
WHERE 
    u.role = 'PROVIDER'
    AND u.service_category IS NOT NULL
    AND u.service_category != ''
    AND NOT EXISTS (
        SELECT 1 FROM provider_categories pc 
        WHERE pc.provider_id = u.id AND pc.category_id = sc.id
    )
ON CONFLICT DO NOTHING;
