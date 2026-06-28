import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch project stats
    const { data: projects } = await supabase
      .from("projects")
      .select("id, status, video_size_bytes")
      .eq("user_id", user.id);

    const { data: clips } = await supabase
      .from("clips")
      .select("id, download_count")
      .eq("user_id", user.id);

    const totalProjects = projects?.length ?? 0;
    const completedProjects =
      projects?.filter((p) => p.status === "completed").length ?? 0;
    const totalClips = clips?.length ?? 0;
    const totalDownloads =
      clips?.reduce((sum, c) => sum + (c.download_count ?? 0), 0) ?? 0;
    const storageUsedBytes =
      projects?.reduce((sum, p) => sum + (p.video_size_bytes ?? 0), 0) ?? 0;
    const storageUsedMB = Math.round(storageUsedBytes / (1024 * 1024));

    return NextResponse.json({
      stats: {
        total_projects: totalProjects,
        completed_projects: completedProjects,
        total_clips: totalClips,
        total_downloads: totalDownloads,
        storage_used_mb: storageUsedMB,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
