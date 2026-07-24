-- V48__add_photography_videography_catering_categories.sql
-- Adds Photography, Videography, and Catering as active service categories.
-- No UI or code changes needed — all consumers fetch categories dynamically.

INSERT INTO service_categories (id, name, description, icon_key, active, bg_color, icon_color)
VALUES
  (gen_random_uuid()::varchar, 'Photography',  'Event, portrait, and graduation photography services',            'camera',      TRUE, '#F3E5F5', '#8E24AA'),
  (gen_random_uuid()::varchar, 'Videography',  'Video recording and editing for events and personal projects',   'video',       TRUE, '#E8EAF6', '#3949AB'),
  (gen_random_uuid()::varchar, 'Catering',     'Food preparation and delivery for events and personal orders',   'food-fork-drink', TRUE, '#E8F5E9', '#43A047')
ON CONFLICT (name) DO NOTHING;
