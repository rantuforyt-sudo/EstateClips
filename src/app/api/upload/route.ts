import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

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

    const formData = await request.formData();
    const file = formData.get("video") as File | null;
    const title = formData.get("title") as string | null;
    const durationStr = formData.get("duration") as string | null;
    const widthStr = formData.get("width") as string | null;
    const heightStr = formData.get("height") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Project title is required" }, { status: 400 });
    }

    // Validate file size (500MB max)
    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 500MB." },
        { status: 400 }
      );
    }

    // Generate unique path
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const videoId = uuidv4();
    const storagePath = `${user.id}/${videoId}.${fileExt}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(storagePath, buffer, {
        contentType: file.type || "video/mp4",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL (signed for private bucket)
    const { data: signedUrl } = await supabase.storage
      .from("videos")
      .createSignedUrl(storagePath, 60 * 60 * 24); // 24 hours

    // Create project record
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title,
        status: "queued",
        content_type: "unknown",
        original_video_path: storagePath,
        original_video_url: signedUrl?.signedUrl ?? null,
        video_duration: durationStr ? parseFloat(durationStr) : null,
        video_width: widthStr ? parseInt(widthStr) : null,
        video_height: heightStr ? parseInt(heightStr) : null,
        video_size_bytes: file.size,
        processing_progress: 0,
        processing_step: "queued",
      })
      .select()
      .single();

    if (projectError) {
      console.error("Error creating project:", projectError);
      // Clean up uploaded file
      await supabase.storage.from("videos").remove([storagePath]);
      return NextResponse.json(
        { error: "Failed to create project record" },
        { status: 500 }
      );
    }

    return NextResponse.json({ project, videoPath: storagePath }, { status: 201 });
  } catch (error) {
    console.error("Unexpected upload error:", error);
    return NextResponse.json(
      { error: "Internal server error during upload" },
      { status: 500 }
    );
  }
}
