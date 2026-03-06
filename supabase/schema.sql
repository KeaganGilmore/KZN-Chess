-- KZN Chess Tournament Hub Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE user_role AS ENUM ('player', 'organizer', 'admin');
CREATE TYPE tournament_status AS ENUM ('pending', 'approved', 'rejected', 'featured');
CREATE TYPE time_control_type AS ENUM ('classical', 'rapid', 'blitz', 'bullet');

-- ============================================
-- DISTRICTS TABLE
-- ============================================
CREATE TABLE districts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  region TEXT,
  coordinator_name TEXT,
  coordinator_email TEXT,
  coordinator_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role DEFAULT 'player',
  district_id UUID REFERENCES districts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TOURNAMENTS TABLE
-- ============================================
CREATE TABLE tournaments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  venue TEXT NOT NULL,
  venue_address TEXT,
  maps_link TEXT,
  time_control time_control_type NOT NULL DEFAULT 'classical',
  time_control_detail TEXT,
  rounds INTEGER DEFAULT 5,
  entry_fee TEXT,
  prizes TEXT,
  is_rated BOOLEAN DEFAULT false,
  registration_procedure TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  poster_url TEXT,
  district_id UUID REFERENCES districts(id) NOT NULL,
  organizer_id UUID REFERENCES users(id) NOT NULL,
  status tournament_status DEFAULT 'pending',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tournaments_date ON tournaments(date);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_district ON tournaments(district_id);

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SITE CONTENT TABLE (CMS)
-- ============================================
CREATE TABLE site_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES users(id),
  admin_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- TOURNAMENT MEDIA TABLE
-- ============================================
CREATE TABLE tournament_media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES users(id) NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'poster')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tournament_media_tournament ON tournament_media(tournament_id);

-- ============================================
-- TOURNAMENT COMMENTS TABLE
-- ============================================
CREATE TABLE tournament_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tournament_comments_tournament ON tournament_comments(tournament_id);

-- ============================================
-- TOURNAMENT LIKES TABLE
-- ============================================
CREATE TABLE tournament_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_likes_tournament ON tournament_likes(tournament_id);
CREATE INDEX idx_tournament_likes_user ON tournament_likes(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Districts: readable by all, writable by admin
CREATE POLICY "Districts are viewable by everyone" ON districts FOR SELECT USING (true);
CREATE POLICY "Districts are editable by admins" ON districts FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Users: self-read + admin full access
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Admins can update users" ON users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Tournaments: approved visible to all, organizers see own, admins see all
CREATE POLICY "Approved tournaments viewable by all" ON tournaments FOR SELECT USING (
  status IN ('approved', 'featured')
);
CREATE POLICY "Organizers can view own tournaments" ON tournaments FOR SELECT USING (
  organizer_id = auth.uid()
);
CREATE POLICY "Authenticated users can insert tournaments" ON tournaments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
);
CREATE POLICY "Admins can manage all tournaments" ON tournaments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Announcements: active visible to all, admins manage
CREATE POLICY "Active announcements viewable by all" ON announcements FOR SELECT USING (
  is_active = true AND (end_date IS NULL OR end_date > NOW())
);
CREATE POLICY "Admins manage announcements" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Site content: readable by all, writable by admin
CREATE POLICY "Site content viewable by all" ON site_content FOR SELECT USING (true);
CREATE POLICY "Admins manage site content" ON site_content FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Tournament media: viewable by all, insertable by authenticated users, manageable by admins
ALTER TABLE tournament_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media viewable by all" ON tournament_media FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload media" ON tournament_media FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
);
CREATE POLICY "Admins manage media" ON tournament_media FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Tournament comments: viewable by all, insertable by authenticated users
ALTER TABLE tournament_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by all" ON tournament_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON tournament_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
);
CREATE POLICY "Users can delete own comments" ON tournament_comments FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admins manage comments" ON tournament_comments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Tournament likes: viewable by all, authenticated users can toggle
ALTER TABLE tournament_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by all" ON tournament_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON tournament_likes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
);
CREATE POLICY "Users can remove own likes" ON tournament_likes FOR DELETE USING (user_id = auth.uid());

-- Audit logs: admin only
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Admins can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON tournament_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
