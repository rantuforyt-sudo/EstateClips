"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ClipCard } from "@/components/clips/ClipCard";
import { VisionInsightsPanel } from "@/components/clips/VisionInsightsPanel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Video,
  Clock,
  Film,
  AlertCircle,
  Home,
  MapPin,
  User,
  Calendar,
  Zap,
  Star,
} from "lucide-react";
import type { Project, Clip, DetectedRoom, SceneAnalysis } from "@/types";
import {
  getContentTypeLabel,
  getContentTypeColor,
  getProcessingStepLabel,
  formatTimestamp,
  cn,
} from "@/utils";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

const ROOM_ICONS: Record<string, string> = {
  Kitchen: "🍳",
  "Living Room": "🛋️",
  Backyard: "🌿",
  Pool: "🏊",
  Garage: "🚗",
  "Master Bedroom": "✨",
  "Master Suite": "✨",
  Office: "💻",
  "Home Office": "💻",
  Bathroom: "🚿",
  Dining: "🍽️",
  "Dining Room": "🍽️",
  Bedroom: "🛏️",
  Balcony: "🌅",
  Patio: "☀️",
  Exterior: "🏠",
  "Front Elevation": "🏡",
  Garden: "🌺",
  "Walk-in Closet": "👗",
  Closet: "👗",
  Staircase: "🪜",
  Fireplace: "🔥",
  Entryway: "🚪",
  Hallway: "🔲",
  "Laundry Room": "🧺",
  Driveway: "🛣️",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          if (res.status === 404) {
            router.push("/dashboard/projects");
            return;
          }
          throw new Error("Failed to load project");
        }
        const data = await res.json();
        setProject(data.project);

        // Get signed video URL
        if (data.project.original_video_path && !videoUrl) {
          const supabase = createClient();
          const { data: signed } = await supabase.storage
            .from("videos")
            .createSignedUrl(data.project.original_video_path, 60 * 60 * 2);
          if (signed?.signedUrl) setVideoUrl(signed.signedUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [projectId, router, videoUrl]
  );

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Auto-refresh while processing
  useEffect(() => {
    if (!project) return;
    if (!["uploading", "queued", "processing"].includes(project.status)) return;

    const interval = setInterval(() => fetchProject(true), 4000);
    return () => clearInterval(interval);
  }, [project, fetchProject]);

  const handleDelete = async () => {
    if (
      !confirm(
        "Delete this project and all its clips? This cannot be undone."
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Project deleted");
      router.push("/dashboard/projects");
    } catch {
      toast.error("Failed to delete project");
      setDeleting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm("Regenerate all clips? Existing clips will be deleted."))
      return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          force_regenerate: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Regeneration failed");
      }
      toast.success("Clips regenerated!");
      fetchProject(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    try {
      const res = await fetch(`/api/clips/${clipId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setProject((prev) =>
        prev
          ? {
              ...prev,
              clips: prev.clips?.filter((c) => c.id !== clipId),
            }
          : null
      );
      toast.success("Clip deleted");
    } catch {
      toast.error("Failed to delete clip");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" text="Loading project..." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-400">{error || "Project not found"}</p>
        <Link href="/dashboard/projects">
          <Button variant="secondary">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const isProcessing = ["uploading", "queued", "processing"].includes(
    project.status
  );
  const clips = (project.clips ?? []) as Clip[];

  // Sort clips by composite_score (best-first) if available
  const sortedClips = [...clips].sort((a, b) => {
    const scoreA = (a as Clip & { composite_score?: number }).composite_score ?? a.highlight_score;
    const scoreB = (b as Clip & { composite_score?: number }).composite_score ?? b.highlight_score;
    return scoreB - scoreA;
  });

  const propertyDetails = project.property_details ?? {};
  const sceneAnalysis = project.scene_analysis as SceneAnalysis | null;
  const detectedRooms = sceneAnalysis?.detected_rooms ?? [];
  const productionQuality = (project as Project & { production_quality?: number }).production_quality;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Back nav */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All Projects
      </Link>

      {/* Project header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <Film className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{project.title}</h1>
              <div className="flex items-center flex-wrap gap-2 mt-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium",
                    getContentTypeColor(project.content_type)
                  )}
                >
                  <Video className="w-3 h-3" />
                  {getContentTypeLabel(project.content_type)}
                </span>
                <Badge
                  variant={
                    project.status === "completed"
                      ? "success"
                      : project.status === "failed"
                      ? "danger"
                      : "warning"
                  }
                >
                  {project.status.charAt(0).toUpperCase() +
                    project.status.slice(1)}
                </Badge>
                {project.video_duration && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(project.video_duration)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {project.status === "completed" && (
              <Button
                variant="outline"
                size="sm"
                loading={regenerating}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={handleRegenerate}
              >
                Regenerate
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleDelete}
              disabled={isProcessing}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Processing state */}
        {isProcessing && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-amber-400">
                <Zap className="w-4 h-4 animate-pulse" />
                {getProcessingStepLabel(project.processing_step)}
              </div>
              <span className="text-amber-400 font-semibold">
                {project.processing_progress}%
              </span>
            </div>
            <ProgressBar value={project.processing_progress ?? 0} />
            <p className="text-xs text-slate-500">
              This usually takes 30–120 seconds depending on video length.
            </p>
          </div>
        )}

        {/* Failed state */}
        {project.status === "failed" && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400">
                  Processing failed
                </p>
                {project.error_message && (
                  <p className="text-xs text-red-400/70 mt-1">
                    {project.error_message}
                  </p>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-3"
                  loading={regenerating}
                  onClick={handleRegenerate}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Property Details, Room Detection & Vision Insights */}
      {project.status === "completed" && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Property details */}
          {Object.keys(propertyDetails).length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-400" />
                Detected Property Info
              </h3>
              <div className="space-y-2.5">
                {(propertyDetails as Record<string, string | number | string[]>).address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-slate-300">
                      {String((propertyDetails as Record<string, unknown>).address)}
                    </span>
                  </div>
                )}
                {(propertyDetails as Record<string, unknown>).price && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-16">Price</span>
                    <span className="text-xs text-amber-400 font-medium">
                      {String((propertyDetails as Record<string, unknown>).price)}
                    </span>
                  </div>
                )}
                {(propertyDetails as Record<string, unknown>).agent_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-xs text-slate-300">
                      {String((propertyDetails as Record<string, unknown>).agent_name)}
                      {(propertyDetails as Record<string, unknown>).brokerage && (
                        <span className="text-slate-500">
                          {" "}
                          · {String((propertyDetails as Record<string, unknown>).brokerage)}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {(propertyDetails as Record<string, unknown>).open_house_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-xs text-slate-300">
                      Open House:{" "}
                      {String((propertyDetails as Record<string, unknown>).open_house_date)}
                      {(propertyDetails as Record<string, unknown>).open_house_time && (
                        <> at {String((propertyDetails as Record<string, unknown>).open_house_time)}</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vision insights panel */}
          <VisionInsightsPanel
            sceneAnalysis={sceneAnalysis}
            productionQuality={productionQuality}
          />
        </div>
      )}

      {/* Clips grid */}
      {sortedClips.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">
              Generated Clips{" "}
              <span className="text-slate-500 text-base font-normal">
                ({sortedClips.length})
              </span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Sorted best-first by AI score
            </div>
          </div>

          {videoUrl ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedClips.map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  videoUrl={videoUrl}
                  onDelete={handleDeleteClip}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner text="Loading video player..." />
            </div>
          )}
        </div>
      )}

      {/* No clips yet (completed but empty) */}
      {project.status === "completed" && sortedClips.length === 0 && (
        <div className="text-center py-12 border border-slate-800 rounded-2xl">
          <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            No clips were generated. Try regenerating.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={handleRegenerate}
            loading={regenerating}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Regenerate Clips
          </Button>
        </div>
      )}
    </div>
  );
}
