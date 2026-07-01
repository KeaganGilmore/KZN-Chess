-- Repertoire overhaul: per-move annotations + arrows, and per-move spaced
-- repetition (each node is its own SR card).

ALTER TABLE repertoire_nodes
  ADD COLUMN IF NOT EXISTS comment_before TEXT,
  ADD COLUMN IF NOT EXISTS comment_after TEXT,
  ADD COLUMN IF NOT EXISTS arrows JSONB NOT NULL DEFAULT '[]';  -- [{from,to,color}]

-- Existing free-text notes become the "after" comment for the first read-through.
UPDATE repertoire_nodes
  SET comment_after = notes
  WHERE comment_after IS NULL AND notes IS NOT NULL AND notes <> '';

CREATE TABLE IF NOT EXISTS node_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES repertoire_nodes(id) ON DELETE CASCADE,
  sr_level INT NOT NULL DEFAULT 0,           -- 0..7 (Chessable-style)
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fail_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  UNIQUE (user_id, node_id)
);

-- NB: the spec's partial index `WHERE next_review_at <= now()` is invalid in
-- Postgres (now() is not IMMUTABLE, so it can't appear in an index predicate).
-- A plain composite index serves the "due, most-overdue-first" queue query.
CREATE INDEX IF NOT EXISTS idx_node_reviews_due ON node_reviews(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_node_reviews_node ON node_reviews(node_id);
CREATE INDEX IF NOT EXISTS idx_node_reviews_weak ON node_reviews(user_id, fail_count DESC);

ALTER TABLE node_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own node reviews" ON node_reviews;
CREATE POLICY "Users manage own node reviews" ON node_reviews FOR ALL USING (user_id = auth.uid());
