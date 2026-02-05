import { randomUUID } from "node:crypto";
import {
  DirectionOption,
  InterviewScript,
  TranscriptSegment,
  ValidatedFeedback,
  WorktreeCandidate,
} from "./types";

export function simulateTranscript(script: InterviewScript): {
  transcript: TranscriptSegment[];
  validated: ValidatedFeedback[];
} {
  let cursor = 0;
  const transcript: TranscriptSegment[] = [];
  const validated: ValidatedFeedback[] = [];

  script.lines.forEach((line) => {
    const duration = Math.max(2.5, Math.min(7, line.text.length / 18));
    const segment: TranscriptSegment = {
      id: randomUUID(),
      speaker: line.speaker,
      t0: Number(cursor.toFixed(1)),
      t1: Number((cursor + duration).toFixed(1)),
      text: line.text,
      validated: Boolean(line.expectedValidation),
    };

    transcript.push(segment);

    if (line.expectedValidation) {
      validated.push({
        chunkId: segment.id,
        text: line.text,
        confidence: "high",
      });
    }

    cursor += duration + 0.8;
  });

  return { transcript, validated };
}

export function buildWorktrees(selectedDirections: DirectionOption[]): WorktreeCandidate[] {
  const primary = selectedDirections[0];

  const lanes: WorktreeCandidate[] = selectedDirections.map((direction, index) => ({
    name: direction.id,
    status: index === 0 ? "selected" : "queued",
    rationale:
      index === 0
        ? `Chosen first because the interview confirmed ${direction.title.toLowerCase()} with explicit agreement.`
        : `Prepared as follow-on direction after primary changes are validated.`,
    directionId: direction.id,
  }));

  lanes.push({
    name: "visual-polish-speculative",
    status: "speculative",
    rationale:
      primary
        ? `Optional polish lane after ${primary.title.toLowerCase()} lands.`
        : "Optional polish lane reserved for late-stage visual tweaks.",
  });

  return lanes;
}

export function buildDecisionLog(selectedDirections: DirectionOption[]): string[] {
  if (selectedDirections.length === 0) {
    return ["No directions were selected, so no iteration plan was generated."];
  }

  const primary = selectedDirections[0];
  const secondary = selectedDirections[1];

  const decisions = [
    `Heard: users requested improvement around ${primary.title.toLowerCase()}.`,
    `Inferred: implement UI-only changes that shorten the feedback loop in ${primary.title.toLowerCase()}.`,
  ];

  if (secondary) {
    decisions.push(
      `Deferred: ${secondary.title.toLowerCase()} remains queued until the first direction is reviewed.`
    );
  }

  decisions.push("Guardrail: no backend, schema, or auth hardening changes in this iteration.");

  return decisions;
}
