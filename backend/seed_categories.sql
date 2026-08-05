BEGIN;

INSERT INTO service_categories (id, name, description, icon, bg_color, icon_color, icon_key, active, requires_dual_location, created_at)
VALUES 
  ('cat-1', 'Laundry', 'Washing, ironing and folding', 'washing-machine', '#FFF0E6', '#FF6B35', 'washing-machine', true, false, NOW()),
  ('cat-2', 'Cleaning', 'Room and hostel cleaning services', 'broom', '#E8F8F0', '#27AE60', 'broom', true, false, NOW()),
  ('cat-3', 'Tutoring', 'Academic help and tutoring', 'human-male-board', '#EEF0FF', '#5C6BC0', 'human-male-board', true, false, NOW()),
  ('cat-4', 'Errands', 'Running errands and shopping', 'shopping-outline', '#FFF9E6', '#F39C12', 'shopping-outline', true, true, NOW()),
  ('cat-5', 'Tech Repairs', 'Laptop and phone repairs', 'monitor-cellphone', '#E3F2FD', '#1E88E5', 'monitor-cellphone', true, false, NOW()),
  ('cat-6', 'Photography', 'Event and portrait photography', 'camera', '#F3E5F5', '#8E24AA', 'camera', true, false, NOW()),
  ('cat-7', 'Hair & Beauty', 'Hairdressing, makeup, and barber services', 'face-woman-shimmer', '#FCE4EC', '#D81B60', 'face-woman-shimmer', true, false, NOW()),
  ('cat-8', 'Printing', 'Document printing and design', 'text-box-outline', '#EEF2F6', '#475569', 'text-box-outline', true, false, NOW())
ON CONFLICT (name) DO NOTHING;

COMMIT;
