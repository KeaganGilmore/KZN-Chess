-- Tutor is an additive capability, not a primary role: a user can be a
-- player / organizer / admin AND a tutor. Replace the role-based model with a
-- boolean flag.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tutor BOOLEAN NOT NULL DEFAULT false;

-- Migrate any accounts created under the retired 'tutor' role.
UPDATE users SET is_tutor = true, role = 'player' WHERE role = 'tutor';
