-- Opening repertoires: a per-user move tree stored as a FEN adjacency list.
-- Each repertoire has one root node (the start position); every other node is
-- a position reached by one move from its parent.

CREATE TABLE IF NOT EXISTS repertoires (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'white',   -- side the player studies: 'white' | 'black'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repertoires_user ON repertoires(user_id);

CREATE TABLE IF NOT EXISTS repertoire_nodes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  repertoire_id UUID NOT NULL REFERENCES repertoires(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES repertoire_nodes(id) ON DELETE CASCADE,  -- null = root
  fen TEXT NOT NULL,           -- position AFTER move_uci
  move_san TEXT,               -- null for the root
  move_uci TEXT,               -- null for the root
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (repertoire_id, parent_id, move_uci)  -- no duplicate child move
);
CREATE INDEX IF NOT EXISTS idx_repertoire_nodes_rep ON repertoire_nodes(repertoire_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_nodes_parent ON repertoire_nodes(parent_id);

ALTER TABLE repertoires ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertoire_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own repertoires" ON repertoires;
CREATE POLICY "Users manage own repertoires" ON repertoires FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users manage own repertoire nodes" ON repertoire_nodes;
CREATE POLICY "Users manage own repertoire nodes" ON repertoire_nodes FOR ALL USING (
  EXISTS (SELECT 1 FROM repertoires r WHERE r.id = repertoire_nodes.repertoire_id AND r.user_id = auth.uid())
);
