-- Migration to completely remove username column
ALTER TABLE users DROP COLUMN IF EXISTS username;
