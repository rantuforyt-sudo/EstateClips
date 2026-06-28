"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Film, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils";
import { validateVideoFile, formatFileSize, extractVideoMetadata } from "@/lib/video-processing";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  fileSize: number;
  mimeType: string;
}

interface VideoUploaderProps {
  onFileSelected: (file: File, metadata: VideoMetadata) => void;
  disabled?: boolean;
}

export function VideoUploader({ onFileSelected, disabled }: VideoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;
      const file = acceptedFiles[0];
      if (!file) return;

      setValidationError(null);
      setSelectedFile(null);
      setMetadata(null);

      // Validate
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        setValidationError(validation.error ?? "Invalid file");
        return;
      }

      setLoadingMeta(true);
      try {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        const meta = await extractVideoMetadata(file);
        setMetadata(meta);
        setSelectedFile(file);
        onFileSelected(file, meta);
      } catch {
        setValidationError("Could not read video metadata. The file may be corrupted.");
      } finally {
        setLoadingMeta(false);
      }
    },
    [onFileSelected, disabled]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "video/mp4": [".mp4"],
        "video/quicktime": [".mov"],
        "video/x-msvideo": [".avi"],
        "video/webm": [".webm"],
        "video/x-matroska": [".mkv"],
        "video/avi": [".avi"],
      },
      maxFiles: 1,
      maxSize: 500 * 1024 * 1024,
      disabled,
    });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200",
          isDragActive && !isDragReject
            ? "border-amber-500 bg-amber-500/5 scale-[1.01]"
            : isDragReject
            ? "border-red-500 bg-red-500/5"
            : selectedFile
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-slate-700 hover:border-slate-500 bg-slate-800/30 hover:bg-slate-800/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        {selectedFile && metadata ? (
          <div className="space-y-4">
            {previewUrl && (
              <div className="mx-auto w-32 h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                <video
                  src={previewUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
              </div>
            )}
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div>
              <p className="font-semibold text-slate-200 text-sm">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatFileSize(metadata.fileSize)} ·{" "}
                {formatDuration(metadata.duration)} ·{" "}
                {metadata.width}×{metadata.height}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Drop a different file to replace
            </p>
          </div>
        ) : loadingMeta ? (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Reading video...</p>
            <ProgressBar value={50} size="sm" className="max-w-xs mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-colors",
                isDragActive
                  ? "bg-amber-500/20"
                  : isDragReject
                  ? "bg-red-500/20"
                  : "bg-slate-700"
              )}
            >
              {isDragReject ? (
                <AlertCircle className="w-7 h-7 text-red-400" />
              ) : isDragActive ? (
                <Upload className="w-7 h-7 text-amber-400 animate-bounce" />
              ) : (
                <Film className="w-7 h-7 text-slate-400" />
              )}
            </div>

            {isDragActive && !isDragReject ? (
              <div>
                <p className="text-amber-400 font-semibold">Drop your video here</p>
              </div>
            ) : isDragReject ? (
              <div>
                <p className="text-red-400 font-semibold">Unsupported file type</p>
                <p className="text-red-400/70 text-sm mt-1">Please use MP4, MOV, AVI, WebM, or MKV</p>
              </div>
            ) : (
              <div>
                <p className="text-slate-300 font-semibold">
                  Drop your property video here
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  or{" "}
                  <span className="text-amber-400 hover:text-amber-300">
                    browse files
                  </span>
                </p>
                <p className="text-slate-600 text-xs mt-3">
                  MP4, MOV, AVI, WebM, MKV · Up to 500MB
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {validationError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{validationError}</p>
        </div>
      )}
    </div>
  );
}
