/**
 * Video processing utilities for EstateClips.
 *
 * Since Vercel serverless functions have a 50MB size limit and
 * FFmpeg binary is too large to bundle directly, we use the
 * following strategy:
 *
 * 1. For development: use @ffmpeg/ffmpeg (WASM) in the browser
 * 2. For production: use Vercel's video processing via API routes
 *    with the video stored in Supabase Storage
 *
 * The actual clip creation is handled client-side using the
 * Web Video API where available, with server-side metadata.
 */

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  fileSize: number;
  mimeType: string;
}

export interface ClipSpec {
  startTime: number;
  endTime: number;
  title: string;
  outputPath: string;
}

/**
 * Extract video metadata using the browser's Video API.
 * This runs client-side during upload validation.
 */
export async function extractVideoMetadata(
  file: File
): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fps: 30, // Default - actual FPS requires FFmpeg
        fileSize: file.size,
        mimeType: file.type,
      });
      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    };

    video.src = url;
    video.load();
  });
}

/**
 * Validate video file for processing.
 */
export function validateVideoFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_SIZE = 500 * 1024 * 1024; // 500MB
  const ALLOWED_TYPES = [
    "video/mp4",
    "video/mov",
    "video/quicktime",
    "video/avi",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
    "video/mkv",
  ];

  if (!file.type && !file.name.match(/\.(mp4|mov|avi|webm|mkv|m4v)$/i)) {
    return { valid: false, error: "File must be a video (MP4, MOV, AVI, WebM, MKV)" };
  }

  if (!ALLOWED_TYPES.includes(file.type) && file.type !== "") {
    return {
      valid: false,
      error: `Unsupported video format. Please use MP4, MOV, AVI, WebM, or MKV.`,
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(0)}MB). Maximum size is 500MB.`,
    };
  }

  if (file.size < 1024) {
    return { valid: false, error: "File appears to be empty or corrupted." };
  }

  return { valid: true };
}

/**
 * Format duration for display.
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Create a video thumbnail at a given timestamp using Canvas API.
 */
export async function createVideoThumbnail(
  videoUrl: string,
  timestamp: number = 0
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve(null);
      return;
    }

    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    video.currentTime = timestamp;

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    };

    video.onerror = () => resolve(null);
    video.load();
  });
}

/**
 * Generate a simple transcript from video using the Web Speech API.
 * This is a fallback when server-side transcription is unavailable.
 */
export function generateSimpleTranscript(): {
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
} {
  // Return empty transcript - actual transcription happens via Gemini API
  return { text: "", segments: [] };
}

/**
 * Calculate optimal clip boundaries to avoid cutting mid-sentence.
 */
export function optimizeClipBoundaries(
  requestedStart: number,
  requestedEnd: number,
  segments: Array<{ start: number; end: number; text: string }>,
  minDuration: number = 15,
  maxDuration: number = 60
): { start: number; end: number } {
  let start = requestedStart;
  let end = requestedEnd;

  // Ensure within bounds
  const duration = end - start;
  if (duration < minDuration) {
    end = start + minDuration;
  }
  if (duration > maxDuration) {
    end = start + maxDuration;
  }

  if (segments.length === 0) {
    return { start, end };
  }

  // Find nearest segment boundary for start
  let bestStartDiff = Infinity;
  for (const seg of segments) {
    const diff = Math.abs(seg.start - start);
    if (diff < bestStartDiff && diff < 2.0) {
      bestStartDiff = diff;
      start = seg.start;
    }
  }

  // Find nearest segment end boundary
  let bestEndDiff = Infinity;
  for (const seg of segments) {
    const diff = Math.abs(seg.end - end);
    if (diff < bestEndDiff && diff < 2.0) {
      bestEndDiff = diff;
      end = seg.end;
    }
  }

  return { start, end };
}
