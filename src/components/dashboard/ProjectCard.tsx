"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Film,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Download,
  ChevronRight,
  Video,
} from "lucide-react";
import type { Project } from "@/types";
import {
  getContentTypeLabel,
  getContentTypeColor,
  formatRelativeTime,
  formatTimestamp,
} from "@/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getProcessingStepLabel } from "@/utils";
import { cn } from "@/utils";

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
}

const statusIcons = {
  uploading: Loader2,
  queued: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: AlertCircle,
};

const statusColors = {
  uploading: "info",
  queued: "warning",
  processing: "warning",
  completed: "success",
  failed: "danger",
} as const;

export function ProjectCard({
  project,
  onDelete,
  onRegenerate,
}: ProjectCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const StatusIcon = statusIcons[project.status];
  const isProcessing = ["uploading", "queued", "processing"].includes(
    project.status
  );
  const clipCount = project.clips?.length ?? 0;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Delete this project and all its clips? This cannot be undone.")) return;
    setDeleting(true);
    await onDelete(project.id);
    setDeleting(false);
  };

  const handleRegenerate = async (e: React.MouseEvent) => {
    e.preventDefault();
    setRegenerating(true);
    await onRegenerate(project.id);
    setRegenerating(false);
  };

  return (
    <div
      className={cn(
        "group relative bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden",
        "hover:border-slate-700 transition-all duration-200",
        project.status === "failed" && "border-red-500/20"
      )}
    >
      {/* Status bar */}
      {isProcessing && (
        <div className="absolute top-0 left-0 right-0 h-0.5">
          <div
            className="h-full bg-amber-500 transition-all duration-1000"
            style={{ width: `${project.processing_progress}%` }}
          />
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <Film className="w-5 h-5 text-slate-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-200 text-sm leading-tight truncate">
                {project.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatRelativeTime(project.created_at)}
              </p>
            </div>
          </div>

          <Badge variant={statusColors[project.status]}>
            <StatusIcon
              className={cn(
                "w-3 h-3",
                isProcessing && "animate-spin"
              )}
            />
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </Badge>
        </div>

        {/* Content type */}
        <div className="mb-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium",
              getContentTypeColor(project.content_type)
            )}
          >
            <Video className="w-3 h-3" />
            {getContentTypeLabel(project.content_type)}
          </span>
        </div>

        {/* Processing state */}
        {isProcessing && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {getProcessingStepLabel(project.processing_step)}
              </span>
              <span className="text-amber-400 font-medium">
                {project.processing_progress}%
              </span>
            </div>
            <ProgressBar value={project.processing_progress} size="sm" />
          </div>
        )}

        {/* Error state */}
        {project.status === "failed" && project.error_message && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{project.error_message}</p>
          </div>
        )}

        {/* Stats */}
        {project.status === "completed" && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-lg font-bold text-amber-400">{clipCount}</p>
              <p className="text-xs text-slate-500">
                {clipCount === 1 ? "Clip" : "Clips"}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-lg font-bold text-slate-300">
                {project.video_duration
                  ? formatTimestamp(project.video_duration)
                  : "—"}
              </p>
              <p className="text-xs text-slate-500">Duration</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto">
          {project.status === "completed" && (
            <Link href={`/dashboard/projects/${project.id}`} className="flex-1">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                icon={<Download className="w-3.5 h-3.5" />}
              >
                View Clips
              </Button>
            </Link>
          )}

          {project.status === "failed" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              loading={regenerating}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={handleRegenerate}
            >
              Retry
            </Button>
          )}

          {project.status === "completed" && (
            <Button
              variant="ghost"
              size="sm"
              loading={regenerating}
              onClick={handleRegenerate}
              title="Regenerate clips"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}

          {project.status !== "processing" && (
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}

          {project.status === "completed" && (
            <Link href={`/dashboard/projects/${project.id}`}>
              <Button variant="ghost" size="sm">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
