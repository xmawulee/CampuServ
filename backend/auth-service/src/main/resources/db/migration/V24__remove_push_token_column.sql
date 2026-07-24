-- V24__remove_push_token_column.sql
ALTER TABLE users DROP COLUMN IF EXISTS push_token;
