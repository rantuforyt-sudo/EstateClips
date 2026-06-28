/**
 * Vision analysis type definitions.
 *
 * All vision providers implement VisionProvider so they can be swapped
 * without touching call sites. Add a new provider by implementing this
 * interface and registering it in vision/index.ts.
 */

export type RoomLabel =
  | "kitchen"
  | "bathroom"
  | "living_room"
  | "dining_room"
  | "bedroom"
  | "master_bedroom"
  | "closet"
  | "office"
  | "garage"
  | "driveway"
  | "pool"
  | "backyard"
  | "balcony"
  | "patio"
  | "fireplace"
  | "staircase"
  | "exterior"
  | "front_elevation"
  | "garden"
  | "laundry"
  | "entryway"
  | "hallway"
  | "unknown";

export interface BoundingBox {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number;
  height: number;
}

export interface FaceDetection {
  boundingBox: BoundingBox;
  confidence: number;
  /** Center-x of the face, 0-1 */
  centerX: number;
  /** Center-y of the face, 0-1 */
  centerY: number;
  /** Relative size 0-1 (face area / frame area) */
  relativeSize: number;
}

export interface MotionVector {
  dx: number; // horizontal motion -1..1
  dy: number; // vertical motion -1..1
  magnitude: number; // 0-1
}

export interface FrameAnalysis {
  timestamp: number;
  faces: FaceDetection[];
  roomLabel: RoomLabel;
  roomConfidence: number;
  motionVector: MotionVector;
  /** Perceptual brightness 0-1 */
  brightness: number;
  /** Exposure quality 0-1 (1 = well exposed) */
  exposureQuality: number;
  /** Whether this frame is a shot boundary */
  isShotBoundary: boolean;
  /** Is there meaningful audio activity? */
  hasSpeech: boolean;
  /** Feature tags e.g. "stainless appliances", "hardwood floor" */
  propertyFeatures: string[];
  /** Visual quality score 0-1 */
  visualQuality: number;
}

export interface ShotBoundary {
  timestamp: number;
  confidence: number;
  /** "cut" | "fade" | "dissolve" */
  transitionType: "cut" | "fade" | "dissolve";
}

export interface ReframingInstruction {
  timestamp: number;
  /** Crop box in source-normalized coords */
  cropBox: BoundingBox;
  /** Smooth zoom factor 1.0 = no zoom */
  zoomFactor: number;
  /** Is this a punch-in event? */
  isPunchIn: boolean;
}

export interface SilenceSegment {
  start: number;
  end: number;
  /** RMS level in dBFS */
  rmsDb: number;
}

export interface AudioAnalysis {
  silenceSegments: SilenceSegment[];
  /** Suggested loudness target in LUFS */
  targetLufs: number;
  /** Current integrated loudness */
  currentLufs: number;
  /** Noise floor estimate dBFS */
  noiseFloorDb: number;
  hasBackgroundNoise: boolean;
}

export interface VisionAnalysisResult {
  frames: FrameAnalysis[];
  shotBoundaries: ShotBoundary[];
  reframingInstructions: ReframingInstruction[];
  audioAnalysis: AudioAnalysis;
  /** Detected room sequence with timestamps */
  roomSequence: Array<{ room: RoomLabel; startTime: number; endTime: number; confidence: number }>;
  /** Talking-head segments */
  talkingHeadSegments: Array<{ start: number; end: number; faceStability: number }>;
  /** Overall production quality 0-1 */
  productionQuality: number;
  /** Color grading suggestions */
  colorGradingSuggestions: ColorGradingSuggestion[];
}

export interface ColorGradingSuggestion {
  type: "exposure" | "white_balance" | "saturation" | "contrast" | "shadows" | "highlights";
  adjustment: number; // -1..1 relative adjustment
  reason: string;
}

/**
 * Implement this to plug in a different vision backend.
 */
export interface VisionProvider {
  readonly name: string;
  analyzeVideo(
    videoUrl: string,
    duration: number,
    options?: VisionAnalysisOptions
  ): Promise<VisionAnalysisResult>;
}

export interface VisionAnalysisOptions {
  /** Sample one frame every N seconds (default 2) */
  frameSampleInterval?: number;
  /** Whether to run face detection (default true) */
  detectFaces?: boolean;
  /** Whether to detect shot boundaries (default true) */
  detectShots?: boolean;
  /** Silence threshold in dBFS (default -40) */
  silenceThresholdDb?: number;
}
