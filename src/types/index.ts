export type ContentType =
  | "property_tour"
  | "luxury_listing"
  | "open_house"
  | "market_update"
  | "neighborhood_tour"
  | "talking_head"
  | "listing_walkthrough"
  | "unknown";

export type ProjectStatus =
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type ClipStatus = "processing" | "completed" | "failed";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  status: ProjectStatus;
  content_type: ContentType;
  original_video_url: string;
  original_video_path: string;
  video_duration: number | null;
  transcript: TranscriptSegment[] | null;
  scene_analysis: SceneAnalysis | null;
  property_details: PropertyDetails | null;
  processing_progress: number;
  processing_step: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  clips?: Clip[];
}

export interface Clip {
  id: string;
  project_id: string;
  title: string;
  description: string;
  clip_url: string;
  clip_path: string;
  thumbnail_url: string | null;
  duration: number;
  start_time: number;
  end_time: number;
  clip_type: ContentType;
  captions: Caption[];
  overlays: Overlay[];
  highlight_score: number;
  created_at: string;
  download_count: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  cleaned_text: string;
  confidence: number;
  speaker?: string;
}

export interface Caption {
  start: number;
  end: number;
  text: string;
  style: CaptionStyle;
  position: CaptionPosition;
  highlighted_words?: string[];
}

export type CaptionPosition = "top" | "middle" | "bottom" | "safe";

export interface CaptionStyle {
  fontSize: "sm" | "md" | "lg" | "xl";
  fontWeight: "normal" | "bold";
  color: string;
  backgroundColor: string;
  animation: "fade" | "pop" | "slide" | "none";
  highlightColor?: string;
}

export interface Overlay {
  type: "room_label" | "open_house_info" | "neighborhood_info" | "agent_info";
  content: Record<string, string>;
  position: { x: number; y: number };
  startTime: number;
  endTime: number;
  style: string;
}

export interface SceneAnalysis {
  scenes: Scene[];
  detected_rooms: DetectedRoom[];
  detected_features: string[];
  overall_quality: number;
  /** Full computer vision result (optional – populated after vision pass) */
  vision_result?: import("@/lib/vision/types").VisionAnalysisResult;
}

export interface Scene {
  start: number;
  end: number;
  type: string;
  quality_score: number;
  motion_level: "low" | "medium" | "high";
  description: string;
}

export interface DetectedRoom {
  name: string;
  timestamp: number;
  confidence: number;
  keywords_found: string[];
}

export interface PropertyDetails {
  address?: string;
  price?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  agent_name?: string;
  brokerage?: string;
  open_house_date?: string;
  open_house_time?: string;
  listing_id?: string;
  features?: string[];
  neighborhood?: string;
}

export interface ProcessingJob {
  project_id: string;
  step: ProcessingStep;
  progress: number;
  message: string;
  error?: string;
}

export type ProcessingStep =
  | "validating"
  | "extracting_audio"
  | "transcribing"
  | "analyzing_scenes"
  | "running_vision"
  | "detecting_rooms"
  | "detecting_content"
  | "finding_highlights"
  | "scoring_clips"
  | "generating_captions"
  | "building_overlays"
  | "creating_clips"
  | "exporting"
  | "completed"
  | "failed";

export interface AIAnalysisResult {
  content_type: ContentType;
  property_details: PropertyDetails;
  highlights: HighlightMoment[];
  caption_improvements: CaptionImprovement[];
  detected_rooms: DetectedRoom[];
  template_recommendation: TemplateConfig;
  /** Full vision analysis result (populated when vision pass runs) */
  vision_result?: import("@/lib/vision/types").VisionAnalysisResult;
}

export interface HighlightMoment {
  start: number;
  end: number;
  score: number;
  reason: string;
  suggested_title: string;
  room_context?: string;
  /** Composite vision+transcript score (populated after scoring pass) */
  composite_score?: number;
}

export interface CaptionImprovement {
  original: string;
  improved: string;
  removed_fillers: string[];
  highlighted_keywords: string[];
  segment_index: number;
}

export interface TemplateConfig {
  name: string;
  font_style: "elegant" | "bold" | "modern" | "casual";
  color_scheme: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };
  animation_style: "smooth" | "energetic" | "minimal" | "dynamic";
  overlay_position: "bottom" | "top" | "overlay";
  caption_style: CaptionStyle;
}

export interface DashboardStats {
  total_projects: number;
  completed_projects: number;
  total_clips: number;
  total_downloads: number;
  storage_used_mb: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
