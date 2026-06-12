-- Replace legacy placeholder password hashes with real bcrypt hashes.
-- Run after deploying the bcrypt auth changes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Seed accounts ($2b$10$dummyhash...) keep their documented dev password.
UPDATE users
SET password_hash = crypt('password123', gen_salt('bf', 10))
WHERE position('$2b$10$dummyhash' in password_hash) = 1;

-- Self-registered accounts stored base64 of the real password after the
-- '$2b$10$dummy_' marker (13 chars); decode it and hash properly.
UPDATE users
SET password_hash = crypt(
  convert_from(decode(substring(password_hash from 14), 'base64'), 'UTF8'),
  gen_salt('bf', 10)
)
WHERE position('$2b$10$dummy_' in password_hash) = 1;
