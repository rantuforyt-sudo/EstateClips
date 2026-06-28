/**
 * Clip scoring engine.
 *
 * Combines transcript AI signals with computer vision signals to produce a
 * composite score for every candidate clip. Clips are returned sorted best-first.
 */

import type { HighlightMoment, TranscriptSegment } from "@/types";
import type { VisionAnalysisResult, FrameAnalysis, RoomLabel } from "./vision/types";

export interface ScoredHighlight extends HighlightMoment {
  /** Final composite score 0-1 */
  compositeScore: number;
  /** Individual signal scores for transparency */
  signals: ClipSignals;
}

export interface ClipSignals {
  /** Original AI transcript score */
  transcriptScore: number;
  /** Average visual quality in clip window */
  visualQualityScore: number;
  /** Face presence and stability */
  faceScore: number;
  /** Room detection confidence */
  roomScore: number;
  /** Production quality (lighting, stability) */
  productionScore: number;
  /** Penalizes clips with lots of silence */
  speechDensityScore: number;
  /** Rewards clips that start on shot boundaries */
  boundaryAlignmentScore: number;
  /** Rewards premium rooms (pool, master bedroom, kitchen) */
  premiumRoomBonus: number;
}

const PREMIUM_ROOMS: Set<RoomLabel> = new Set([
  "pool",
  "master_bedroom",
  "kitchen",
  "backyard",
  "balcony",
  "patio",
  "exterior",
  "front_elevation",
  "garden",
]);

const SCORE_WEIGHTS = {
  transcriptScore: 0.22,
  visualQualityScore: 0.18,
  faceScore: 0.12,
  roomScore: 0.10,
  productionScore: 0.12,
  speechDensityScore: 0.12,
  boundaryAlignmentScore: 0.08,
  premiumRoomBonus: 0.06,
};

/**
 * Score and rank a list of highlight moments using vision data.
 */
export function scoreAndRankClips(
  highlights: HighlightMoment[],
  vision: VisionAnalysisResult,
  transcript: TranscriptSegment[]
): ScoredHighlight[] {
  const scored = highlights.map((h) =>
    scoreClip(h, vision, transcript)
  );

  return scored.sort((a, b) => b.compositeScore - a.compositeScore);
}

function scoreClip(
  highlight: HighlightMoment,
  vision: VisionAnalysisResult,
  transcript: TranscriptSegment[]
): ScoredHighlight {
  const { start, end } = highlight;
  const framesInWindow = vision.frames.filter(
    (f) => f.timestamp >= start && f.timestamp <= end
  );

  const signals = computeSignals(highlight, framesInWindow, vision, transcript);
  const compositeScore = computeComposite(signals);

  return {
    ...highlight,
    compositeScore,
    score: compositeScore, // keep existing field in sync
    signals,
  };
}

function computeSignals(
  highlight: HighlightMoment,
  frames: FrameAnalysis[],
  vision: VisionAnalysisResult,
  transcript: TranscriptSegment[]
): ClipSignals {
  const { start, end } = highlight;
  const clipDuration = end - start;

  // 1. Transcript score – as provided by Gemini text analysis
  const transcriptScore = clamp(highlight.score, 0, 1);

  // 2. Visual quality – average per-frame quality
  const visualQualityScore =
    frames.length > 0
      ? average(frames.map((f) => f.visualQuality))
      : 0.5;

  // 3. Face score – reward clips where presenter is visible and stable
  const facyFrames = frames.filter((f) => f.faces.length > 0);
  const facePresenceRatio = frames.length > 0 ? facyFrames.length / frames.length : 0;
  // Check if face is in a talking-head segment
  const inTalkingHead = vision.talkingHeadSegments.some(
    (th) => th.start <= start + clipDuration * 0.3 && th.end >= end - clipDuration * 0.3
  );
  const faceScore = clamp(
    facePresenceRatio * 0.6 + (inTalkingHead ? 0.4 : 0),
    0,
    1
  );

  // 4. Room detection confidence
  const roomScore =
    frames.length > 0
      ? average(frames.map((f) => f.roomConfidence))
      : 0.4;

  // 5. Production quality from overall video signal
  const productionScore = vision.productionQuality;

  // 6. Speech density – fraction of clip time with speech
  const speechFrames = frames.filter((f) => f.hasSpeech);
  const speechDensityScore =
    frames.length > 0 ? speechFrames.length / frames.length : 0.5;

  // 7. Boundary alignment – reward clips that begin near a shot boundary
  const nearestBoundary = vision.shotBoundaries.reduce(
    (best, sb) => {
      const dist = Math.abs(sb.timestamp - start);
      return dist < best.dist ? { dist, confidence: sb.confidence } : best;
    },
    { dist: Infinity, confidence: 0 }
  );
  const boundaryAlignmentScore =
    nearestBoundary.dist < 2.5
      ? clamp(nearestBoundary.confidence * (1 - nearestBoundary.dist / 2.5), 0, 1)
      : 0;

  // 8. Premium room bonus
  const roomsInClip = new Set(frames.map((f) => f.roomLabel));
  const hasPremiumRoom = [...roomsInClip].some((r) => PREMIUM_ROOMS.has(r as RoomLabel));
  const premiumRoomBonus = hasPremiumRoom ? 1 : 0;

  return {
    transcriptScore,
    visualQualityScore,
    faceScore,
    roomScore,
    productionScore,
    speechDensityScore,
    boundaryAlignmentScore,
    premiumRoomBonus,
  };
}

function computeComposite(signals: ClipSignals): number {
  let composite = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    composite += (signals[key as keyof ClipSignals] ?? 0) * weight;
  }
  return clamp(composite, 0, 1);
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Compute speech density for a time window from transcript segments.
 */
export function computeSpeechDensity(
  start: number,
  end: number,
  transcript: TranscriptSegment[]
): number {
  const duration = end - start;
  if (duration <= 0) return 0;

  const spokenTime = transcript
    .filter((s) => s.end >= start && s.start <= end)
    .reduce((acc, s) => {
      const overlap =
        Math.min(s.end, end) - Math.max(s.start, start);
      return acc + Math.max(0, overlap);
    }, 0);

  return clamp(spokenTime / duration, 0, 1);
}
