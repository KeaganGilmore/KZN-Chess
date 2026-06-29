-- Spaced-repetition review state for opening positions (one row per
-- user + repertoire node that the player drills).

CREATE TABLE IF NOT EXISTS opening_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES repertoire_nodes(id) ON DELETE CASCADE,
  reps INTEGER NOT NULL DEFAULT 0,
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days REAL NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, node_id)
);
CREATE INDEX IF NOT EXISTS idx_opening_reviews_user ON opening_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_opening_reviews_due ON opening_reviews(user_id, due_at);

ALTER TABLE opening_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own reviews" ON opening_reviews;
CREATE POLICY "Users manage own reviews" ON opening_reviews FOR ALL USING (user_id = auth.uid());
