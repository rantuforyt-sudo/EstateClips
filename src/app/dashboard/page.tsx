import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  FolderOpen,
  CheckCircle2,
  Video,
  Download,
  Upload,
  ArrowRight,
  Zap,
  Clock,
} from "lucide-react";

async function getDashboardData(userId: string) {
  const supabase = await createClient();

  const [projectsResult, clipsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, status, video_size_bytes, created_at, title, content_type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("clips")
      .select("id, download_count")
      .eq("user_id", userId),
  ]);

  const projects = projectsResult.data ?? [];
  const clips = clipsResult.data ?? [];

  return {
    recent: projects,
    stats: {
      total_projects: projects.length,
      completed_projects: projects.filter((p) => p.status === "completed")
        .length,
      total_clips: clips.length,
      total_downloads: clips.reduce(
        (sum, c) => sum + (c.download_count ?? 0),
        0
      ),
    },
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { recent, stats } = await getDashboardData(user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, agent_name")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.agent_name || profile?.full_name || user.email?.split("@")[0];

  const statsCards = [
    {
      label: "Total Projects",
      value: stats.total_projects,
      icon: FolderOpen,
      color: "amber",
    },
    {
      label: "Completed",
      value: stats.completed_projects,
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      label: "Clips Generated",
      value: stats.total_clips,
      icon: Video,
      color: "blue",
    },
    {
      label: "Downloads",
      value: stats.total_downloads,
      icon: Download,
      color: "indigo",
    },
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 17
              ? "afternoon"
              : "evening"}
            {displayName ? `, ${displayName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Your AI-powered real estate video studio
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="flex-shrink-0 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-obsidian-300 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
        >
          <Upload className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                color === "amber"
                  ? "bg-amber-500/15 text-amber-400"
                  : color === "emerald"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : color === "blue"
                  ? "bg-blue-500/15 text-blue-400"
                  : "bg-indigo-500/15 text-indigo-400"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {stats.total_projects === 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            Create your first project
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            Upload a property video and let AI generate compelling clips,
            captions, and room labels automatically.
          </p>
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-obsidian-300 font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            <Upload className="w-4 h-4" />
            Upload Your First Video
          </Link>
        </div>
      )}

      {/* Recent Projects */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Projects</h2>
            <Link
              href="/dashboard/projects"
              className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recent.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="flex items-center gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                  <Video className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 text-sm truncate">
                    {project.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(project.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      project.status === "completed"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : project.status === "failed"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {project.status.charAt(0).toUpperCase() +
                      project.status.slice(1)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
