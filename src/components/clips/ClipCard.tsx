"use client";

import { useState, useRef } from "react";
import {
  Play,
  Pause,
  Star,
  Clock,
  Trash2,
  Video,
  Captions,
  Layers,
} from "lucide-react";
import type { Clip } from "@/types";
import { cn, formatTimestamp, getContentTypeLabel, getContentTypeColor } from "@/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { OverlayRenderer } from "./OverlayRenderer";
import { ExportPanel } from "./ExportPanel";

interface ClipCardProps {
  clip: Clip;
  videoUrl: string;
  onDelete?: (clipId: string) => void;
}

export function ClipCard({ clip, videoUrl, onDelete }: ClipCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  const duration = clip.end_time - clip.start_time;

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
    } else {
      // Seek to clip start then play
      video.currentTime = clip.start_time;
      video.play().catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const relTime = video.currentTime - clip.start_time;
    setCurrentTime(relTime);

    // Stop at clip end
    if (video.currentTime >= clip.end_time) {
      video.pause();
      video.currentTime = clip.start_time;
    }
  };

  const handleVideoPlay = () => setPlaying(true);
  const handleVideoPause = () => setPlaying(false);

  // Get current caption
  const currentCaption = showCaptions
    ? clip.captions?.find(
        (c) => currentTime >= c.start && currentTime <= c.end
      )
    : null;

  const scoreColor =
    clip.highlight_score >= 0.8
      ? "text-amber-400"
      : clip.highlight_score >= 0.6
      ? "text-emerald-400"
      : "text-slate-400";

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-200">
      {/* Video Preview */}
      <div className="relative aspect-video bg-slate-950 group">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          preload="metadata"
          playsInline
          muted={false}
        />

        {/* Caption Overlay */}
        {currentCaption && (
          <div
            className="absolute left-2 right-2 bottom-10 text-center"
            style={{ bottom: currentCaption.position === "top" ? "auto" : "40px", top: currentCaption.position === "top" ? "10px" : "auto" }}
          >
            <span
              className="inline-block px-3 py-1.5 rounded-lg text-sm font-medium leading-snug"
              style={{
                backgroundColor: currentCaption.style.backgroundColor,
                color: currentCaption.style.color,
                fontSize:
                  currentCaption.style.fontSize === "lg"
                    ? "1rem"
                    : currentCaption.style.fontSize === "sm"
                    ? "0.75rem"
                    : "0.875rem",
                fontWeight:
                  currentCaption.style.fontWeight === "bold" ? 700 : 400,
              }}
            >
              {currentCaption.text.split("\n").map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </span>
          </div>
        )}

        {/* Advanced overlay renderer */}
        {showOverlays && clip.overlays && clip.overlays.length > 0 && (
          <OverlayRenderer
            overlays={clip.overlays as Parameters<typeof OverlayRenderer>[0]["overlays"]}
            currentTime={currentTime}
          />
        )}

        {/* Play Button Overlay */}
        <button
          onClick={handlePlayPause}
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-200",
            playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          )}
        >
          <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            {playing ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" />
            )}
          </div>
        </button>

        {/* Duration badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 rounded-lg bg-black/70 text-white text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimestamp(duration)}
          </span>
        </div>

        {/* Highlight score */}
        <div className="absolute top-2 right-2">
          <span
            className={cn(
              "px-2 py-1 rounded-lg bg-black/70 text-xs font-medium flex items-center gap-1",
              scoreColor
            )}
          >
            <Star className="w-3 h-3 fill-current" />
            {Math.round(clip.highlight_score * 100)}%
          </span>
        </div>

        {/* Progress bar */}
        {playing && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Clip Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-slate-200 text-sm leading-tight">
            {clip.title}
          </h4>
          <Badge
            className={cn(
              "flex-shrink-0 text-xs",
              getContentTypeColor(clip.clip_type as Parameters<typeof getContentTypeColor>[0])
            )}
          >
            <Video className="w-3 h-3" />
          </Badge>
        </div>

        {clip.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
            {clip.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
          <span>
            {formatTimestamp(clip.start_time)} → {formatTimestamp(clip.end_time)}
          </span>
          <span className="text-slate-500">
            {clip.download_count > 0 && `${clip.download_count} downloads`}
          </span>
        </div>

        {/* Caption info */}
        {clip.captions && clip.captions.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            <Captions className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">
              {clip.captions.length} caption segments
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {clip.captions && clip.captions.length > 0 && (
              <Button
                variant={showCaptions ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowCaptions(!showCaptions)}
                title="Toggle captions preview"
              >
                <Captions className="w-3.5 h-3.5" />
              </Button>
            )}

            {clip.overlays && clip.overlays.length > 0 && (
              <Button
                variant={showOverlays ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowOverlays(!showOverlays)}
                title="Toggle overlays preview"
              >
                <Layers className="w-3.5 h-3.5" />
              </Button>
            )}

            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  if (confirm("Delete this clip?")) onDelete(clip.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <ExportPanel clip={clip} />
        </div>
      </div>
    </div>
  );
}
