"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Settings,
  Smartphone,
  Monitor,
  Square,
  ChevronDown,
  ChevronUp,
  Layers,
  Captions,
  Sun,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Clip } from "@/types";
import toast from "react-hot-toast";

interface ExportPanelProps {
  clip: Clip;
  onExportStart?: () => void;
}

type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

const ASPECT_OPTIONS: Array<{
  value: AspectRatio;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}> = [
  {
    value: "9:16",
    label: "Vertical",
    sublabel: "TikTok · Reels · Shorts",
    icon: <Smartphone className="w-4 h-4" />,
  },
  {
    value: "16:9",
    label: "Widescreen",
    sublabel: "YouTube · LinkedIn",
    icon: <Monitor className="w-4 h-4" />,
  },
  {
    value: "1:1",
    label: "Square",
    sublabel: "Instagram Feed",
    icon: <Square className="w-4 h-4" />,
  },
  {
    value: "4:5",
    label: "Portrait",
    sublabel: "Instagram Feed",
    icon: <Square className="w-4 h-4 scale-y-125" />,
  },
];

export function ExportPanel({ clip, onExportStart }: ExportPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [includeOverlays, setIncludeOverlays] = useState(true);
  const [includeCaptions, setIncludeCaptions] = useState(true);
  const [includeColorGrade, setIncludeColorGrade] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    onExportStart?.();

    try {
      const res = await fetch("/api/clips/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clip_id: clip.id,
          aspect_ratio: aspectRatio,
          include_overlays: includeOverlays,
          include_captions: includeCaptions,
          include_color_grade: includeColorGrade,
        }),
      });

      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();

      if (data.source_url) {
        // Open in new tab — user can use the export spec for FFmpeg-based rendering
        const a = document.createElement("a");
        a.href = data.source_url;
        a.target = "_blank";
        a.rel = "noopener";
        a.download = `${clip.title.replace(/[^a-z0-9]/gi, "_")}_${aspectRatio.replace(":", "x")}.mp4`;
        a.click();
        toast.success("Export started! The source video will download. Use the timestamps to trim in your editor.", { duration: 5000 });
      }

      // Log the export spec for debugging / future FFmpeg integration
      console.info("[EstateClips] Export spec:", data.export_spec);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const hasOverlays = clip.overlays && clip.overlays.length > 0;
  const hasCaptions = clip.captions && clip.captions.length > 0;

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-300">Export Options</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 bg-slate-950/30">
              {/* Aspect ratio */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Aspect Ratio
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ASPECT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAspectRatio(opt.value)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                        aspectRatio === opt.value
                          ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                          : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <span className="flex-shrink-0">{opt.icon}</span>
                      <div>
                        <p className="text-xs font-semibold leading-none">{opt.label}</p>
                        <p className="text-xs opacity-60 mt-0.5">{opt.sublabel}</p>
                      </div>
                      {aspectRatio === opt.value && (
                        <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay options */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Include
                </p>
                <div className="space-y-2">
                  {hasOverlays && (
                    <ToggleOption
                      icon={<Layers className="w-3.5 h-3.5" />}
                      label="Motion graphics & overlays"
                      sublabel="Hook text, lower-thirds, price, room labels"
                      value={includeOverlays}
                      onChange={setIncludeOverlays}
                    />
                  )}
                  {hasCaptions && (
                    <ToggleOption
                      icon={<Captions className="w-3.5 h-3.5" />}
                      label="Captions"
                      sublabel="Keyword-highlighted, face-safe placement"
                      value={includeCaptions}
                      onChange={setIncludeCaptions}
                    />
                  )}
                  <ToggleOption
                    icon={<Sun className="w-3.5 h-3.5" />}
                    label="AI color correction"
                    sublabel="Exposure, white balance, contrast"
                    value={includeColorGrade}
                    onChange={setIncludeColorGrade}
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                loading={exporting}
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExport}
              >
                Export {aspectRatio} Clip
              </Button>

              <p className="text-xs text-slate-600 text-center">
                Downloads source video with timestamps. Open in Premiere, DaVinci, or CapCut to trim.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleOption({
  icon,
  label,
  sublabel,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
        value
          ? "border-slate-600 bg-slate-800/60"
          : "border-slate-800 bg-slate-900/20 opacity-50"
      }`}
    >
      <div className={`flex-shrink-0 ${value ? "text-amber-400" : "text-slate-600"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-300 leading-none">{label}</p>
        <p className="text-xs text-slate-600 mt-0.5 truncate">{sublabel}</p>
      </div>
      <div
        className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
          value ? "bg-amber-500" : "bg-slate-700"
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full bg-white shadow transition-transform mt-0.5 ${
            value ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
