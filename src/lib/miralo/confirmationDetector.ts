import { randomUUID } from "node:crypto";
import {
  defaultConfirmationDetectorConfig,
  FinalizedTranscriptChunk,
} from "./realtimeTypes";
import {
  TranscriptSegment,
  ValidatedDirectionCreatedEvent,
  ValidatedFeedback,
} from "./types";

const SUPPORTING_WINDOW_SIZE = 4;

function isInterviewer(speaker: TranscriptSegment["speaker"]): boolean {
  return speaker === "Interviewer";
}

function isInterviewee(speaker: TranscriptSegment["speaker"]): boolean {
  return speaker === "Interviewee";
}

function segmentTimeMs(segment: TranscriptSegment): { startMs: number; endMs: number } {
  return {
    startMs: Math.round(segment.t0 * 1000),
    endMs: Math.round(segment.t1 * 1000),
  };
}

export function finalizeChunkToSegment(chunk: FinalizedTranscriptChunk): TranscriptSegment {
  const isSummaryCandidate =
    isInterviewer(chunk.speaker) &&
    defaultConfirmationDetectorConfig.summaryPattern.test(chunk.textFinal);

  const isAffirmation =
    isInterviewee(chunk.speaker) &&
    defaultConfirmationDetectorConfig.affirmationPattern.test(chunk.textFinal);

  return {
    id: chunk.chunkId,
    speaker: chunk.speaker,
    t0: Number((chunk.startMs / 1000).toFixed(1)),
    t1: Number((chunk.endMs / 1000).toFixed(1)),
    text: chunk.textFinal,
    textPartial: chunk.textPartial,
    textFinal: chunk.textFinal,
    source: chunk.source,
    isSummaryCandidate,
    isAffirmation,
    validated: false,
  };
}

export function detectValidatedDirection(params: {
  transcript: TranscriptSegment[];
  newChunk: TranscriptSegment;
  existingValidated: ValidatedFeedback[];
}): ValidatedDirectionCreatedEvent | null {
  const { transcript, newChunk, existingValidated } = params;

  if (!newChunk.isAffirmation || !isInterviewee(newChunk.speaker)) {
    return null;
  }

  const usedSummaryIds = new Set(
    existingValidated.map((item) => item.summaryChunkId).filter(Boolean) as string[]
  );

  const candidates = transcript
    .filter((segment) => segment.isSummaryCandidate && isInterviewer(segment.speaker))
    .filter((segment) => !usedSummaryIds.has(segment.id))
    .filter((segment) => {
      const summaryTime = segmentTimeMs(segment);
      const affirmationTime = segmentTimeMs(newChunk);

      return (
        affirmationTime.startMs >= summaryTime.endMs &&
        affirmationTime.startMs - summaryTime.endMs <=
          defaultConfirmationDetectorConfig.affirmationWindowMs
      );
    });

  if (candidates.length === 0) {
    return null;
  }

  const summaryChunk = candidates[candidates.length - 1];
  const summaryTime = segmentTimeMs(summaryChunk);
  const affirmationTime = segmentTimeMs(newChunk);

  const supportingChunkIds = transcript
    .filter((segment) => isInterviewee(segment.speaker))
    .filter((segment) => {
      const ms = segmentTimeMs(segment);
      return ms.startMs >= summaryTime.startMs && ms.endMs <= affirmationTime.endMs;
    })
    .slice(-SUPPORTING_WINDOW_SIZE)
    .map((segment) => segment.id);

  return {
    id: randomUUID(),
    summaryChunkId: summaryChunk.id,
    affirmationChunkId: newChunk.id,
    validatedText: summaryChunk.textFinal || summaryChunk.text,
    supportingChunkIds,
    timestamp: new Date().toISOString(),
    confidence: "high",
  };
}
