"use client";

import { useEffect, useState, useCallback } from "react";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { FolderOpen, Upload, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/types";
import toast from "react-hot-toast";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const fetchProjects = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch("/api/projects?limit=50");
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch {
      if (!silent) toast.error("Failed to load projects");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Auto-refresh for processing projects
  useEffect(() => {
    const hasProcessing = projects.some((p) =>
      ["uploading", "queued", "processing"].includes(p.status)
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => fetchProjects(true), 5000);
    return () => clearInterval(interval);
  }, [projects, fetchProjects]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id, force_regenerate: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast.success("Clips regenerated!");
      fetchProjects(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Regeneration failed"
      );
    }
  };

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "completed", label: "Completed" },
    { value: "processing", label: "Processing" },
    { value: "failed", label: "Failed" },
  ];

  const filtered =
    filter === "all"
      ? projects
      : projects.filter((p) => p.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" text="Loading projects..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="text-slate-400 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            loading={refreshing}
            onClick={() => fetchProjects(true)}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Link href="/dashboard/upload">
            <Button
              variant="primary"
              size="sm"
              icon={<Upload className="w-4 h-4" />}
            >
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      {projects.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-xl w-fit">
          {filterOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === value
                  ? "bg-amber-500 text-obsidian-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Projects grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={
            filter === "all"
              ? "No projects yet"
              : `No ${filter} projects`
          }
          description={
            filter === "all"
              ? "Upload your first property video to get started with AI-powered clips."
              : `You don't have any ${filter} projects.`
          }
          action={
            filter === "all" ? (
              <Link href="/dashboard/upload">
                <Button
                  variant="primary"
                  icon={<Upload className="w-4 h-4" />}
                >
                  Upload Video
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDelete}
              onRegenerate={handleRegenerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
