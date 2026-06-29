-- Puzzle library for tutor mode.
-- Schema mirrors the public Lichess puzzle database
-- (https://database.lichess.org/#puzzles) so the importer can upsert it
-- directly. Puzzles are public reference data: readable by everyone, written
-- only by the service-role importer.

CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY,                       -- Lichess PuzzleId (e.g. '00008')
  fen TEXT NOT NULL,                         -- position before the setup move
  moves TEXT NOT NULL,                       -- space-separated UCI solution line
  rating INTEGER NOT NULL,                   -- puzzle difficulty (Glicko)
  rating_deviation INTEGER,
  popularity INTEGER,                        -- -100..100
  nb_plays INTEGER,
  themes TEXT[] NOT NULL DEFAULT '{}',        -- e.g. {fork, pin, endgame}
  game_url TEXT,
  opening_tags TEXT[] NOT NULL DEFAULT '{}',  -- e.g. {Italian_Game}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tutor dashboard filters: by difficulty (rating range), theme, and opening.
CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(rating);
CREATE INDEX IF NOT EXISTS idx_puzzles_popularity ON puzzles(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_puzzles_themes ON puzzles USING GIN(themes);
CREATE INDEX IF NOT EXISTS idx_puzzles_opening_tags ON puzzles USING GIN(opening_tags);

ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Puzzles are viewable by everyone" ON puzzles;
CREATE POLICY "Puzzles are viewable by everyone" ON puzzles FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies: only the service role (importer) writes.
