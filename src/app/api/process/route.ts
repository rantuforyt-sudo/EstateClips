import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeVideoWithGemini,
  cleanTranscriptSegments,
  getContentTemplate,
} from "@/lib/ai-pipeline";
import {
  optimizeClipBoundaries,
} from "@/lib/video-processing";
import { scoreAndRankClips } from "@/lib/clip-scorer";
import type { ClipSignals } from "@/lib/clip-scorer";
import { generateAdvancedOverlays, generateEnhancedCaptions } from "@/lib/overlay-generator";
import type { TranscriptSegment } from "@/types";

// Helper to update project progress
async function updateProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  progress: number,
  step: string,
  extraFields?: Record<string, unknown>
) {
  await supabase
    .from("projects")
    .update({
      processing_progress: progress,
      processing_step: step,
      status: step === "completed" ? "completed" : step === "failed" ? "failed" : "processing",
      ...extraFields,
    })
    .eq("id", projectId);
}

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
    const { project_id, transcript_text, force_regenerate } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: "project_id is required" },
        { status: 400 }
      );
    }

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Don't reprocess unless forced
    if (project.status === "processing" && !force_regenerate) {
      return NextResponse.json(
        { error: "Project is already processing" },
        { status: 409 }
      );
    }

    // If regenerating, delete existing clips
    if (force_regenerate) {
      const { data: existingClips } = await supabase
        .from("clips")
        .select("clip_path, thumbnail_path")
        .eq("project_id", project_id);

      if (existingClips && existingClips.length > 0) {
        const clipPaths = existingClips
          .filter((c: { clip_path: string | null }) => c.clip_path)
          .map((c: { clip_path: string | null }) => c.clip_path as string);
        if (clipPaths.length > 0) {
          await supabase.storage.from("clips").remove(clipPaths);
        }
      }

      await supabase.from("clips").delete().eq("project_id", project_id);
    }

    // Step 1: Validate
    await updateProgress(supabase, project_id, 5, "validating");

    if (!project.original_video_path) {
      await updateProgress(supabase, project_id, 0, "failed", {
        error_message: "No video file found for this project",
      });
      return NextResponse.json({ error: "No video file" }, { status: 400 });
    }

    // Step 2: Parse transcript (provided by client or empty)
    await updateProgress(supabase, project_id, 15, "transcribing");

    let segments: TranscriptSegment[] = [];

    if (transcript_text && typeof transcript_text === "string" && transcript_text.trim()) {
      // Simple paragraph-based transcript segmentation
      const paragraphs = transcript_text
        .split(/[.!?]+/)
        .filter((p) => p.trim().length > 10);

      const totalDuration = project.video_duration ?? 60;
      const segDuration = totalDuration / Math.max(paragraphs.length, 1);

      segments = paragraphs.map((text, i) => ({
        start: i * segDuration,
        end: (i + 1) * segDuration,
        text: text.trim(),
        cleaned_text: text.trim(),
        confidence: 0.8,
      }));
    } else if (project.transcript && Array.isArray(project.transcript)) {
      segments = project.transcript as TranscriptSegment[];
    }

    // Clean transcript segments
    const cleanedSegments = cleanTranscriptSegments(segments);

    await updateProgress(supabase, project_id, 30, "analyzing_scenes", {
      transcript: cleanedSegments,
    });

    // Step 3: AI Analysis with Gemini + Computer Vision
    await updateProgress(supabase, project_id, 40, "detecting_content");

    const videoDuration = project.video_duration ?? 60;
    const filename = project.original_video_path.split("/").pop() ?? "video.mp4";

    // Get a signed URL for vision analysis
    let videoUrlForVision: string | undefined;
    if (project.original_video_path) {
      try {
        const { data: signedData } = await supabase.storage
          .from("videos")
          .createSignedUrl(project.original_video_path, 900); // 15 min
        videoUrlForVision = signedData?.signedUrl;
      } catch {
        // Vision will be skipped gracefully
      }
    }

    await updateProgress(supabase, project_id, 45, "running_vision");

    const aiResult = await analyzeVideoWithGemini(
      cleanedSegments,
      videoDuration,
      filename,
      videoUrlForVision
    );

    await updateProgress(supabase, project_id, 58, "finding_highlights", {
      content_type: aiResult.content_type,
      property_details: aiResult.property_details,
      scene_analysis: {
        detected_rooms: aiResult.detected_rooms,
        detected_features: aiResult.property_details?.features ?? [],
        overall_quality: aiResult.vision_result?.productionQuality ?? 0.8,
        scenes: [],
        vision_result: aiResult.vision_result,
      },
    });

    // Step 4: Score and rank clips using vision + transcript signals
    await updateProgress(supabase, project_id, 65, "scoring_clips");

    const template = getContentTemplate(aiResult.content_type);

    // Use vision-powered scoring if vision result is available
    const rankedHighlights = aiResult.vision_result
      ? scoreAndRankClips(aiResult.highlights, aiResult.vision_result, cleanedSegments)
      : aiResult.highlights.sort((a, b) => b.score - a.score);

    if (rankedHighlights.length === 0) {
      await updateProgress(supabase, project_id, 0, "failed", {
        error_message:
          "Could not detect any highlights in the video. Please try with a longer or clearer video.",
      });
      return NextResponse.json(
        { error: "No highlights detected" },
        { status: 422 }
      );
    }

    // Step 5: Generate captions and overlays
    await updateProgress(supabase, project_id, 72, "generating_captions");

    // Fetch agent profile for lower-thirds
    const { data: profile } = await supabase
      .from("profiles")
      .select("agent_name, brokerage")
      .eq("id", user.id)
      .single();

    await updateProgress(supabase, project_id, 78, "building_overlays");

    const clipRecords = rankedHighlights.map((highlight, index) => {
      const optimized = optimizeClipBoundaries(
        highlight.start,
        highlight.end,
        cleanedSegments
      );

      // Get frames for this clip window (for caption placement)
      const framesInClip = aiResult.vision_result?.frames.filter(
        (f) => f.timestamp >= optimized.start && f.timestamp <= optimized.end
      ) ?? [];

      // Enhanced captions with face-safe placement and keyword emphasis
      const captions = generateEnhancedCaptions(
        cleanedSegments,
        optimized.start,
        optimized.end,
        aiResult.caption_improvements,
        template,
        framesInClip
      );

      // Advanced overlays: hook text, lower-thirds, price, rooms, features
      const overlays = aiResult.vision_result
        ? generateAdvancedOverlays(
            {
              ...highlight,
              start: optimized.start,
              end: optimized.end,
              compositeScore: (highlight as { compositeScore?: number }).compositeScore ?? highlight.score,
              signals: (highlight as { signals?: ClipSignals }).signals ?? {
                transcriptScore: highlight.score,
                visualQualityScore: 0.7,
                faceScore: 0.5,
                roomScore: 0.5,
                productionScore: 0.7,
                speechDensityScore: 0.7,
                boundaryAlignmentScore: 0,
                premiumRoomBonus: 0,
              } as ClipSignals,
            },
            aiResult,
            aiResult.vision_result,
            profile?.agent_name ?? undefined,
            profile?.brokerage ?? undefined
          )
        : generateLegacyOverlays(aiResult, optimized.start, optimized.end);

      const finalScore =
        "compositeScore" in highlight
          ? (highlight as { compositeScore: number }).compositeScore
          : highlight.score;

      return {
        project_id,
        user_id: user.id,
        title: highlight.suggested_title || `${getContentTypeLabel(aiResult.content_type)} Clip ${index + 1}`,
        description: highlight.reason || "",
        clip_url: null,
        clip_path: null,
        thumbnail_url: null,
        duration: optimized.end - optimized.start,
        start_time: optimized.start,
        end_time: optimized.end,
        clip_type: aiResult.content_type,
        captions,
        overlays,
        highlight_score: finalScore ?? 0.7,
        status: "completed",
        download_count: 0,
      };
    });

    // Step 6: Persist clips
    await updateProgress(supabase, project_id, 88, "creating_clips");

    const { data: insertedClips, error: clipsError } = await supabase
      .from("clips")
      .insert(clipRecords)
      .select();

    if (clipsError) {
      console.error("Error inserting clips:", clipsError);
      await updateProgress(supabase, project_id, 0, "failed", {
        error_message: "Failed to save clip data",
      });
      return NextResponse.json(
        { error: "Failed to save clips" },
        { status: 500 }
      );
    }

    // Step 6: Mark project as complete
    await updateProgress(supabase, project_id, 100, "completed", {
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      clips: insertedClips,
      content_type: aiResult.content_type,
      property_details: aiResult.property_details,
      detected_rooms: aiResult.detected_rooms,
      production_quality: aiResult.vision_result?.productionQuality ?? null,
      vision_enabled: !!aiResult.vision_result,
    });
  } catch (error) {
    console.error("Processing error:", error);

    // Try to mark project as failed
    try {
      const body = await request.json().catch(() => ({}));
      if (body.project_id) {
        const supabase = await createClient();
        await supabase
          .from("projects")
          .update({
            status: "failed",
            processing_step: "failed",
            error_message:
              error instanceof Error ? error.message : "Unexpected error",
          })
          .eq("id", body.project_id);
      }
    } catch {}

    return NextResponse.json(
      {
        error: "Processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function getContentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    property_tour: "Property Tour",
    luxury_listing: "Luxury Listing",
    open_house: "Open House",
    market_update: "Market Update",
    neighborhood_tour: "Neighborhood Tour",
    talking_head: "Agent Reel",
    listing_walkthrough: "Listing Walkthrough",
    unknown: "Real Estate",
  };
  return labels[type] ?? "Real Estate";
}

/**
 * Legacy overlay generator — used as fallback when vision analysis is unavailable.
 * The primary path uses generateAdvancedOverlays from overlay-generator.ts.
 */
function generateLegacyOverlays(
  aiResult: Awaited<ReturnType<typeof analyzeVideoWithGemini>>,
  startTime: number,
  endTime: number
): Record<string, unknown>[] {
  const overlays: Record<string, unknown>[] = [];
  const { content_type, property_details, detected_rooms } = aiResult;
  const clipDuration = endTime - startTime;

  // Hook text
  overlays.push({
    type: "hook_text",
    content: { text: property_details?.address ? `Welcome to ${property_details.address}` : "Welcome" },
    position: { x: 0.5, y: 0.35 },
    startTime: 0,
    endTime: Math.min(3.5, clipDuration),
    animation: "scale_in",
    animDuration: 0.4,
    style: "hook_hero",
    zIndex: 50,
  });

  if (content_type === "open_house" && property_details) {
    const content: Record<string, string> = {};
    if (property_details.address) content.address = property_details.address;
    if (property_details.open_house_date) content.date = property_details.open_house_date;
    if (property_details.open_house_time) content.time = property_details.open_house_time;
    if (property_details.agent_name) content.agent = property_details.agent_name;
    if (property_details.brokerage) content.brokerage = property_details.brokerage;
    if (Object.keys(content).length > 0) {
      overlays.push({
        type: "open_house_info",
        content,
        position: { x: 0.5, y: 0.1 },
        startTime: 0,
        endTime: Math.min(5, clipDuration),
        animation: "slide_down",
        animDuration: 0.4,
        style: "open_house_banner",
        zIndex: 45,
      });
    }
  }

  if (property_details?.price) {
    overlays.push({
      type: "price_badge",
      content: { price: property_details.price, label: "Listed at" },
      position: { x: 0.85, y: 0.12 },
      startTime: 0,
      endTime: Math.min(6, clipDuration),
      animation: "fade_in",
      animDuration: 0.5,
      style: "price_badge",
      zIndex: 35,
    });
  }

  if (property_details?.agent_name) {
    overlays.push({
      type: "lower_third",
      content: { name: property_details.agent_name, brokerage: property_details.brokerage ?? "" },
      position: { x: 0.5, y: 0.88 },
      startTime: 4,
      endTime: Math.min(8, clipDuration),
      animation: "slide_up",
      animDuration: 0.35,
      style: "lower_third_standard",
      zIndex: 40,
    });
  }

  if (detected_rooms?.length > 0) {
    for (const room of detected_rooms) {
      const rel = room.timestamp - startTime;
      if (rel >= 0 && rel < clipDuration) {
        overlays.push({
          type: "room_label",
          content: { room: room.name },
          position: { x: 0.1, y: 0.1 },
          startTime: rel,
          endTime: rel + 3,
          animation: "slide_down",
          animDuration: 0.3,
          style: "room_label",
          zIndex: 30,
        });
      }
    }
  }

  return overlays;
}

