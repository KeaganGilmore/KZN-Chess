-- Player puzzle progress: per-player rating, streaks, and an attempt log.

CREATE TABLE IF NOT EXISTS player_puzzle_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 1200,
  solved INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS puzzle_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  correct BOOLEAN NOT NULL,
  used_hint BOOLEAN NOT NULL DEFAULT false,
  rating_before INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_user ON puzzle_attempts(user_id, created_at DESC);

ALTER TABLE player_puzzle_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzle_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players read own puzzle stats" ON player_puzzle_stats;
CREATE POLICY "Players read own puzzle stats" ON player_puzzle_stats FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Players read own attempts" ON puzzle_attempts;
CREATE POLICY "Players read own attempts" ON puzzle_attempts FOR SELECT USING (user_id = auth.uid());
-- Writes go through API routes using the service role.
