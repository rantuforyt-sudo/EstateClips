import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabase
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
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching projects:", error);
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 }
      );
    }

    return NextResponse.json({ projects: data, total: data?.length ?? 0 });
  } catch (error) {
    console.error("Unexpected error in GET /api/projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
    const { title, original_video_path, original_video_url, video_metadata } =
      body;

    if (!title || !original_video_path) {
      return NextResponse.json(
        { error: "Title and video path are required" },
        { status: 400 }
      );
    }

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title,
        status: "queued",
        content_type: "unknown",
        original_video_path,
        original_video_url,
        video_duration: video_metadata?.duration ?? null,
        video_width: video_metadata?.width ?? null,
        video_height: video_metadata?.height ?? null,
        video_size_bytes: video_metadata?.fileSize ?? null,
        processing_progress: 0,
        processing_step: "queued",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
