/**
 * POST /api/clips/export
 *
 * Creates an export record and returns the export specification (overlay metadata,
 * timestamps, and instructions) so the client can perform the actual rendering
 * using @ffmpeg/ffmpeg in the browser or a future server-side renderer.
 *
 * This design keeps Vercel under the 50MB function limit while providing
 * all the data needed for high-quality export.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      clip_id,
      aspect_ratio = "9:16",
      include_overlays = true,
      include_captions = true,
      include_color_grade = true,
    } = body;

    if (!clip_id) {
      return NextResponse.json({ error: "clip_id is required" }, { status: 400 });
    }

    // Fetch the clip with project info
    const { data: clip, error: clipError } = await supabase
      .from("clips")
      .select("*, projects!inner(user_id, original_video_url, original_video_path, video_width, video_height)")
      .eq("id", clip_id)
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const project = clip.projects as {
      user_id: string;
      original_video_url: string;
      original_video_path: string;
      video_width: number;
      video_height: number;
    };

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Generate a signed URL for the source video (valid 1 hour)
    let sourceVideoUrl = project.original_video_url;
    if (project.original_video_path) {
      const { data: signed } = await supabase.storage
        .from("videos")
        .createSignedUrl(project.original_video_path, 3600);
      if (signed?.signedUrl) {
        sourceVideoUrl = signed.signedUrl;
      }
    }

    // Build export spec
    const exportSpec = buildExportSpec({
      clip,
      sourceVideoUrl,
      sourceWidth: project.video_width ?? 1920,
      sourceHeight: project.video_height ?? 1080,
      aspectRatio: aspect_ratio,
      includeOverlays: include_overlays,
      includeCaptions: include_captions,
      includeColorGrade: include_color_grade,
    });

    // Record the export attempt
    const { data: exportRecord } = await supabase
      .from("clip_exports")
      .insert({
        clip_id,
        user_id: user.id,
        export_format: "mp4",
        aspect_ratio,
        include_overlays,
        include_captions,
        include_color_grade,
        export_status: "pending",
      })
      .select()
      .single();

    // Increment download count
    await supabase
      .from("clips")
      .update({ download_count: (clip.download_count ?? 0) + 1 })
      .eq("id", clip_id);

    return NextResponse.json({
      export_id: exportRecord?.id,
      export_spec: exportSpec,
      source_url: sourceVideoUrl,
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface ExportSpecOptions {
  clip: Record<string, unknown>;
  sourceVideoUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  aspectRatio: string;
  includeOverlays: boolean;
  includeCaptions: boolean;
  includeColorGrade: boolean;
}

interface ExportSpec {
  source_url: string;
  start_time: number;
  end_time: number;
  duration: number;
  output_width: number;
  output_height: number;
  aspect_ratio: string;
  crop: { x: number; y: number; width: number; height: number } | null;
  color_grade: Record<string, number>;
  reframing_keyframes: Array<{
    time: number;
    crop: { x: number; y: number; width: number; height: number };
    zoom: number;
  }>;
  overlays: unknown[];
  captions: unknown[];
  silence_segments: Array<{ start: number; end: number }>;
  audio_normalization: { target_lufs: number; current_lufs: number };
  noise_reduction: boolean;
}

function buildExportSpec(opts: ExportSpecOptions): ExportSpec {
  const {
    clip,
    sourceVideoUrl,
    sourceWidth,
    sourceHeight,
    aspectRatio,
    includeOverlays,
    includeCaptions,
    includeColorGrade,
  } = opts;

  const startTime = Number(clip.start_time ?? 0);
  const endTime = Number(clip.end_time ?? 30);

  // Output dimensions for target aspect ratio
  const OUTPUT_SIZES: Record<string, { w: number; h: number }> = {
    "9:16": { w: 1080, h: 1920 },
    "16:9": { w: 1920, h: 1080 },
    "1:1": { w: 1080, h: 1080 },
    "4:5": { w: 1080, h: 1350 },
  };
  const outputSize = OUTPUT_SIZES[aspectRatio] ?? OUTPUT_SIZES["9:16"];

  // Compute center crop for the target ratio
  const targetAspect = outputSize.w / outputSize.h;
  const sourceAspect = sourceWidth / sourceHeight;

  let cropX = 0, cropY = 0, cropW = sourceWidth, cropH = sourceHeight;
  if (sourceAspect > targetAspect) {
    // Source is wider — crop sides
    cropW = Math.round(sourceHeight * targetAspect);
    cropX = Math.round((sourceWidth - cropW) / 2);
  } else {
    // Source is taller — crop top/bottom
    cropH = Math.round(sourceWidth / targetAspect);
    cropY = Math.round((sourceHeight - cropH) / 2);
  }

  // Extract color grade from overlays
  const colorGrade: Record<string, number> = {};
  if (includeColorGrade) {
    const gradeOverlay = (clip.overlays as Array<Record<string, unknown>> | null)?.find(
      (o) => o.type === "color_grade"
    );
    if (gradeOverlay?.content) {
      for (const [k, v] of Object.entries(gradeOverlay.content as Record<string, string>)) {
        colorGrade[k] = parseFloat(v);
      }
    }
  }

  // Extract reframing keyframes from punch-in markers
  const reframingKeyframes: ExportSpec["reframing_keyframes"] = [];
  const overlayData = (clip.overlays as Array<Record<string, unknown>> | null) ?? [];
  for (const o of overlayData) {
    if (o.type === "punch_in_marker" && o.content) {
      const c = o.content as Record<string, string>;
      reframingKeyframes.push({
        time: Number(o.startTime),
        crop: {
          x: parseFloat(c.cropX ?? "0") * sourceWidth,
          y: parseFloat(c.cropY ?? "0") * sourceHeight,
          width: parseFloat(c.cropW ?? "1") * sourceWidth,
          height: parseFloat(c.cropH ?? "1") * sourceHeight,
        },
        zoom: parseFloat(c.zoomFactor ?? "1"),
      });
    }
  }

  // Filter silence segments (relative to clip start)
  const silenceSegments: Array<{ start: number; end: number }> = [];

  return {
    source_url: sourceVideoUrl,
    start_time: startTime,
    end_time: endTime,
    duration: endTime - startTime,
    output_width: outputSize.w,
    output_height: outputSize.h,
    aspect_ratio: aspectRatio,
    crop:
      cropX !== 0 || cropY !== 0 || cropW !== sourceWidth || cropH !== sourceHeight
        ? { x: cropX, y: cropY, width: cropW, height: cropH }
        : null,
    color_grade: colorGrade,
    reframing_keyframes: reframingKeyframes,
    overlays: includeOverlays
      ? overlayData.filter(
          (o) => !["punch_in_marker", "color_grade", "broll_transition"].includes(String(o.type))
        )
      : [],
    captions: includeCaptions ? (clip.captions as unknown[]) ?? [] : [],
    silence_segments: silenceSegments,
    audio_normalization: {
      target_lufs: -14,
      current_lufs: -18,
    },
    noise_reduction: false,
  };
}
