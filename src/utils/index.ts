import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ContentType, ProjectStatus, ClipStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getContentTypeLabel(type: ContentType): string {
  const labels: Record<ContentType, string> = {
    property_tour: "Property Tour",
    luxury_listing: "Luxury Listing",
    open_house: "Open House",
    market_update: "Market Update",
    neighborhood_tour: "Neighborhood Tour",
    talking_head: "Agent Reel",
    listing_walkthrough: "Listing Walkthrough",
    unknown: "Real Estate Video",
  };
  return labels[type] ?? "Real Estate Video";
}

export function getContentTypeColor(type: ContentType): string {
  const colors: Record<ContentType, string> = {
    luxury_listing: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    property_tour: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    open_house: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    market_update: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    neighborhood_tour: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    talking_head: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    listing_walkthrough: "text-teal-400 bg-teal-400/10 border-teal-400/20",
    unknown: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  };
  return colors[type] ?? colors.unknown;
}

export function getStatusColor(status: ProjectStatus | ClipStatus): string {
  const colors: Record<string, string> = {
    uploading: "text-blue-400 bg-blue-400/10",
    queued: "text-yellow-400 bg-yellow-400/10",
    processing: "text-amber-400 bg-amber-400/10",
    completed: "text-emerald-400 bg-emerald-400/10",
    failed: "text-red-400 bg-red-400/10",
  };
  return colors[status] ?? "text-slate-400 bg-slate-400/10";
}

export function getStatusLabel(status: ProjectStatus | ClipStatus): string {
  const labels: Record<string, string> = {
    uploading: "Uploading",
    queued: "Queued",
    processing: "Processing",
    completed: "Ready",
    failed: "Failed",
  };
  return labels[status] ?? status;
}

export function getProcessingStepLabel(step: string | null): string {
  if (!step) return "Initializing...";

  const labels: Record<string, string> = {
    validating: "Validating video...",
    extracting_audio: "Extracting audio...",
    transcribing: "Transcribing speech...",
    analyzing_scenes: "Analyzing scenes...",
    running_vision: "Running computer vision...",
    detecting_rooms: "Detecting rooms & features...",
    detecting_content: "Detecting content type...",
    finding_highlights: "Finding best moments...",
    scoring_clips: "Scoring & ranking clips...",
    generating_captions: "Generating captions...",
    building_overlays: "Building motion graphics...",
    creating_clips: "Creating clips...",
    exporting: "Exporting final clips...",
    completed: "Complete!",
    failed: "Processing failed",
  };

  return labels[step] ?? step;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function generateProjectTitle(filename: string): string {
  // Remove extension
  let title = filename.replace(/\.[^/.]+$/, "");

  // Replace underscores and hyphens with spaces
  title = title.replace(/[_-]/g, " ");

  // Capitalize words
  title = title
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return title || "Untitled Project";
}

export function bytesToMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
