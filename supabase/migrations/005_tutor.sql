-- Tutor toolkit: a tutor-owned workspace for curating puzzle sets, keeping
-- local student records, and logging sessions. No student accounts involved.

-- New role for tutors (admins also have tutor access). Safe on PG 12+.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tutor';

-- A named, curated set of puzzles for a lesson / OTB session.
CREATE TABLE IF NOT EXISTS session_sets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  skill_level TEXT,                   -- free text, e.g. 'beginner', 'U1200'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_sets_tutor ON session_sets(tutor_id);

CREATE TABLE IF NOT EXISTS session_set_puzzles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_set_id UUID NOT NULL REFERENCES session_sets(id) ON DELETE CASCADE,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (session_set_id, puzzle_id)
);
CREATE INDEX IF NOT EXISTS idx_session_set_puzzles_set ON session_set_puzzles(session_set_id);

-- Tutor-owned student profile (not a login account).
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  skill_level TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_tutor ON students(tutor_id);

-- A dated session note against a student (tutor's own progress tracking).
CREATE TABLE IF NOT EXISTS student_session_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_set_id UUID REFERENCES session_sets(id) ON DELETE SET NULL,
  rating_snapshot INTEGER,            -- tutor's own estimate, optional
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_logs_student ON student_session_logs(student_id, session_date DESC);

-- RLS: a tutor only sees their own rows (defence in depth; APIs use service role).
ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_set_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_session_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors manage own sets" ON session_sets;
CREATE POLICY "Tutors manage own sets" ON session_sets FOR ALL USING (tutor_id = auth.uid());
DROP POLICY IF EXISTS "Tutors manage own set puzzles" ON session_set_puzzles;
CREATE POLICY "Tutors manage own set puzzles" ON session_set_puzzles FOR ALL USING (
  EXISTS (SELECT 1 FROM session_sets s WHERE s.id = session_set_puzzles.session_set_id AND s.tutor_id = auth.uid())
);
DROP POLICY IF EXISTS "Tutors manage own students" ON students;
CREATE POLICY "Tutors manage own students" ON students FOR ALL USING (tutor_id = auth.uid());
DROP POLICY IF EXISTS "Tutors manage own logs" ON student_session_logs;
CREATE POLICY "Tutors manage own logs" ON student_session_logs FOR ALL USING (tutor_id = auth.uid());
