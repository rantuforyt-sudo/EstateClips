/**
 * Overlay generation engine.
 *
 * Produces rich, production-ready overlay specs for every clip type.
 * Overlays are stored as JSON in the database and rendered client-side
 * inside ClipPlayer and the export canvas.
 */

import type { AIAnalysisResult, PropertyDetails, HighlightMoment } from "@/types";
import type { VisionAnalysisResult, FrameAnalysis } from "./vision/types";
import type { ScoredHighlight } from "./clip-scorer";

// ─── Extended overlay types ────────────────────────────────────────────────────

export type OverlayType =
  | "hook_text"
  | "lower_third"
  | "price_badge"
  | "address_banner"
  | "room_label"
  | "feature_tag"
  | "open_house_info"
  | "agent_info"
  | "property_stats"
  | "punch_in_marker"
  | "broll_transition"
  | "color_grade"
  | "caption_block"
  | "luxury_frame";

export interface ExtendedOverlay {
  type: OverlayType;
  content: Record<string, string | number | boolean>;
  /** Normalized position 0-1 */
  position: { x: number; y: number };
  /** Normalized size 0-1 */
  size?: { width: number; height: number };
  startTime: number;
  endTime: number;
  /** CSS-like animation preset */
  animation: "fade_in" | "slide_up" | "slide_down" | "scale_in" | "none";
  /** Animation duration in seconds */
  animDuration: number;
  style: string;
  /** z-index for layering */
  zIndex: number;
}

// ─── Hook text templates per content type ─────────────────────────────────────

const HOOK_TEMPLATES: Record<string, string[]> = {
  luxury_listing: [
    "This is what ${price} looks like",
    "Welcome to ${address}",
    "Luxury living in ${neighborhood}",
    "Your dream home is here",
    "Inside one of ${neighborhood}'s finest",
  ],
  property_tour: [
    "Full tour of ${address}",
    "${bedrooms} bed • ${bathrooms} bath • ${sqft} sqft",
    "You have to see this one",
    "Inside ${address}",
    "Would you buy this home?",
  ],
  open_house: [
    "Open house this ${open_house_date}!",
    "Come see ${address}",
    "You're invited — open house ${open_house_date}",
    "Don't miss this one",
  ],
  talking_head: [
    "Real estate tip you need to know",
    "I've never seen a market like this",
    "Buyers — watch this",
    "This changes everything",
  ],
  neighborhood_tour: [
    "Life in ${neighborhood}",
    "Why everyone's moving to ${neighborhood}",
    "The neighborhood your clients want",
  ],
  market_update: [
    "The market just shifted",
    "What buyers need to know now",
    "This week in real estate",
  ],
  listing_walkthrough: [
    "Room by room — ${address}",
    "Every inch of ${address}",
    "Inside ${bedrooms}bd/${bathrooms}ba at ${address}",
  ],
  unknown: [
    "You need to see this",
    "Wait for it...",
    "Real estate like you've never seen",
  ],
};

function pickHookText(
  contentType: string,
  props: PropertyDetails
): string {
  const templates = HOOK_TEMPLATES[contentType] ?? HOOK_TEMPLATES.unknown;
  const template = templates[Math.floor(Math.random() * templates.length)];

  return template
    .replace("${price}", props.price ?? "this price")
    .replace("${address}", props.address ?? "this property")
    .replace("${neighborhood}", props.neighborhood ?? "this area")
    .replace("${bedrooms}", String(props.bedrooms ?? ""))
    .replace("${bathrooms}", String(props.bathrooms ?? ""))
    .replace("${sqft}", props.sqft ? `${props.sqft.toLocaleString()} sqft` : "")
    .replace("${open_house_date}", props.open_house_date ?? "this weekend");
}

// ─── Face-safe caption placement ──────────────────────────────────────────────

/**
 * Determine the safest vertical position for captions given face positions.
 * Returns 0-1 (0 = top, 1 = bottom).
 */
export function computeSafeCaptionY(
  frames: FrameAnalysis[],
  preferBottom = true
): { y: number; zone: "top" | "bottom" } {
  const faceyFrames = frames.filter((f) => f.faces.length > 0);
  if (faceyFrames.length === 0) {
    return preferBottom ? { y: 0.85, zone: "bottom" } : { y: 0.08, zone: "top" };
  }

  // Find average face center-y
  const avgFaceY =
    faceyFrames.reduce((acc, f) => acc + f.faces[0].centerY, 0) /
    faceyFrames.length;

  // If face is in bottom half, put caption at top
  if (avgFaceY > 0.55) {
    return { y: 0.08, zone: "top" };
  }

  // If face is in top half, captions go to bottom
  return { y: 0.85, zone: "bottom" };
}

// ─── Main overlay generator ────────────────────────────────────────────────────

export function generateAdvancedOverlays(
  highlight: ScoredHighlight,
  aiResult: AIAnalysisResult,
  vision: VisionAnalysisResult,
  agentName?: string,
  brokerage?: string
): ExtendedOverlay[] {
  const overlays: ExtendedOverlay[] = [];
  const { content_type, property_details } = aiResult;
  const { start: clipStart, end: clipEnd } = highlight;
  const clipDuration = clipEnd - clipStart;

  const framesInClip = vision.frames.filter(
    (f) => f.timestamp >= clipStart && f.timestamp <= clipEnd
  );

  // Relative helpers
  const rel = (t: number) => t - clipStart;
  const captionZone = computeSafeCaptionY(framesInClip);

  // ── 1. Hook Text (first 3 seconds) ────────────────────────────────────────
  const hookText = pickHookText(content_type, property_details ?? {});
  overlays.push({
    type: "hook_text",
    content: {
      text: hookText,
      subtext: property_details?.address ?? "",
    },
    position: { x: 0.5, y: 0.35 },
    size: { width: 0.9, height: 0.2 },
    startTime: 0,
    endTime: Math.min(3.5, clipDuration),
    animation: "scale_in",
    animDuration: 0.4,
    style: "hook_hero",
    zIndex: 50,
  });

  // ── 2. Lower-Third (agent name + brokerage) ────────────────────────────────
  const agentDisplay = agentName ?? property_details?.agent_name;
  const brokerageDisplay = brokerage ?? property_details?.brokerage;

  if (agentDisplay) {
    const lowerThirdStart = clipDuration > 8 ? 4 : 1.5;
    overlays.push({
      type: "lower_third",
      content: {
        name: agentDisplay,
        brokerage: brokerageDisplay ?? "",
        phone: "",
      },
      position: { x: 0.5, y: 0.88 },
      size: { width: 0.95, height: 0.1 },
      startTime: lowerThirdStart,
      endTime: Math.min(lowerThirdStart + 4, clipDuration),
      animation: "slide_up",
      animDuration: 0.35,
      style: `lower_third_${content_type === "luxury_listing" ? "luxury" : "standard"}`,
      zIndex: 40,
    });
  }

  // ── 3. Price Badge ─────────────────────────────────────────────────────────
  if (property_details?.price) {
    overlays.push({
      type: "price_badge",
      content: {
        price: property_details.price,
        label: content_type === "open_house" ? "Open House" : "Listed at",
      },
      position: { x: 0.85, y: 0.12 },
      size: { width: 0.28, height: 0.08 },
      startTime: 0,
      endTime: Math.min(6, clipDuration),
      animation: "fade_in",
      animDuration: 0.5,
      style: "price_badge",
      zIndex: 35,
    });
  }

  // ── 4. Address Banner ──────────────────────────────────────────────────────
  if (property_details?.address) {
    const addrStart = Math.min(5, clipDuration - 3);
    overlays.push({
      type: "address_banner",
      content: {
        address: property_details.address,
        beds: String(property_details.bedrooms ?? ""),
        baths: String(property_details.bathrooms ?? ""),
        sqft: property_details.sqft ? `${property_details.sqft.toLocaleString()} sf` : "",
      },
      position: { x: 0.5, y: captionZone.zone === "top" ? 0.88 : 0.12 },
      size: { width: 0.95, height: 0.08 },
      startTime: Math.max(0, addrStart),
      endTime: Math.min(addrStart + 5, clipDuration),
      animation: "slide_up",
      animDuration: 0.4,
      style: "address_banner",
      zIndex: 38,
    });
  }

  // ── 5. Room Labels (synced to room sequence) ───────────────────────────────
  const clipRooms = vision.roomSequence.filter(
    (rs) => rs.startTime < clipEnd && rs.endTime > clipStart && rs.confidence > 0.6
  );

  for (const roomEntry of clipRooms) {
    const roomRelStart = Math.max(0, rel(roomEntry.startTime));
    const roomRelEnd = Math.min(clipDuration, rel(roomEntry.endTime));
    if (roomRelEnd - roomRelStart < 1) continue;

    const displayName = formatRoomLabel(roomEntry.room);
    overlays.push({
      type: "room_label",
      content: {
        room: displayName,
        confidence: String(Math.round(roomEntry.confidence * 100)),
      },
      position: { x: 0.12, y: 0.1 },
      size: { width: 0.4, height: 0.06 },
      startTime: roomRelStart,
      endTime: Math.min(roomRelStart + 3.5, roomRelEnd),
      animation: "slide_down",
      animDuration: 0.3,
      style: `room_label_${roomEntry.room}`,
      zIndex: 30,
    });
  }

  // ── 6. Property Feature Tags ───────────────────────────────────────────────
  const allFeatures = framesInClip
    .flatMap((f) => f.propertyFeatures)
    .filter(Boolean);
  const uniqueFeatures = [...new Set(allFeatures)].slice(0, 3);

  uniqueFeatures.forEach((feature, i) => {
    const featureStart = 2 + i * 2;
    if (featureStart >= clipDuration) return;
    overlays.push({
      type: "feature_tag",
      content: { feature },
      position: { x: 0.88, y: 0.3 + i * 0.08 },
      size: { width: 0.22, height: 0.05 },
      startTime: featureStart,
      endTime: Math.min(featureStart + 2.5, clipDuration),
      animation: "scale_in",
      animDuration: 0.25,
      style: "feature_tag",
      zIndex: 25,
    });
  });

  // ── 7. Property Stats Overlay ──────────────────────────────────────────────
  const hasStats =
    property_details?.bedrooms ||
    property_details?.bathrooms ||
    property_details?.sqft;
  if (hasStats && clipDuration > 10) {
    const statsStart = clipDuration > 20 ? clipDuration - 8 : clipDuration - 5;
    overlays.push({
      type: "property_stats",
      content: {
        beds: String(property_details?.bedrooms ?? ""),
        baths: String(property_details?.bathrooms ?? ""),
        sqft: property_details?.sqft
          ? `${property_details.sqft.toLocaleString()}`
          : "",
      },
      position: { x: 0.5, y: 0.82 },
      size: { width: 0.9, height: 0.12 },
      startTime: Math.max(0, statsStart),
      endTime: clipDuration,
      animation: "fade_in",
      animDuration: 0.5,
      style: "property_stats",
      zIndex: 32,
    });
  }

  // ── 8. Open House Banner ───────────────────────────────────────────────────
  if (
    content_type === "open_house" &&
    (property_details?.open_house_date || property_details?.open_house_time)
  ) {
    overlays.push({
      type: "open_house_info",
      content: {
        date: property_details?.open_house_date ?? "",
        time: property_details?.open_house_time ?? "",
        address: property_details?.address ?? "",
      },
      position: { x: 0.5, y: 0.12 },
      size: { width: 0.9, height: 0.14 },
      startTime: 0,
      endTime: Math.min(8, clipDuration),
      animation: "slide_down",
      animDuration: 0.5,
      style: "open_house_banner",
      zIndex: 45,
    });
  }

  // ── 9. Luxury Frame Border ─────────────────────────────────────────────────
  if (content_type === "luxury_listing") {
    overlays.push({
      type: "luxury_frame",
      content: { style: "gold" },
      position: { x: 0.5, y: 0.5 },
      size: { width: 1, height: 1 },
      startTime: 0,
      endTime: clipDuration,
      animation: "fade_in",
      animDuration: 0.8,
      style: "luxury_frame_gold",
      zIndex: 5,
    });
  }

  // ── 10. B-roll Transition Markers (at shot boundaries) ────────────────────
  const boundariesInClip = vision.shotBoundaries.filter(
    (sb) => sb.timestamp > clipStart + 1 && sb.timestamp < clipEnd - 1
  );
  for (const sb of boundariesInClip) {
    overlays.push({
      type: "broll_transition",
      content: {
        transitionType: sb.transitionType,
        confidence: String(sb.confidence),
      },
      position: { x: 0.5, y: 0.5 },
      size: { width: 1, height: 1 },
      startTime: rel(sb.timestamp) - 0.15,
      endTime: rel(sb.timestamp) + 0.15,
      animation: "none",
      animDuration: 0.3,
      style: "broll_transition",
      zIndex: 60,
    });
  }

  // ── 11. Punch-in markers for talking-head sections ────────────────────────
  const punchPoints = vision.reframingInstructions.filter(
    (ri) => ri.isPunchIn && ri.timestamp >= clipStart && ri.timestamp <= clipEnd
  );
  for (const pp of punchPoints) {
    overlays.push({
      type: "punch_in_marker",
      content: {
        zoomFactor: String(pp.zoomFactor),
        cropX: String(pp.cropBox.x),
        cropY: String(pp.cropBox.y),
        cropW: String(pp.cropBox.width),
        cropH: String(pp.cropBox.height),
      },
      position: { x: 0.5, y: 0.5 },
      size: { width: 1, height: 1 },
      startTime: rel(pp.timestamp),
      endTime: rel(pp.timestamp) + 0.1,
      animation: "none",
      animDuration: 0.15,
      style: "punch_in",
      zIndex: 55,
    });
  }

  // ── 12. Color Grade metadata ───────────────────────────────────────────────
  if (vision.colorGradingSuggestions.length > 0) {
    const gradeMap: Record<string, string> = {};
    for (const cg of vision.colorGradingSuggestions) {
      gradeMap[cg.type] = String(cg.adjustment);
    }
    overlays.push({
      type: "color_grade",
      content: gradeMap,
      position: { x: 0.5, y: 0.5 },
      size: { width: 1, height: 1 },
      startTime: 0,
      endTime: clipDuration,
      animation: "none",
      animDuration: 0,
      style: "color_grade",
      zIndex: 1,
    });
  }

  return overlays;
}

// ─── Display label helpers ─────────────────────────────────────────────────────

const ROOM_DISPLAY_NAMES: Record<string, string> = {
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  living_room: "Living Room",
  dining_room: "Dining Room",
  bedroom: "Bedroom",
  master_bedroom: "Master Suite",
  closet: "Walk-in Closet",
  office: "Home Office",
  garage: "Garage",
  driveway: "Driveway",
  pool: "Pool",
  backyard: "Backyard",
  balcony: "Balcony",
  patio: "Patio",
  fireplace: "Fireplace",
  staircase: "Staircase",
  exterior: "Exterior",
  front_elevation: "Front Elevation",
  garden: "Garden",
  laundry: "Laundry Room",
  entryway: "Entryway",
  hallway: "Hallway",
  unknown: "",
};

export function formatRoomLabel(room: string): string {
  return ROOM_DISPLAY_NAMES[room] ?? room;
}

/**
 * Generate enhanced captions with keyword emphasis and face-safe positioning.
 */
export function generateEnhancedCaptions(
  segments: import("@/types").TranscriptSegment[],
  clipStart: number,
  clipEnd: number,
  improvements: import("@/types").CaptionImprovement[],
  template: import("@/types").TemplateConfig,
  framesInClip: FrameAnalysis[]
): import("@/types").Caption[] {
  const captionZone = computeSafeCaptionY(framesInClip);
  const clipSegments = segments.filter(
    (s) => s.end >= clipStart && s.start <= clipEnd
  );

  const improvementMap = new Map(
    improvements.map((imp) => [imp.original.trim().toLowerCase(), imp])
  );

  // Real estate keyword emphasis
  const RE_KEYWORDS = new Set([
    "bedroom", "bathroom", "kitchen", "pool", "garage", "sqft", "feet",
    "renovated", "updated", "luxury", "new", "custom", "open", "master",
    "suite", "walkout", "view", "private", "resort", "chef", "smart",
    "energy", "hardwood", "quartz", "granite", "marble", "stainless",
  ]);

  return clipSegments.map((seg) => {
    const relStart = Math.max(0, seg.start - clipStart);
    const relEnd = Math.max(0.1, seg.end - clipStart);

    const improvement = improvementMap.get(seg.text.trim().toLowerCase());
    const displayText = improvement?.improved ?? seg.cleaned_text ?? seg.text;

    // Keyword emphasis: find RE keywords in this segment
    const words = displayText.split(/\s+/);
    const highlightedWords: string[] = [];

    const lines: string[] = [];
    let currentLine: string[] = [];
    for (const word of words) {
      const clean = word.replace(/[^a-z]/gi, "").toLowerCase();
      if (RE_KEYWORDS.has(clean)) highlightedWords.push(word);
      currentLine.push(word);
      if (currentLine.length >= 6) {
        lines.push(currentLine.join(" "));
        currentLine = [];
      }
    }
    if (currentLine.length > 0) lines.push(currentLine.join(" "));

    return {
      start: relStart,
      end: relEnd,
      text: lines.join("\n"),
      style: template.caption_style,
      position: captionZone.zone,
      highlighted_words: [
        ...(improvement?.highlighted_keywords ?? []),
        ...highlightedWords,
      ],
    };
  });
}
