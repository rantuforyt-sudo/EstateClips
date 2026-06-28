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

    const { data: clip, error } = await supabase
      .from("clips")
      .select("*, projects!inner(user_id)")
      .eq("id", id)
      .single();

    if (error || !clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    // Verify ownership
    const project = clip.projects as { user_id: string };
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Increment download count
    await supabase
      .from("clips")
      .update({ download_count: (clip.download_count ?? 0) + 1 })
      .eq("id", id);

    // If clip has a stored file, generate signed URL
    if (clip.clip_path) {
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from("clips")
        .createSignedUrl(clip.clip_path, 60 * 60); // 1 hour

      if (!urlError && signedUrl) {
        return NextResponse.json({ download_url: signedUrl.signedUrl, clip });
      }
    }

    // If no file stored yet, return the source video with timestamps
    if (clip.clip_url) {
      return NextResponse.json({ download_url: clip.clip_url, clip });
    }

    // Return clip metadata for client-side export
    return NextResponse.json({
      clip,
      message: "Use the export feature to generate a downloadable clip file",
    });
  } catch (error) {
    console.error("Download error:", error);
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

    const { data: clip } = await supabase
      .from("clips")
      .select("*, projects!inner(user_id)")
      .eq("id", id)
      .single();

    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const project = clip.projects as { user_id: string };
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Remove from storage
    if (clip.clip_path) {
      await supabase.storage.from("clips").remove([clip.clip_path]);
    }
    if (clip.thumbnail_path) {
      await supabase.storage.from("clips").remove([clip.thumbnail_path]);
    }

    const { error: deleteError } = await supabase
      .from("clips")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete clip" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete clip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
