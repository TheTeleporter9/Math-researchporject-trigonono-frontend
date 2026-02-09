-- Supabase Database Schema for Math Learning Research Tool
-- Run this SQL in your Supabase SQL editor

-- Teachers table (authentication handled by Supabase Auth)
-- Teachers will authenticate via Supabase Auth, and we'll store additional metadata here

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT, -- Optional, no authentication required
  join_code TEXT UNIQUE NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('team_triangle', 'individual_qr')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'ended')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Teams table (for team-based games)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  anonymous_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, anonymous_id)
);

-- Students table (for individual games)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  anonymous_id TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, anonymous_id)
);

-- Research data: Triangle matching attempts
CREATE TABLE IF NOT EXISTS triangle_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  anonymous_student_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_triangle_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL,
  measurements JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research data: QR code progression
CREATE TABLE IF NOT EXISTS qr_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  anonymous_student_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  question_id TEXT NOT NULL,
  selected_answer TEXT NOT NULL,
  qr_cell_position TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research data: Level completions
CREATE TABLE IF NOT EXISTS level_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  anonymous_student_id TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL,
  level INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  mistakes_count INTEGER DEFAULT 0,
  reset_count INTEGER DEFAULT 0,
  UNIQUE(session_id, anonymous_student_id, game_type, level)
);

-- Research data: Session outcomes
CREATE TABLE IF NOT EXISTS session_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  anonymous_student_id TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL,
  final_level INTEGER,
  total_mistakes INTEGER DEFAULT 0,
  total_resets INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game configuration table (for non-technical configuration)
CREATE TABLE IF NOT EXISTS game_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, config_key)
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE triangle_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_configs ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations (no authentication required)
CREATE POLICY "Allow all session operations"
  ON sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all team operations"
  ON teams FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all student operations"
  ON students FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all research data access"
  ON triangle_attempts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all research data access"
  ON qr_progression FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all research data access"
  ON level_completions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all research data access"
  ON session_outcomes FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all config operations"
  ON game_configs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies: Students can insert their own data (anonymous)
CREATE POLICY "Students can join sessions"
  ON teams FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students can join sessions"
  ON students FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students can insert attempts"
  ON triangle_attempts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students can insert progression"
  ON qr_progression FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students can insert completions"
  ON level_completions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students can insert outcomes"
  ON session_outcomes FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_join_code ON sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_teams_session ON teams(session_id);
CREATE INDEX IF NOT EXISTS idx_students_session ON students(session_id);
CREATE INDEX IF NOT EXISTS idx_triangle_attempts_session ON triangle_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_progression_session ON qr_progression(session_id);
CREATE INDEX IF NOT EXISTS idx_level_completions_session ON level_completions(session_id);
