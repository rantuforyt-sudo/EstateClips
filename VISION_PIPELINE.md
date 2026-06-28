# EstateClips — Advanced AI Vision Pipeline

## What was added

This document describes every new feature, file, and configuration added on top of the existing EstateClips codebase. No existing functionality was removed or broken.

---

## Architecture overview

```
Upload video
    │
    ▼
/api/process  (POST)
    │
    ├─ 1. Validate
    ├─ 2. Transcribe (existing Whisper/Gemini path)
    ├─ 3. AI text analysis → Gemini 1.5 Flash (existing)
    ├─ 4. Computer vision pass → VisionProvider (NEW)
    │       └─ GeminiVisionProvider (default)
    │           → face detection, room detection, shot boundaries,
    │             audio analysis, color grading suggestions,
    │             talking-head segments, reframing instructions
    ├─ 5. Clip scoring → scoreAndRankClips (NEW)
    │       └─ Combines transcript score + 7 visual signals
    │           → clips returned best-first
    ├─ 6. Caption generation → generateEnhancedCaptions (NEW)
    │       └─ face-safe placement, real-estate keyword emphasis
    ├─ 7. Overlay generation → generateAdvancedOverlays (NEW)
    │       └─ hook text, lower-thirds, price badge, address banner,
    │          room labels, feature tags, property stats, open house
    │          banner, luxury frame, B-roll transitions, punch-ins,
    │          color grade metadata
    └─ 8. Persist clips → sorted by composite_score
```

---

## New files

### `src/lib/vision/types.ts`
All TypeScript interfaces for the vision pipeline. Defines `VisionProvider`, `VisionAnalysisResult`, `FrameAnalysis`, `FaceDetection`, `ShotBoundary`, `ReframingInstruction`, `AudioAnalysis`, `ColorGradingSuggestion`, and 21 `RoomLabel` values.

### `src/lib/vision/gemini-provider.ts`
Implements `VisionProvider` using Gemini 1.5 Flash multimodal analysis. Sends the signed video URL and a structured prompt requesting per-frame data including:
- Face detection (center X/Y, relative size)
- Room classification (21 classes)
- Motion vectors
- Brightness & exposure quality
- Shot boundary type (cut/fade/dissolve)
- Speech detection
- Property feature strings ("quartz waterfall island")
- Visual quality score

Has a graceful fallback that returns synthetic frame data if the API call fails.

### `src/lib/vision/index.ts`
**Provider registry** — swap vision backends here without touching any call site:

```typescript
// To add a new provider:
// 1. Implement VisionProvider in a new file
// 2. Register it here:
const providers = {
  gemini: () => new GeminiVisionProvider(),
  openai: () => new OpenAIVisionProvider(),     // future
  rekognition: () => new RekognitionProvider(), // future
  yolo: () => new YoloLocalProvider(),          // future
};

// 3. Set the env var:
VISION_PROVIDER=openai
```

### `src/lib/clip-scorer.ts`
Scores and ranks clips using 8 weighted signals:

| Signal | Weight | Source |
|--------|--------|--------|
| Transcript score | 22% | Gemini text analysis |
| Visual quality | 18% | Per-frame quality avg |
| Face presence | 12% | Face detection ratio |
| Room confidence | 10% | Vision room detection |
| Production quality | 12% | Overall vision score |
| Speech density | 12% | Frame-level speech detection |
| Boundary alignment | 8% | Distance to nearest shot boundary |
| Premium room bonus | 6% | Pool, master bed, kitchen, etc. |

### `src/lib/overlay-generator.ts`
Generates all overlay specs. Each overlay has: `type`, `content`, normalized `position`/`size`, `startTime`/`endTime`, `animation`, `animDuration`, `style`, `zIndex`.

**Overlay types produced:**
- `hook_text` — first 3 seconds, content-type-aware hook templates (e.g. "This is what $2.4M looks like")
- `lower_third` — agent name + brokerage, 4 seconds after hook, luxury vs standard styles
- `price_badge` — top-right corner, "Listed at" or "Open House" label
- `address_banner` — address + bed/bath/sqft stats, face-safe (appears at top if face is in bottom half)
- `room_label` — synced to each room in the vision room sequence, pill with accent background
- `feature_tag` — floating right edge tags from per-frame property feature detection
- `property_stats` — beds/baths/sqft trio at clip end
- `open_house_info` — full-width banner with date/time for open house content
- `luxury_frame` — subtle gold border, only on luxury_listing content
- `broll_transition` — shot boundary markers (metadata, not visual)
- `punch_in_marker` — reframing keyframes (metadata for export)
- `color_grade` — exposure/contrast/saturation adjustments (metadata for export)

**Caption placement** uses `computeSafeCaptionY()` which averages face center-Y across frames and flips captions to the opposite half to avoid covering faces.

**Hook text templates** are content-type-specific, with property detail substitution:
```
luxury_listing: "This is what ${price} looks like"
open_house:     "Open house this ${open_house_date}!"
talking_head:   "Real estate tip you need to know"
```

### `src/components/clips/OverlayRenderer.tsx`
Client-side React component that renders all visual overlay types on top of the video player using Framer Motion animations. Reads `currentTime` and filters to active overlays. Supports all 4 animation presets (fade_in, slide_up, slide_down, scale_in). Non-visual types (punch_in_marker, broll_transition, color_grade) are skipped.

### `src/components/clips/VisionInsightsPanel.tsx`
Collapsible panel on the project detail page showing:
- Detected rooms/spaces with icons and confidence %
- Production quality bars (overall, visual, exposure)
- Audio analysis (LUFS, silence count, noise detection)
- Shot boundary timestamps
- Color correction suggestions with +/- adjustment
- Property features detected

### `src/components/clips/ExportPanel.tsx`
Collapsible export options panel inside each ClipCard:
- Aspect ratio selector: 9:16 (TikTok/Reels), 16:9 (YouTube), 1:1 (Instagram), 4:5 (Portrait)
- Toggle: include motion graphics & overlays
- Toggle: include captions
- Toggle: include AI color correction
- Calls `/api/clips/export` which returns `export_spec` with full crop, reframing, color, overlay and caption data

### `src/app/api/clips/export/route.ts`
POST endpoint that:
1. Validates clip ownership
2. Generates a signed 1-hour source video URL
3. Computes center-crop for target aspect ratio
4. Extracts color grade, reframing keyframes, and silence segments from overlay metadata
5. Returns a structured `export_spec` for client-side or external FFmpeg rendering
6. Logs to `clip_exports` table

### `supabase/migrations/002_vision_pipeline.sql`
Run this after `001_initial_schema.sql`:
- `clips.composite_score` — final scored clip rank
- `clips.vision_signals` — individual scoring signal breakdown
- `clips.reframing_instructions` — per-clip reframing data
- `projects.vision_enabled` — whether vision pass ran
- `projects.production_quality` — from vision analysis
- `ranked_clips` view — clips pre-sorted by effective score with `rank_in_project`
- `room_detections` table — room-level detail records
- `clip_exports` table — export attempt log

---

## Modified files

### `src/lib/ai-pipeline.ts`
- `analyzeVideoWithGemini` now accepts optional `videoUrl` param
- After text analysis, runs computer vision via `getVisionProvider()`
- Merges vision-detected rooms with transcript-detected rooms (deduped)
- Returns `vision_result` in `AIAnalysisResult`
- Fallback returns `vision_result: undefined` gracefully

### `src/lib/vision/types.ts` *(new — see above)*

### `src/types/index.ts`
- `SceneAnalysis.vision_result` — optional vision result field
- `ProcessingStep` — added: `running_vision`, `detecting_rooms`, `scoring_clips`, `building_overlays`
- `HighlightMoment.composite_score` — optional final composite score
- `AIAnalysisResult.vision_result` — optional vision result

### `src/app/api/process/route.ts`
- Now passes signed video URL to `analyzeVideoWithGemini`
- Uses `scoreAndRankClips` when vision is available
- Uses `generateEnhancedCaptions` (face-safe, keyword emphasis)
- Uses `generateAdvancedOverlays` (all 12 overlay types)
- Falls back to `generateLegacyOverlays` when vision unavailable
- Fetches agent profile for lower-third autofill
- New steps: `running_vision`, `scoring_clips`, `building_overlays`
- Returns `vision_enabled`, `production_quality` in response

### `src/utils/index.ts`
- `getProcessingStepLabel` — added human labels for all new steps

### `src/components/clips/ClipCard.tsx`
- `showOverlays` state toggle
- `OverlayRenderer` overlaid on video at correct `currentTime`
- Layers icon toggles overlays on/off
- `ExportPanel` replaces the single Download button

### `src/app/dashboard/projects/[id]/page.tsx`
- Imports `VisionInsightsPanel` and `SceneAnalysis`
- Clips sorted best-first by `composite_score ?? highlight_score`
- "Sorted best-first by AI score" label above clip grid
- `VisionInsightsPanel` shown in the property info section
- Extended `ROOM_ICONS` map covering all 21 room labels
- `production_quality` passed from project to the panel

---

## Environment variables

No new required variables. Optional:

```bash
# Select vision provider (default: gemini)
VISION_PROVIDER=gemini

# All existing vars still required:
GEMINI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Swapping the vision provider

1. Create `src/lib/vision/my-provider.ts` implementing `VisionProvider`
2. Register it in `src/lib/vision/index.ts`:
   ```typescript
   import { MyProvider } from "./my-provider";
   const providers = {
     gemini: () => new GeminiVisionProvider(),
     myprovider: () => new MyProvider(),
   };
   ```
3. Set `VISION_PROVIDER=myprovider` in your environment

No other files need to change. The interface is fully typed.

---

## Free-tier usage

All new AI features use the existing `GEMINI_API_KEY`:
- Vision analysis runs one additional Gemini 1.5 Flash call per video
- Gemini 1.5 Flash has a generous free tier (15 RPM, 1M TPM on free)
- No new paid services or npm packages are required
- All overlay rendering is pure CSS/Framer Motion (no canvas lib)
- Export spec generation is pure TypeScript (no FFmpeg on server)

---

## Vercel compatibility

- All new server code is in Next.js API routes (Edge-compatible where needed)
- No binary dependencies added
- Vision provider call is async with a 15-second internal timeout via Gemini SDK
- Vercel function timeout: the process route now has more work but Vercel Pro allows 60s; configure `maxDuration = 60` in `vercel.json` if needed:

```json
{
  "functions": {
    "src/app/api/process/route.ts": {
      "maxDuration": 60
    }
  }
}
```
