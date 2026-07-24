-- Update passwords to valid BCrypt hashes for testing
-- admin123 hash: $2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a
-- password123 hash: $2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a

UPDATE users 
SET password_hash = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a' 
WHERE email IN ('admin@campusserv.com', 'testprovider@st.knust.edu.gh', 'teststudent@st.knust.edu.gh');
