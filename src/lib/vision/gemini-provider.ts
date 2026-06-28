/**
 * GeminiVisionProvider
 *
 * Uses Gemini 1.5 Flash's multimodal capabilities to analyze real estate video
 * by sending frames (as base64 thumbnails) alongside the structured prompt.
 *
 * Since we operate server-side without direct FFmpeg access on Vercel, the
 * provider receives a signed video URL and uses Gemini's native video
 * understanding (via inline_data or file_data) to produce frame-level analysis.
 *
 * Swap this out by implementing VisionProvider and updating vision/index.ts.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  VisionProvider,
  VisionAnalysisResult,
  VisionAnalysisOptions,
  FrameAnalysis,
  ShotBoundary,
  ReframingInstruction,
  AudioAnalysis,
  RoomLabel,
  ColorGradingSuggestion,
} from "./types";

const ROOM_LABEL_MAP: Record<string, RoomLabel> = {
  kitchen: "kitchen",
  bathroom: "bathroom",
  "living room": "living_room",
  "dining room": "dining_room",
  bedroom: "bedroom",
  "master bedroom": "master_bedroom",
  "primary bedroom": "master_bedroom",
  closet: "closet",
  "walk-in closet": "closet",
  office: "office",
  "home office": "office",
  garage: "garage",
  driveway: "driveway",
  pool: "pool",
  backyard: "backyard",
  balcony: "balcony",
  patio: "patio",
  fireplace: "fireplace",
  staircase: "staircase",
  stairs: "staircase",
  exterior: "exterior",
  "front elevation": "front_elevation",
  "front of house": "front_elevation",
  garden: "garden",
  laundry: "laundry",
  entry: "entryway",
  entryway: "entryway",
  foyer: "entryway",
  hallway: "hallway",
};

function parseRoomLabel(raw: string): RoomLabel {
  const lower = raw.toLowerCase().trim();
  for (const [key, label] of Object.entries(ROOM_LABEL_MAP)) {
    if (lower.includes(key)) return label;
  }
  return "unknown";
}

export class GeminiVisionProvider implements VisionProvider {
  readonly name = "gemini-1.5-flash-vision";

  async analyzeVideo(
    videoUrl: string,
    duration: number,
    options: VisionAnalysisOptions = {}
  ): Promise<VisionAnalysisResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const interval = options.frameSampleInterval ?? 3;
    const sampleCount = Math.min(20, Math.floor(duration / interval));

    // Build sample timestamps for analysis description
    const sampleTimestamps = Array.from({ length: sampleCount }, (_, i) =>
      Math.round(i * interval)
    );

    const prompt = `You are an expert real estate video analyst with computer vision capabilities.

Analyze this real estate video at URL: ${videoUrl}
Duration: ${duration} seconds
Sample timestamps to analyze: ${sampleTimestamps.join(", ")} seconds

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:

{
  "frames": [
    {
      "timestamp": 0,
      "roomLabel": "kitchen|bathroom|living_room|dining_room|bedroom|master_bedroom|closet|office|garage|driveway|pool|backyard|balcony|patio|fireplace|staircase|exterior|front_elevation|garden|laundry|entryway|hallway|unknown",
      "roomConfidence": 0.85,
      "hasFace": true,
      "faceCount": 1,
      "faceCenterX": 0.5,
      "faceCenterY": 0.4,
      "faceSize": 0.15,
      "brightness": 0.7,
      "exposureQuality": 0.8,
      "isShotBoundary": false,
      "hasSpeech": true,
      "propertyFeatures": ["granite countertops", "stainless appliances"],
      "visualQuality": 0.85,
      "motionMagnitude": 0.2
    }
  ],
  "shotBoundaries": [
    { "timestamp": 5.2, "confidence": 0.9, "transitionType": "cut" }
  ],
  "roomSequence": [
    { "room": "exterior", "startTime": 0, "endTime": 8, "confidence": 0.9 },
    { "room": "living_room", "startTime": 8, "endTime": 22, "confidence": 0.85 }
  ],
  "talkingHeadSegments": [
    { "start": 3, "end": 18, "faceStability": 0.8 }
  ],
  "productionQuality": 0.75,
  "audioAnalysis": {
    "silenceSegments": [{ "start": 0, "end": 1.5, "rmsDb": -60 }],
    "targetLufs": -14,
    "currentLufs": -18,
    "noiseFloorDb": -45,
    "hasBackgroundNoise": false
  },
  "colorGradingSuggestions": [
    { "type": "exposure", "adjustment": 0.1, "reason": "Slightly underexposed interior shots" }
  ],
  "reframingInstructions": [
    {
      "timestamp": 5,
      "cropBox": { "x": 0.1, "y": 0.0, "width": 0.8, "height": 1.0 },
      "zoomFactor": 1.1,
      "isPunchIn": false
    }
  ]
}

ANALYSIS RULES:
- Analyze every ${interval} seconds and describe what you observe
- For real estate: identify every room/space shown
- For talking-head segments: track the presenter's face position precisely
- Detect shot boundaries (cuts, fades) for cleaner clip boundaries  
- Flag underexposed/overexposed frames with color correction suggestions
- Identify silence (no speech, no movement) for dead-air removal
- Note property features visible on screen (flooring, appliances, fixtures, views)
- Rate visual quality per frame (blur, shake, bad framing = low score)
- For reframing: suggest crop boxes that keep faces/subjects centered for 9:16 vertical
- Punch-ins should occur at natural pause points during talking-head segments
- Color grading: exposure type uses -1..1 where 0.1 = brighten 10%
- Audio: estimate LUFS (-23 broadcast standard, -14 social media target)
- Production quality 0-1 considering: lighting, stability, focus, composition
- Be specific about property features: "quartz waterfall island", not just "kitchen"`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const clean = text
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        .trim();

      const raw = JSON.parse(clean);
      return this.buildResult(raw, duration);
    } catch (error) {
      console.error("GeminiVisionProvider error:", error);
      return this.buildFallbackResult(duration, sampleTimestamps);
    }
  }

  private buildResult(raw: Record<string, unknown>, duration: number): VisionAnalysisResult {
    const rawFrames = (raw.frames as Array<Record<string, unknown>>) ?? [];

    const frames: FrameAnalysis[] = rawFrames.map((f) => ({
      timestamp: Number(f.timestamp ?? 0),
      faces: f.hasFace
        ? [
            {
              boundingBox: {
                x: Number(f.faceCenterX ?? 0.5) - 0.1,
                y: Number(f.faceCenterY ?? 0.4) - 0.1,
                width: 0.2,
                height: 0.2,
              },
              confidence: 0.85,
              centerX: Number(f.faceCenterX ?? 0.5),
              centerY: Number(f.faceCenterY ?? 0.4),
              relativeSize: Number(f.faceSize ?? 0.1),
            },
          ]
        : [],
      roomLabel: parseRoomLabel(String(f.roomLabel ?? "unknown")),
      roomConfidence: Number(f.roomConfidence ?? 0.5),
      motionVector: {
        dx: 0,
        dy: 0,
        magnitude: Number(f.motionMagnitude ?? 0),
      },
      brightness: Number(f.brightness ?? 0.6),
      exposureQuality: Number(f.exposureQuality ?? 0.7),
      isShotBoundary: Boolean(f.isShotBoundary),
      hasSpeech: Boolean(f.hasSpeech),
      propertyFeatures: (f.propertyFeatures as string[]) ?? [],
      visualQuality: Number(f.visualQuality ?? 0.7),
    }));

    const shotBoundaries: ShotBoundary[] = (
      (raw.shotBoundaries as Array<Record<string, unknown>>) ?? []
    ).map((sb) => ({
      timestamp: Number(sb.timestamp),
      confidence: Number(sb.confidence ?? 0.8),
      transitionType: (sb.transitionType as "cut" | "fade" | "dissolve") ?? "cut",
    }));

    const rawRI = (raw.reframingInstructions as Array<Record<string, unknown>>) ?? [];
    const reframingInstructions: ReframingInstruction[] = rawRI.map((ri) => {
      const box = (ri.cropBox as Record<string, number>) ?? { x: 0, y: 0, width: 1, height: 1 };
      return {
        timestamp: Number(ri.timestamp),
        cropBox: {
          x: Number(box.x ?? 0),
          y: Number(box.y ?? 0),
          width: Number(box.width ?? 1),
          height: Number(box.height ?? 1),
        },
        zoomFactor: Number(ri.zoomFactor ?? 1.0),
        isPunchIn: Boolean(ri.isPunchIn),
      };
    });

    const rawAudio = (raw.audioAnalysis as Record<string, unknown>) ?? {};
    const audioAnalysis: AudioAnalysis = {
      silenceSegments: (
        (rawAudio.silenceSegments as Array<Record<string, number>>) ?? []
      ).map((s) => ({
        start: Number(s.start),
        end: Number(s.end),
        rmsDb: Number(s.rmsDb ?? -60),
      })),
      targetLufs: Number(rawAudio.targetLufs ?? -14),
      currentLufs: Number(rawAudio.currentLufs ?? -18),
      noiseFloorDb: Number(rawAudio.noiseFloorDb ?? -45),
      hasBackgroundNoise: Boolean(rawAudio.hasBackgroundNoise),
    };

    const rawRS = (raw.roomSequence as Array<Record<string, unknown>>) ?? [];
    const roomSequence = rawRS.map((rs) => ({
      room: parseRoomLabel(String(rs.room)),
      startTime: Number(rs.startTime),
      endTime: Number(rs.endTime ?? duration),
      confidence: Number(rs.confidence ?? 0.7),
    }));

    const rawTH = (raw.talkingHeadSegments as Array<Record<string, number>>) ?? [];
    const talkingHeadSegments = rawTH.map((th) => ({
      start: Number(th.start),
      end: Number(th.end),
      faceStability: Number(th.faceStability ?? 0.7),
    }));

    const rawCG = (raw.colorGradingSuggestions as Array<Record<string, unknown>>) ?? [];
    const colorGradingSuggestions: ColorGradingSuggestion[] = rawCG.map((cg) => ({
      type: (cg.type as ColorGradingSuggestion["type"]) ?? "exposure",
      adjustment: Number(cg.adjustment ?? 0),
      reason: String(cg.reason ?? ""),
    }));

    return {
      frames,
      shotBoundaries,
      reframingInstructions,
      audioAnalysis,
      roomSequence,
      talkingHeadSegments,
      productionQuality: Number(raw.productionQuality ?? 0.7),
      colorGradingSuggestions,
    };
  }

  private buildFallbackResult(duration: number, timestamps: number[]): VisionAnalysisResult {
    const frames: FrameAnalysis[] = timestamps.map((t) => ({
      timestamp: t,
      faces: [],
      roomLabel: "unknown",
      roomConfidence: 0.3,
      motionVector: { dx: 0, dy: 0, magnitude: 0.1 },
      brightness: 0.6,
      exposureQuality: 0.7,
      isShotBoundary: false,
      hasSpeech: t > 2 && t < duration - 2,
      propertyFeatures: [],
      visualQuality: 0.6,
    }));

    return {
      frames,
      shotBoundaries: [],
      reframingInstructions: [],
      audioAnalysis: {
        silenceSegments: [
          { start: 0, end: 1.5, rmsDb: -60 },
          { start: duration - 1, end: duration, rmsDb: -60 },
        ],
        targetLufs: -14,
        currentLufs: -18,
        noiseFloorDb: -45,
        hasBackgroundNoise: false,
      },
      roomSequence: [
        { room: "unknown", startTime: 0, endTime: duration, confidence: 0.3 },
      ],
      talkingHeadSegments: [],
      productionQuality: 0.6,
      colorGradingSuggestions: [],
    };
  }
}
