import { TranscriptSegment } from "./types";

export interface FinalizedTranscriptChunk {
  chunkId: string;
  speaker: TranscriptSegment["speaker"];
  startMs: number;
  endMs: number;
  textPartial?: string;
  textFinal: string;
  source: "realtime" | "replay";
}

export interface ConfirmationDetectorConfig {
  summaryPattern: RegExp;
  affirmationPattern: RegExp;
  affirmationWindowMs: number;
}

export const defaultConfirmationDetectorConfig: ConfirmationDetectorConfig = {
  summaryPattern: /\b(can i summarize|let me summarize|so what i(?:'| a)?m hearing)\b/i,
  affirmationPattern: /\b(yes|exactly|that'?s right|correct)\b/i,
  affirmationWindowMs: 20_000,
};
