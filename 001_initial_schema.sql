-- EstateClips Database Schema
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  agent_name TEXT,
  brokerage TEXT,
  license_number TEXT,
  phone TEXT,
  website TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- PROJECTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'queued', 'processing', 'completed', 'failed')),
  content_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (content_type IN (
      'property_tour', 'luxury_listing', 'open_house',
      'market_update', 'neighborhood_tour', 'talking_head',
      'listing_walkthrough', 'unknown'
    )),
  original_video_url TEXT,
  original_video_path TEXT,
  video_duration NUMERIC,
  video_width INTEGER,
  video_height INTEGER,
  video_size_bytes BIGINT,
  transcript JSONB,
  scene_analysis JSONB,
  property_details JSONB DEFAULT '{}',
  processing_progress INTEGER DEFAULT 0 CHECK (processing_progress >= 0 AND processing_progress <= 100),
  processing_step TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects(created_at DESC);

-- ============================================================
-- CLIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  clip_url TEXT,
  clip_path TEXT,
  thumbnail_url TEXT,
  thumbnail_path TEXT,
  duration NUMERIC NOT NULL DEFAULT 0,
  start_time NUMERIC NOT NULL DEFAULT 0,
  end_time NUMERIC NOT NULL DEFAULT 0,
  clip_type TEXT DEFAULT 'unknown',
  captions JSONB DEFAULT '[]',
  overlays JSONB DEFAULT '[]',
  highlight_score NUMERIC DEFAULT 0.5 CHECK (highlight_score >= 0 AND highlight_score <= 1),
  download_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clips" ON clips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clips" ON clips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clips" ON clips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clips" ON clips
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS clips_project_id_idx ON clips(project_id);
CREATE INDEX IF NOT EXISTS clips_user_id_idx ON clips(user_id);

-- ============================================================
-- PROCESSING JOBS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  message TEXT,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON processing_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON processing_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- AUTO-UPDATE TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clips_updated_at
  BEFORE UPDATE ON clips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these in the Supabase Storage section or via the API

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  false,
  524288000, -- 500MB
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/avi', 'video/mov']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clips',
  'clips',
  true,
  209715200, -- 200MB per clip
  ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Users can upload own videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos' AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'videos' AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'videos' AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Clips are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'clips');

CREATE POLICY "Users can upload own clips" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'clips' AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own clips" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'clips' AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ============================================================
-- HELPER VIEW: User Dashboard Stats
-- ============================================================
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT
  p.user_id,
  COUNT(DISTINCT p.id) AS total_projects,
  COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) AS completed_projects,
  COUNT(DISTINCT c.id) AS total_clips,
  COALESCE(SUM(c.download_count), 0) AS total_downloads
FROM projects p
LEFT JOIN clips c ON c.project_id = p.id
GROUP BY p.user_id;
