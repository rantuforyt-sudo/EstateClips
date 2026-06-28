"use client";

import { useState } from "react";
import {
  Eye,
  Mic,
  Layers,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
  Home,
  Sun,
} from "lucide-react";
import type { SceneAnalysis } from "@/types";
import { cn } from "@/utils";

interface VisionInsightsPanelProps {
  sceneAnalysis: SceneAnalysis | null;
  productionQuality?: number;
  className?: string;
}

const ROOM_ICONS: Record<string, string> = {
  kitchen: "🍳",
  bathroom: "🚿",
  living_room: "🛋️",
  dining_room: "🍽️",
  bedroom: "🛏️",
  master_bedroom: "✨",
  office: "💻",
  garage: "🚗",
  pool: "🏊",
  backyard: "🌿",
  balcony: "🌅",
  patio: "☀️",
  exterior: "🏠",
  front_elevation: "🏡",
  garden: "🌺",
  closet: "👗",
  staircase: "🪜",
  fireplace: "🔥",
  entryway: "🚪",
  hallway: "🔲",
  laundry: "🧺",
  unknown: "📍",
};

function getRoomIcon(room: string): string {
  const key = room.toLowerCase().replace(/\s+/g, "_");
  return ROOM_ICONS[key] ?? "📍";
}

function QualityBar({
  label,
  value,
  color = "#3B82F6",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const pct = Math.round(value * 100);
  const qualColor =
    pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: qualColor }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color: qualColor }}>
        {pct}%
      </span>
    </div>
  );
}

export function VisionInsightsPanel({
  sceneAnalysis,
  productionQuality,
  className,
}: VisionInsightsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const visionResult = sceneAnalysis?.vision_result;
  const detectedRooms = sceneAnalysis?.detected_rooms ?? [];
  const detectedFeatures = sceneAnalysis?.detected_features ?? [];
  const overallQuality = productionQuality ?? sceneAnalysis?.overall_quality ?? 0;

  const hasVision = !!visionResult;

  return (
    <div className={cn("rounded-xl border border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-900/60 hover:bg-slate-900/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Eye className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-200">AI Vision Analysis</p>
            <p className="text-xs text-slate-500">
              {hasVision
                ? `${detectedRooms.length} rooms · ${visionResult.shotBoundaries.length} shots detected`
                : `${detectedRooms.length} rooms detected from transcript`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {overallQuality > 0 && (
            <div
              className="px-2 py-1 rounded-lg text-xs font-medium"
              style={{
                backgroundColor:
                  overallQuality >= 0.8
                    ? "rgba(16,185,129,0.15)"
                    : overallQuality >= 0.6
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(239,68,68,0.15)",
                color:
                  overallQuality >= 0.8
                    ? "#10B981"
                    : overallQuality >= 0.6
                    ? "#F59E0B"
                    : "#EF4444",
              }}
            >
              {Math.round(overallQuality * 100)}% quality
            </div>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="p-4 space-y-5 bg-slate-950/40">
          {/* Detected rooms */}
          {detectedRooms.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Detected Spaces
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {detectedRooms.map((room, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50"
                  >
                    <span className="text-sm">{getRoomIcon(room.name)}</span>
                    <span className="text-xs font-medium text-slate-300">{room.name}</span>
                    {room.confidence > 0 && (
                      <span className="text-xs text-slate-600">
                        {Math.round(room.confidence * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Production quality scores */}
          {hasVision && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Production Quality
                </span>
              </div>
              <div className="space-y-2">
                <QualityBar label="Overall" value={visionResult.productionQuality} />
                {visionResult.frames.length > 0 && (
                  <>
                    <QualityBar
                      label="Visual quality"
                      value={
                        visionResult.frames.reduce((a, f) => a + f.visualQuality, 0) /
                        visionResult.frames.length
                      }
                    />
                    <QualityBar
                      label="Exposure"
                      value={
                        visionResult.frames.reduce((a, f) => a + f.exposureQuality, 0) /
                        visionResult.frames.length
                      }
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Audio insights */}
          {hasVision && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Mic className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Audio Analysis
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-800/60">
                  <p className="text-xs text-slate-500">Integrated loudness</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">
                    {visionResult.audioAnalysis.currentLufs} LUFS
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60">
                  <p className="text-xs text-slate-500">Target (social)</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">
                    {visionResult.audioAnalysis.targetLufs} LUFS
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60">
                  <p className="text-xs text-slate-500">Silence segments</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">
                    {visionResult.audioAnalysis.silenceSegments.length}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60">
                  <p className="text-xs text-slate-500">Background noise</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: visionResult.audioAnalysis.hasBackgroundNoise ? "#F59E0B" : "#10B981" }}>
                    {visionResult.audioAnalysis.hasBackgroundNoise ? "Detected" : "Clean"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Shot boundaries */}
          {hasVision && visionResult.shotBoundaries.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Shot Boundaries ({visionResult.shotBoundaries.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visionResult.shotBoundaries.slice(0, 10).map((sb, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700"
                  >
                    {sb.timestamp.toFixed(1)}s
                  </span>
                ))}
                {visionResult.shotBoundaries.length > 10 && (
                  <span className="px-2 py-0.5 text-xs text-slate-600">
                    +{visionResult.shotBoundaries.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Color grading suggestions */}
          {hasVision && visionResult.colorGradingSuggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Color Correction
                </span>
              </div>
              <div className="space-y-1.5">
                {visionResult.colorGradingSuggestions.map((cg, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400"
                    >
                      {cg.type}
                    </span>
                    <span className="text-slate-500">{cg.reason}</span>
                    <span
                      className="ml-auto font-mono font-bold"
                      style={{ color: cg.adjustment > 0 ? "#10B981" : "#EF4444" }}
                    >
                      {cg.adjustment > 0 ? "+" : ""}{(cg.adjustment * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detected features */}
          {detectedFeatures.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Property Features
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detectedFeatures.map((f, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700/50"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!hasVision && (
            <p className="text-xs text-slate-600 italic">
              Computer vision analysis was not available for this project. Room detection used transcript analysis only.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
