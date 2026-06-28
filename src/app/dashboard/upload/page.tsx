"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { VideoUploader } from "@/components/upload/VideoUploader";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  Upload,
  Film,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { generateProjectTitle, formatFileSize } from "@/utils";
import toast from "react-hot-toast";

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  fileSize: number;
  mimeType: string;
}

type UploadState =
  | "idle"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export default function UploadPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const handleFileSelected = (file: File, meta: VideoMetadata) => {
    setSelectedFile(file);
    setMetadata(meta);
    setTitle(generateProjectTitle(file.name));
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !metadata || !title.trim()) {
      toast.error("Please select a video and enter a title.");
      return;
    }

    setError(null);
    setUploadState("uploading");
    setUploadProgress(0);

    try {
      // Upload via XHR for progress tracking
      const formData = new FormData();
      formData.append("video", selectedFile);
      formData.append("title", title.trim());
      formData.append("duration", String(metadata.duration));
      formData.append("width", String(metadata.width));
      formData.append("height", String(metadata.height));

      const uploadResult = await new Promise<{ project: { id: string } }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              const errBody = JSON.parse(xhr.responseText || "{}");
              reject(new Error(errBody.error || "Upload failed"));
            }
          };

          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.onabort = () => reject(new Error("Upload cancelled"));

          xhr.open("POST", "/api/upload");
          xhr.send(formData);
        }
      );

      const pid = uploadResult.project.id;
      setProjectId(pid);
      setUploadProgress(100);

      // Start processing
      setUploadState("processing");
      setProcessingStep("Sending to AI pipeline...");
      setProcessingProgress(5);

      const processRes = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: pid,
          transcript_text: transcript.trim() || null,
        }),
      });

      if (!processRes.ok) {
        const errData = await processRes.json();
        throw new Error(errData.error || "Processing failed");
      }

      setProcessingProgress(100);
      setProcessingStep("Complete!");
      setUploadState("done");

      toast.success("Clips generated successfully!");

      setTimeout(() => {
        router.push(`/dashboard/projects/${pid}`);
      }, 1200);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
      setUploadState("error");
      toast.error(msg);
    }
  };

  const handleCancel = () => {
    xhrRef.current?.abort();
    setUploadState("idle");
    setUploadProgress(0);
  };

  const isProcessing =
    uploadState === "uploading" || uploadState === "processing";

  const stepLabels: Record<string, string> = {
    validating: "Validating video...",
    extracting_audio: "Extracting audio...",
    transcribing: "Transcribing speech...",
    analyzing_scenes: "Analyzing scenes...",
    detecting_content: "Detecting content type...",
    finding_highlights: "Finding best moments...",
    generating_captions: "Generating captions...",
    creating_clips: "Creating clips...",
    exporting: "Finalizing clips...",
    completed: "Complete!",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="page-title">New Project</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Upload a property video to generate AI-powered clips
        </p>
      </div>

      {/* Upload form */}
      <div className="space-y-6">
        {/* Video upload */}
        <div>
          <label className="label">Property Video</label>
          <VideoUploader
            onFileSelected={handleFileSelected}
            disabled={isProcessing || uploadState === "done"}
          />
        </div>

        {/* Title */}
        {selectedFile && (
          <div className="animate-fade-in">
            <label className="label" htmlFor="title">
              Project Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 123 Oak Street – Luxury Listing"
              className="input-field"
              disabled={isProcessing || uploadState === "done"}
              maxLength={120}
            />
          </div>
        )}

        {/* Optional transcript */}
        {selectedFile && (
          <div className="animate-fade-in">
            <button
              type="button"
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Add transcript (optional — improves clip quality)
              {showTranscript ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showTranscript && (
              <div className="mt-3 animate-fade-in">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste the video transcript here... This helps AI generate more accurate captions and find better highlights. You can get a transcript from YouTube auto-captions, Otter.ai, or similar tools."
                  className="input-field min-h-[120px] resize-y text-xs leading-relaxed"
                  disabled={isProcessing || uploadState === "done"}
                />
                <p className="text-xs text-slate-600 mt-1.5">
                  Without a transcript, AI will analyze the video title and
                  filename to generate clips.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium">
                Something went wrong
              </p>
              <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Upload progress */}
        {uploadState === "uploading" && (
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Upload className="w-4 h-4 text-blue-400 animate-pulse" />
                Uploading video...
              </div>
              <span className="text-blue-400 font-semibold">
                {uploadProgress}%
              </span>
            </div>
            <ProgressBar value={uploadProgress} color="blue" />
            {metadata && (
              <p className="text-xs text-slate-600">
                {formatFileSize(
                  Math.round((metadata.fileSize * uploadProgress) / 100)
                )}{" "}
                of {formatFileSize(metadata.fileSize)}
              </p>
            )}
          </div>
        )}

        {/* Processing progress */}
        {uploadState === "processing" && (
          <div className="p-5 bg-slate-900/60 border border-amber-500/20 rounded-2xl space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                {stepLabels[processingStep] || "AI is processing your video..."}
              </div>
              <span className="text-amber-400 font-semibold">
                {processingProgress}%
              </span>
            </div>
            <ProgressBar value={processingProgress} color="amber" />
            <p className="text-xs text-slate-500">
              Analyzing scenes, detecting content type, and generating clips...
            </p>
          </div>
        )}

        {/* Done */}
        {uploadState === "done" && (
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">
                  Clips generated!
                </p>
                <p className="text-xs text-emerald-400/70">
                  Redirecting to your project...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI info box */}
        {selectedFile && uploadState === "idle" && (
          <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl animate-fade-in">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-500 space-y-1">
                <p className="text-slate-400 font-medium">
                  What happens next
                </p>
                <p>
                  AI will analyze your video, detect the content type (luxury
                  listing, open house, property tour, etc.), find the best
                  highlight moments, generate cleaned captions, detect rooms,
                  and create 3–6 shareable clips.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isProcessing ? (
            <Button
              variant="danger"
              size="lg"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          ) : uploadState === "done" ? null : (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={handleUpload}
                disabled={!selectedFile || !title.trim()}
                icon={<Film className="w-4 h-4" />}
                className="flex-1"
              >
                Generate Clips
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
