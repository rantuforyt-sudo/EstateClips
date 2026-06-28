import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVisionProvider } from "./vision";
import type {
  AIAnalysisResult,
  ContentType,
  TranscriptSegment,
  HighlightMoment,
  CaptionImprovement,
  DetectedRoom,
  PropertyDetails,
  TemplateConfig,
} from "@/types";

const ROOM_KEYWORDS: Record<string, string[]> = {
  Kitchen: [
    "kitchen",
    "countertop",
    "appliances",
    "stove",
    "refrigerator",
    "island",
    "cabinets",
    "pantry",
  ],
  "Living Room": [
    "living room",
    "lounge",
    "family room",
    "fireplace",
    "cozy",
    "open concept",
  ],
  Backyard: [
    "backyard",
    "outdoor",
    "patio",
    "garden",
    "yard",
    "landscaping",
    "deck",
    "pergola",
  ],
  Pool: ["pool", "swimming", "spa", "jacuzzi", "hot tub", "water feature"],
  Garage: [
    "garage",
    "parking",
    "car",
    "storage",
    "workshop",
    "2-car",
    "3-car",
  ],
  "Master Bedroom": [
    "master bedroom",
    "primary bedroom",
    "master suite",
    "en suite",
    "walk-in closet",
  ],
  Office: [
    "office",
    "study",
    "den",
    "work from home",
    "home office",
    "library",
  ],
  Bathroom: [
    "bathroom",
    "bath",
    "shower",
    "soaking tub",
    "dual vanity",
    "spa bath",
  ],
  Dining: [
    "dining room",
    "dining area",
    "breakfast nook",
    "formal dining",
    "eat-in",
  ],
};

const CONTENT_TEMPLATES: Record<ContentType, TemplateConfig> = {
  luxury_listing: {
    name: "Luxury Estate",
    font_style: "elegant",
    color_scheme: {
      primary: "#C9A84C",
      secondary: "#1a1a2e",
      text: "#FFFFFF",
      accent: "#E8D5A3",
    },
    animation_style: "smooth",
    overlay_position: "bottom",
    caption_style: {
      fontSize: "lg",
      fontWeight: "normal",
      color: "#FFFFFF",
      backgroundColor: "rgba(0,0,0,0.6)",
      animation: "fade",
      highlightColor: "#C9A84C",
    },
  },
  property_tour: {
    name: "Property Tour",
    font_style: "modern",
    color_scheme: {
      primary: "#3B82F6",
      secondary: "#1e293b",
      text: "#FFFFFF",
      accent: "#60A5FA",
    },
    animation_style: "dynamic",
    overlay_position: "bottom",
    caption_style: {
      fontSize: "md",
      fontWeight: "bold",
      color: "#FFFFFF",
      backgroundColor: "rgba(30,41,59,0.8)",
      animation: "pop",
      highlightColor: "#3B82F6",
    },
  },
  open_house: {
    name: "Open House",
    font_style: "bold",
    color_scheme: {
      primary: "#10B981",
      secondary: "#064e3b",
      text: "#FFFFFF",
      accent: "#34D399",
    },
    animation_style: "energetic",
    overlay_position: "top",
    caption_style: {
      fontSize: "lg",
      fontWeight: "bold",
      color: "#FFFFFF",
      backgroundColor: "rgba(6,78,59,0.85)",
      animation: "slide",
      highlightColor: "#10B981",
    },
  },
  market_update: {
    name: "Market Update",
    font_style: "modern",
    color_scheme: {
      primary: "#6366F1",
      secondary: "#1e1b4b",
      text: "#FFFFFF",
      accent: "#818CF8",
    },
    animation_style: "smooth",
    overlay_position: "bottom",
    caption_style: {
      fontSize: "md",
      fontWeight: "normal",
      color: "#FFFFFF",
      backgroundColor: "rgba(30,27,75,0.8)",
      animation: "fade",
      highlightColor: "#6366F1",
    },
  },
  neighborhood_tour: {
    name: "Neighborhood Tour",
    font_style: "casual",
    color_scheme: {
      primary: "#F59E0B",
      secondary: "#1c1917",
      text: "#FFFFFF",
      accent: "#FCD34D",
    },
    animation_style: "energetic",
    overlay_position: "bottom",
    caption_style: {
      fontSize: "md",
      fontWeight: "bold",
      color: "#FFFFFF",
      backgroundColor: "rgba(28,25,23,0.8)",
      animation: "pop",
      highlightColor: "#F59E0B",
    },
  },
  talking_head: {
    name: "Agent Reel",
    font_style: "bold",
    color_scheme: {
      primary: "#EC4899",
      secondary: "#1f1635",
      text: "#FFFFFF",
      accent: "#F9A8D4",
    },
    animation_style: "dynamic",
    overlay_position: "bottom",
    caption_style: {
      fontSize: "lg",
      fontWeight: "bold",
      color: "#FFFFFF",
      backgroundColor: "rgba(31,22,53,0.85)",
      animation: "pop",
      highlightColor: "#EC4899",
    },
  },
  listing_walkthrough: {
    name: "Listing Walkthrough",
    font_style: "modern",
    color_scheme: {
      primary: "#14B8A6",
      secondary: "#134e4a",
      text: "#FFFFFF",
      accent: "#2DD4BF",
    },
    animation_style: "smooth",
    overlay_position: "bottom",
    caption_style: {
      fontSize: "md",
      fontWeight: "normal",
      color: "#FFFFFF",
      backgroundColor: "rgba(19,78,74,0.8)",
      animation: "fade",
      highlightColor: "#14B8A6",
    },
  },
  unknown: {
    name: "Standard",
    font_style: "modern",
    color_scheme: {
      primary: "#3B82F6",
      secondary: "#1e293b",
      text: "#FFFFFF",
      accent: "#60A5FA",
    },
    animation_style: "smooth",
    overlay_position: "bottom",
    caption_style: {
      fontSize: "md",
      fontWeight: "normal",
      color: "#FFFFFF",
      backgroundColor: "rgba(0,0,0,0.7)",
      animation: "fade",
    },
  },
};

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "literally",
  "actually",
  "honestly",
  "right",
  "so",
  "yeah",
  "okay",
  "well",
  "kind of",
  "sort of",
  "I mean",
  "you see",
  "anyway",
];

export function getContentTemplate(contentType: ContentType): TemplateConfig {
  return CONTENT_TEMPLATES[contentType] ?? CONTENT_TEMPLATES.unknown;
}

export function detectRoomsFromTranscript(
  segments: TranscriptSegment[]
): DetectedRoom[] {
  const detected: DetectedRoom[] = [];
  const fullText = segments.map((s) => s.text.toLowerCase()).join(" ");

  for (const [room, keywords] of Object.entries(ROOM_KEYWORDS)) {
    const foundKeywords = keywords.filter((kw) => fullText.includes(kw));
    if (foundKeywords.length > 0) {
      // Find which segment first mentions this room
      let timestamp = 0;
      for (const seg of segments) {
        const segText = seg.text.toLowerCase();
        if (foundKeywords.some((kw) => segText.includes(kw))) {
          timestamp = seg.start;
          break;
        }
      }

      detected.push({
        name: room,
        timestamp,
        confidence: Math.min(foundKeywords.length / keywords.length + 0.3, 1),
        keywords_found: foundKeywords,
      });
    }
  }

  return detected;
}

export function cleanTranscriptSegments(
  segments: TranscriptSegment[]
): TranscriptSegment[] {
  return segments.map((seg) => {
    let cleaned = seg.text;

    // Remove filler words (case-insensitive)
    for (const filler of FILLER_WORDS) {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      cleaned = cleaned.replace(regex, "").trim();
    }

    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Fix common grammar issues
    cleaned = cleaned
      .replace(/\bi\b/g, "I")
      .replace(/\s+([.,!?])/g, "$1")
      .replace(/([.!?])\s*([a-z])/g, (_, p1, p2) => `${p1} ${p2.toUpperCase()}`);

    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return { ...seg, cleaned_text: cleaned };
  });
}

export async function analyzeVideoWithGemini(
  transcript: TranscriptSegment[],
  videoDuration: number,
  filename: string,
  videoUrl?: string
): Promise<AIAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const transcriptText = transcript
    .map((s) => `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s]: ${s.text}`)
    .join("\n");

  const prompt = `You are an AI assistant specialized in real estate video content analysis.

Analyze this real estate video transcript and return a JSON response.

Filename: ${filename}
Duration: ${videoDuration} seconds
Transcript:
${transcriptText}

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "content_type": "property_tour|luxury_listing|open_house|market_update|neighborhood_tour|talking_head|listing_walkthrough|unknown",
  "confidence": 0.0-1.0,
  "property_details": {
    "address": "detected address or null",
    "price": "detected price or null",
    "bedrooms": number_or_null,
    "bathrooms": number_or_null,
    "sqft": number_or_null,
    "agent_name": "detected name or null",
    "brokerage": "detected brokerage or null",
    "open_house_date": "date string or null",
    "open_house_time": "time string or null",
    "neighborhood": "neighborhood name or null",
    "features": ["feature1", "feature2"]
  },
  "highlights": [
    {
      "start": start_seconds,
      "end": end_seconds,
      "score": 0.0-1.0,
      "reason": "why this is a highlight",
      "suggested_title": "Short engaging clip title",
      "room_context": "room name or null"
    }
  ],
  "caption_improvements": [
    {
      "segment_index": 0,
      "original": "original text",
      "improved": "cleaned improved text",
      "removed_fillers": ["um", "uh"],
      "highlighted_keywords": ["keyword1", "keyword2"]
    }
  ],
  "key_selling_points": ["point1", "point2", "point3"]
}

Rules:
- Identify 3-6 highlight moments that would make compelling 15-60 second clips
- Each clip MUST be between 15 and 60 seconds long
- Prioritize: unique features, emotional moments, key selling points, strong visuals described
- For luxury listings: focus on premium features, views, finishes
- For open houses: include property details prominently  
- For neighborhood tours: highlight schools, parks, restaurants
- For talking head: focus on engaging moments, calls to action
- NEVER invent property details not mentioned in the transcript
- Clean up fillers but preserve the speaker's meaning and all factual claims`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Strip any accidental markdown
    const clean = text
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(clean) as {
      content_type: ContentType;
      property_details: PropertyDetails;
      highlights: HighlightMoment[];
      caption_improvements: CaptionImprovement[];
    };

    const detected_rooms = detectRoomsFromTranscript(transcript);
    const template_recommendation = getContentTemplate(parsed.content_type);

    // Run computer vision analysis if a video URL is available
    let vision_result;
    if (videoUrl) {
      try {
        const visionProvider = getVisionProvider();
        vision_result = await visionProvider.analyzeVideo(videoUrl, videoDuration, {
          frameSampleInterval: 3,
          detectFaces: true,
          detectShots: true,
        });

        // Merge vision-detected rooms with transcript-detected rooms
        for (const rs of vision_result.roomSequence) {
          if (rs.confidence < 0.55) continue;
          const displayName = rs.room
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

          const alreadyFound = detected_rooms.some(
            (r) => r.name.toLowerCase() === displayName.toLowerCase()
          );
          if (!alreadyFound) {
            detected_rooms.push({
              name: displayName,
              timestamp: rs.startTime,
              confidence: rs.confidence,
              keywords_found: ["vision_detected"],
            });
          }
        }
      } catch (visionError) {
        console.warn("Vision analysis failed, proceeding without it:", visionError);
      }
    }

    return {
      content_type: parsed.content_type || "unknown",
      property_details: parsed.property_details || {},
      highlights: (parsed.highlights || []).map((h) => ({
        ...h,
        start: Math.max(0, h.start),
        end: Math.min(videoDuration, h.end),
      })),
      caption_improvements: parsed.caption_improvements || [],
      detected_rooms,
      template_recommendation,
      vision_result,
    };
  } catch (error) {
    console.error("Gemini analysis error:", error);

    // Fallback: create basic highlights from transcript
    const highlights = createFallbackHighlights(transcript, videoDuration);
    const detected_rooms = detectRoomsFromTranscript(transcript);

    return {
      content_type: "unknown",
      property_details: {},
      highlights,
      caption_improvements: [],
      detected_rooms,
      template_recommendation: getContentTemplate("unknown"),
      vision_result: undefined,
    };
  }
}

function createFallbackHighlights(
  segments: TranscriptSegment[],
  duration: number
): HighlightMoment[] {
  if (segments.length === 0) {
    // No transcript, create evenly spaced clips
    const clipDuration = Math.min(30, duration);
    const clips: HighlightMoment[] = [];

    for (let i = 0; i < Math.min(3, Math.floor(duration / clipDuration)); i++) {
      clips.push({
        start: i * clipDuration,
        end: i * clipDuration + clipDuration,
        score: 0.7,
        reason: "Auto-detected segment",
        suggested_title: `Clip ${i + 1}`,
      });
    }

    return clips;
  }

  // Use first third, middle, and last third of video
  const highlights: HighlightMoment[] = [];
  const segCount = segments.length;

  const sections = [
    { start: 0, end: Math.floor(segCount * 0.35) },
    { start: Math.floor(segCount * 0.35), end: Math.floor(segCount * 0.7) },
    { start: Math.floor(segCount * 0.7), end: segCount - 1 },
  ];

  for (const section of sections) {
    const startSeg = segments[section.start];
    const endSeg = segments[Math.min(section.end, segCount - 1)];

    if (!startSeg || !endSeg) continue;

    const clipDuration = endSeg.end - startSeg.start;
    if (clipDuration < 15) continue;

    // Cap at 60 seconds
    const actualEnd = Math.min(endSeg.end, startSeg.start + 60);

    highlights.push({
      start: startSeg.start,
      end: actualEnd,
      score: 0.6,
      reason: "Auto-detected video section",
      suggested_title: `Property Highlight ${highlights.length + 1}`,
    });
  }

  return highlights.slice(0, 4);
}

export function generateCaptionsForClip(
  segments: TranscriptSegment[],
  clipStart: number,
  clipEnd: number,
  improvements: CaptionImprovement[],
  template: TemplateConfig
) {
  const clipSegments = segments.filter(
    (s) => s.end >= clipStart && s.start <= clipEnd
  );

  const improvementMap = new Map(
    improvements.map((imp) => [imp.original.trim().toLowerCase(), imp])
  );

  return clipSegments.map((seg) => {
    const relativeStart = seg.start - clipStart;
    const relativeEnd = seg.end - clipStart;

    const improvement = improvementMap.get(seg.text.trim().toLowerCase());
    const displayText = improvement?.improved || seg.cleaned_text || seg.text;

    // Extract keywords to highlight
    const highlightedWords = improvement?.highlighted_keywords || [];

    // Natural caption splitting (max ~7 words per line)
    const words = displayText.split(" ");
    const lines: string[] = [];
    let currentLine: string[] = [];

    for (const word of words) {
      currentLine.push(word);
      if (currentLine.length >= 6) {
        lines.push(currentLine.join(" "));
        currentLine = [];
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join(" "));
    }

    return {
      start: Math.max(0, relativeStart),
      end: Math.max(0.1, relativeEnd),
      text: lines.join("\n"),
      style: template.caption_style,
      position: "safe" as const,
      highlighted_words: highlightedWords,
    };
  });
}
