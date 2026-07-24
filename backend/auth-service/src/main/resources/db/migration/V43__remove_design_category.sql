-- 1. Remove Graphic Design / Design & Print Category (cat-5)
DELETE FROM provider_services WHERE category_id = 'cat-5';
DELETE FROM service_requests WHERE category_id = 'cat-5';
DELETE FROM service_categories WHERE id = 'cat-5';
