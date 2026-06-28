import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: project, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        clips(
          id, title, description, clip_url, thumbnail_url,
          duration, start_time, end_time, highlight_score,
          download_count, status, captions, overlays, clip_type,
          created_at
        )
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Error in GET /api/projects/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Only allow updating safe fields
    const allowedFields = [
      "title",
      "status",
      "content_type",
      "transcript",
      "scene_analysis",
      "property_details",
      "processing_progress",
      "processing_step",
      "error_message",
      "original_video_url",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: project, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: "Failed to update project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Error in PATCH /api/projects/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get project first to clean up storage
    const { data: project } = await supabase
      .from("projects")
      .select("original_video_path, clips(clip_path, thumbnail_path)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (project) {
      // Delete video from storage
      if (project.original_video_path) {
        await supabase.storage
          .from("videos")
          .remove([project.original_video_path]);
      }

      // Delete clip files from storage
      const clips = project.clips as Array<{
        clip_path: string;
        thumbnail_path: string;
      }>;
      if (clips && clips.length > 0) {
        const clipPaths = clips
          .filter((c) => c.clip_path)
          .map((c) => c.clip_path);
        const thumbPaths = clips
          .filter((c) => c.thumbnail_path)
          .map((c) => c.thumbnail_path);

        if (clipPaths.length > 0) {
          await supabase.storage.from("clips").remove(clipPaths);
        }
        if (thumbPaths.length > 0) {
          await supabase.storage.from("clips").remove(thumbPaths);
        }
      }
    }

    // Delete project (clips cascade via FK)
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/projects/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
