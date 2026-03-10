-- Tournament Management System Migration
-- Adds tables for full tournament operations (players, rounds, pairings, results, arbiters, settings)

-- ============================================
-- NEW ENUM TYPES
-- ============================================
DO $$ BEGIN CREATE TYPE pairing_system AS ENUM ('swiss', 'round_robin', 'double_round_robin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rating_type AS ENUM ('fide', 'national', 'unrated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE round_status AS ENUM ('not_started', 'pairings_published', 'in_progress', 'results_published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE game_result AS ENUM ('1-0', '0-1', 'draw', 'white_forfeit', 'black_forfeit', 'double_forfeit', 'bye', 'half_bye'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE arbiter_role AS ENUM ('director', 'arbiter'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sex_type AS ENUM ('M', 'F'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE age_category AS ENUM ('open', 'u8', 'u10', 'u12', 'u14', 'u16', 'u18'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TOURNAMENT SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tournament_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pairing_system pairing_system NOT NULL DEFAULT 'swiss',
  num_rounds INTEGER NOT NULL DEFAULT 5,
  point_win DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  point_draw DECIMAL(3,1) NOT NULL DEFAULT 0.5,
  point_loss DECIMAL(3,1) NOT NULL DEFAULT 0.0,
  point_bye DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  point_half_bye DECIMAL(3,1) NOT NULL DEFAULT 0.5,
  tiebreak_order JSONB NOT NULL DEFAULT '["buchholz", "buchholz_cut1", "sonneborn_berger"]',
  rating_type rating_type NOT NULL DEFAULT 'unrated',
  allow_self_registration BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_settings_tournament ON tournament_settings(tournament_id);

-- ============================================
-- TOURNAMENT SECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tournament_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_sections_tournament ON tournament_sections(tournament_id);

-- ============================================
-- TOURNAMENT ARBITERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tournament_arbiters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  role arbiter_role NOT NULL DEFAULT 'arbiter',
  appointed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_arbiters_tournament ON tournament_arbiters(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_arbiters_user ON tournament_arbiters(user_id);

-- ============================================
-- TOURNAMENT PLAYERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tournament_players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES tournament_sections(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  player_name TEXT NOT NULL,
  fide_id TEXT,
  chess_sa_id TEXT,
  fide_rating INTEGER,
  national_rating INTEGER,
  club TEXT,
  district TEXT,
  sex sex_type,
  age_category age_category DEFAULT 'open',
  starting_rank INTEGER,
  is_withdrawn BOOLEAN NOT NULL DEFAULT false,
  withdrawn_after_round INTEGER,
  bye_requested_rounds JSONB DEFAULT '[]',
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_section ON tournament_players(section_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_user ON tournament_players(user_id);

-- ============================================
-- TOURNAMENT ROUNDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tournament_rounds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  status round_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE(tournament_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_tournament_rounds_tournament ON tournament_rounds(tournament_id);

-- ============================================
-- TOURNAMENT PAIRINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tournament_pairings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  round_id UUID REFERENCES tournament_rounds(id) ON DELETE CASCADE NOT NULL,
  board_number INTEGER NOT NULL,
  white_player_id UUID REFERENCES tournament_players(id) NOT NULL,
  black_player_id UUID REFERENCES tournament_players(id),
  result game_result,
  is_bye BOOLEAN NOT NULL DEFAULT false,
  is_forfeit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_pairings_round ON tournament_pairings(round_id);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_white ON tournament_pairings(white_player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_black ON tournament_pairings(black_player_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Tournament Settings
ALTER TABLE tournament_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament settings viewable by all" ON tournament_settings;
CREATE POLICY "Tournament settings viewable by all" ON tournament_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Directors and arbiters can manage settings" ON tournament_settings;
CREATE POLICY "Directors and arbiters can manage settings" ON tournament_settings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tournament_arbiters ta
    WHERE ta.tournament_id = tournament_settings.tournament_id
    AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_settings.tournament_id
    AND t.organizer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Tournament Sections
ALTER TABLE tournament_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament sections viewable by all" ON tournament_sections;
CREATE POLICY "Tournament sections viewable by all" ON tournament_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Directors and arbiters can manage sections" ON tournament_sections;
CREATE POLICY "Directors and arbiters can manage sections" ON tournament_sections FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tournament_arbiters ta
    WHERE ta.tournament_id = tournament_sections.tournament_id
    AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_sections.tournament_id
    AND t.organizer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Tournament Arbiters
ALTER TABLE tournament_arbiters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament arbiters viewable by all" ON tournament_arbiters;
CREATE POLICY "Tournament arbiters viewable by all" ON tournament_arbiters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Directors can manage arbiters" ON tournament_arbiters;
CREATE POLICY "Directors can manage arbiters" ON tournament_arbiters FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_arbiters.tournament_id
    AND t.organizer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Tournament Players
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament players viewable by all" ON tournament_players;
CREATE POLICY "Tournament players viewable by all" ON tournament_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Directors and arbiters can manage players" ON tournament_players;
CREATE POLICY "Directors and arbiters can manage players" ON tournament_players FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tournament_arbiters ta
    WHERE ta.tournament_id = tournament_players.tournament_id
    AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_players.tournament_id
    AND t.organizer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Self-registration insert policy
DROP POLICY IF EXISTS "Players can self-register" ON tournament_players;
CREATE POLICY "Players can self-register" ON tournament_players FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournament_settings ts
    WHERE ts.tournament_id = tournament_players.tournament_id
    AND ts.allow_self_registration = true
  )
  AND auth.uid() IS NOT NULL
  AND tournament_players.user_id = auth.uid()
  AND tournament_players.is_approved = false
);

-- Tournament Rounds
ALTER TABLE tournament_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament rounds viewable by all" ON tournament_rounds;
CREATE POLICY "Tournament rounds viewable by all" ON tournament_rounds FOR SELECT USING (true);

DROP POLICY IF EXISTS "Directors and arbiters can manage rounds" ON tournament_rounds;
CREATE POLICY "Directors and arbiters can manage rounds" ON tournament_rounds FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tournament_arbiters ta
    WHERE ta.tournament_id = tournament_rounds.tournament_id
    AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_rounds.tournament_id
    AND t.organizer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Tournament Pairings
ALTER TABLE tournament_pairings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament pairings viewable by all" ON tournament_pairings;
CREATE POLICY "Tournament pairings viewable by all" ON tournament_pairings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Directors and arbiters can manage pairings" ON tournament_pairings;
CREATE POLICY "Directors and arbiters can manage pairings" ON tournament_pairings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tournament_rounds tr
    JOIN tournament_arbiters ta ON ta.tournament_id = tr.tournament_id
    WHERE tr.id = tournament_pairings.round_id
    AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM tournament_rounds tr
    JOIN tournaments t ON t.id = tr.tournament_id
    WHERE tr.id = tournament_pairings.round_id
    AND t.organizer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_tournament_settings_updated_at ON tournament_settings;
CREATE TRIGGER update_tournament_settings_updated_at BEFORE UPDATE ON tournament_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tournament_players_updated_at ON tournament_players;
CREATE TRIGGER update_tournament_players_updated_at BEFORE UPDATE ON tournament_players FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tournament_pairings_updated_at ON tournament_pairings;
CREATE TRIGGER update_tournament_pairings_updated_at BEFORE UPDATE ON tournament_pairings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUTO-CREATE SETTINGS AND DIRECTOR ON TOURNAMENT CREATE
-- ============================================
CREATE OR REPLACE FUNCTION auto_create_tournament_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tournament_settings (tournament_id, num_rounds)
  VALUES (NEW.id, COALESCE(NEW.rounds, 5))
  ON CONFLICT (tournament_id) DO NOTHING;

  INSERT INTO tournament_arbiters (tournament_id, user_id, role)
  VALUES (NEW.id, NEW.organizer_id, 'director')
  ON CONFLICT (tournament_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_tournament_settings_trigger ON tournaments;
CREATE TRIGGER auto_create_tournament_settings_trigger
  AFTER INSERT ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_tournament_settings();
