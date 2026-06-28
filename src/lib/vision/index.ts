/**
 * Vision provider registry.
 *
 * To swap to a different vision backend (e.g. OpenAI Vision, AWS Rekognition,
 * or a self-hosted YOLO model), implement VisionProvider and change the
 * `activeProvider` export below. No other files need to change.
 */

import { GeminiVisionProvider } from "./gemini-provider";
import type { VisionProvider } from "./types";

export * from "./types";

// ─── Register providers here ─────────────────────────────────────────────────
const providers: Record<string, () => VisionProvider> = {
  gemini: () => new GeminiVisionProvider(),
  // openai: () => new OpenAIVisionProvider(),      // future
  // rekognition: () => new RekognitionProvider(),  // future
  // yolo: () => new YoloProvider(),                // future
};

// ─── Active provider selection ────────────────────────────────────────────────
const providerName = process.env.VISION_PROVIDER ?? "gemini";

export function getVisionProvider(): VisionProvider {
  const factory = providers[providerName];
  if (!factory) {
    console.warn(
      `Unknown VISION_PROVIDER "${providerName}", falling back to gemini`
    );
    return new GeminiVisionProvider();
  }
  return factory();
}
