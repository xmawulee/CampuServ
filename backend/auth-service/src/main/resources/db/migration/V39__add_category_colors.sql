-- V39__add_category_colors.sql
-- Missing color properties mapping and rebrand updates for default categories.

ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS bg_color VARCHAR(50);
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS icon_color VARCHAR(50);

-- Reseed category colors to align harmoniously with the new Coral Orange / White Rock rebrand.
UPDATE service_categories 
SET bg_color = '#FFEBE3', 
    icon_color = '#FF7846'
WHERE active = TRUE OR active IS NULL;
