-- EstateClips: Vision Pipeline Migration
-- Run this in your Supabase SQL Editor after the initial schema migration.

-- ============================================================
-- CLIPS TABLE: add composite_score and vision metadata
-- ============================================================

ALTER TABLE clips
  ADD COLUMN IF NOT EXISTS composite_score NUMERIC DEFAULT NULL
    CHECK (composite_score IS NULL OR (composite_score >= 0 AND composite_score <= 1)),
  ADD COLUMN IF NOT EXISTS vision_signals JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reframing_instructions JSONB DEFAULT NULL;

-- ============================================================
-- PROJECTS TABLE: add vision_enabled flag and production quality
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS vision_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS production_quality NUMERIC DEFAULT NULL
    CHECK (production_quality IS NULL OR (production_quality >= 0 AND production_quality <= 1));

-- ============================================================
-- VIEW: ranked clips (best-first by composite_score, falling back to highlight_score)
-- ============================================================

CREATE OR REPLACE VIEW ranked_clips AS
SELECT
  c.*,
  COALESCE(c.composite_score, c.highlight_score) AS effective_score,
  ROW_NUMBER() OVER (
    PARTITION BY c.project_id
    ORDER BY COALESCE(c.composite_score, c.highlight_score) DESC
  ) AS rank_in_project
FROM clips c;

-- Clips index for score ordering
CREATE INDEX IF NOT EXISTS clips_composite_score_idx ON clips(composite_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS clips_highlight_score_idx ON clips(highlight_score DESC);

-- ============================================================
-- TABLE: room_detections (separate table for room-level insights)
-- ============================================================

CREATE TABLE IF NOT EXISTS room_detections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_label TEXT NOT NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC,
  confidence NUMERIC NOT NULL DEFAULT 0.5
    CHECK (confidence >= 0 AND confidence <= 1),
  detection_source TEXT NOT NULL DEFAULT 'transcript'
    CHECK (detection_source IN ('transcript', 'vision', 'both')),
  keywords_found JSONB DEFAULT '[]',
  property_features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE room_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own room_detections" ON room_detections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own room_detections" ON room_detections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own room_detections" ON room_detections
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS room_detections_project_id_idx ON room_detections(project_id);

-- ============================================================
-- TABLE: clip_exports (track export attempts with overlay specs)
-- ============================================================

CREATE TABLE IF NOT EXISTS clip_exports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  export_format TEXT NOT NULL DEFAULT 'mp4'
    CHECK (export_format IN ('mp4', 'webm', 'gif')),
  aspect_ratio TEXT NOT NULL DEFAULT '9:16'
    CHECK (aspect_ratio IN ('9:16', '16:9', '1:1', '4:5')),
  include_overlays BOOLEAN DEFAULT TRUE,
  include_captions BOOLEAN DEFAULT TRUE,
  include_color_grade BOOLEAN DEFAULT TRUE,
  export_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (export_status IN ('pending', 'processing', 'completed', 'failed')),
  export_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

ALTER TABLE clip_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports" ON clip_exports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exports" ON clip_exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exports" ON clip_exports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS clip_exports_clip_id_idx ON clip_exports(clip_id);
CREATE INDEX IF NOT EXISTS clip_exports_user_id_idx ON clip_exports(user_id);
