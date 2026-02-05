import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { createIterationPlan } from "./iterationPlanner";
import { maybeGenerateJson } from "./openaiAdapter";
import { analyzeRepoDeterministic, resolveRepoPath } from "./repoAnalyzer";
import { detectValidatedDirection, finalizeChunkToSegment } from "./confirmationDetector";
import {
  createSession,
  readSession,
  updateSession,
} from "./sessionStore";
import { buildDecisionLog, buildWorktrees, simulateTranscript } from "./sessionSimulator";
import { generateInterviewScript } from "./scriptGenerator";
import {
  AnalyzeRepoInput,
  DirectionOption,
  GenerateScriptInput,
  IntakeState,
  MiraloSession,
  TranscriptFinalizeInput,
  ValidatedFeedback,
  ValidatedDirectionCreatedEvent,
} from "./types";

function sanitizeIntake(input: AnalyzeRepoInput): IntakeState {
  const safeRepo = resolveRepoPath(input.repoPath || process.cwd());

  return {
    repoPath: safeRepo,
    guidanceMode: input.guidanceMode,
    hasHypotheses: Boolean(input.hasHypotheses),
    hasScript: Boolean(input.hasScript),
    hypothesesNotes: input.hypothesesNotes?.trim() || undefined,
    scriptNotes: input.scriptNotes?.trim() || undefined,
  };
}

export async function analyzeRepoAndPersist(input: AnalyzeRepoInput): Promise<MiraloSession> {
  const intake = sanitizeIntake(input);
  const baseAnalysis = await analyzeRepoDeterministic(intake.repoPath);

  const enhanced = await maybeGenerateJson<{
    summary?: string;
    capabilities?: string[];
    directions?: DirectionOption[];
  }>({
    task: "analyze-repo",
    maxTokens: 700,
    input: {
      intake,
      baseAnalysis,
    },
  });

  const analysis = {
    ...baseAnalysis,
    summary: enhanced?.summary || baseAnalysis.summary,
    capabilities: enhanced?.capabilities || baseAnalysis.capabilities,
    directions:
      enhanced?.directions && enhanced.directions.length >= 3
        ? enhanced.directions.slice(0, 5)
        : baseAnalysis.directions,
  };

  if (input.sessionId) {
    const updated = await updateSession(input.sessionId, (current) => ({
      ...current,
      intake,
      analysis,
    }));

    if (updated) {
      return updated;
    }
  }

  const created = await createSession({ intake });
  const updated = await updateSession(created.id, (current) => ({
    ...current,
    analysis,
  }));

  if (!updated) {
    throw new Error("Failed to persist analysis session.");
  }

  return updated;
}

export async function generateScriptAndPersist(input: GenerateScriptInput): Promise<MiraloSession> {
  const session = await readSession(input.sessionId);
  if (!session || !session.analysis) {
    throw new Error("Session missing or analysis unavailable.");
  }

  const selectedDirections = session.analysis.directions.filter((direction) =>
    input.selectedDirectionIds.includes(direction.id)
  );

  if (selectedDirections.length === 0 || selectedDirections.length > 2) {
    throw new Error("Select between 1 and 2 valid directions.");
  }

  const deterministicScript = generateInterviewScript({
    analysisId: session.analysis.id,
    selectedDirections,
  });

  const enhanced = await maybeGenerateJson<{ title?: string; lines?: typeof deterministicScript.lines }>({
    task: "generate-script",
    maxTokens: 900,
    input: {
      intake: session.intake,
      selectedDirections,
      script: deterministicScript,
    },
  });

  const script = {
    ...deterministicScript,
    title: enhanced?.title || deterministicScript.title,
    lines:
      enhanced?.lines && enhanced.lines.length >= deterministicScript.lines.length / 2
        ? enhanced.lines
        : deterministicScript.lines,
  };

  const updated = await updateSession(session.id, (current) => ({
    ...current,
    script,
    worktrees: buildWorktrees(selectedDirections),
    decisionLog: buildDecisionLog(selectedDirections),
  }));

  if (!updated) {
    throw new Error("Failed to persist generated script.");
  }

  return updated;
}

export async function runInterviewSession(sessionId: string): Promise<MiraloSession> {
  const session = await readSession(sessionId);
  if (!session || !session.script || !session.analysis) {
    throw new Error("Session is missing script or analysis.");
  }

  const { transcript, validated } = simulateTranscript(session.script);

  const updated = await updateSession(session.id, (current) => ({
    ...current,
    transcript,
    validatedFeedback: validated,
  }));

  if (!updated) {
    throw new Error("Failed to persist interview run.");
  }

  return updated;
}

export async function createIteration(sessionId: string): Promise<MiraloSession> {
  const session = await readSession(sessionId);
  if (!session || !session.analysis) {
    throw new Error("Session not found.");
  }

  const selected = session.analysis.directions.filter((direction) =>
    session.script?.selectedDirectionIds.includes(direction.id)
  );

  const plan = await createIterationPlan(session, selected);

  const updated = await updateSession(session.id, (current) => ({
    ...current,
    iteration: plan,
  }));

  if (!updated) {
    throw new Error("Failed to persist iteration plan.");
  }

  return updated;
}

export async function finalizeTranscriptChunkAndPersist(
  input: TranscriptFinalizeInput
): Promise<{ session: MiraloSession; createdEvent: ValidatedDirectionCreatedEvent | null }> {
  const session = await readSession(input.sessionId);
  if (!session) {
    throw new Error("Session not found.");
  }

  const newSegment = finalizeChunkToSegment({
    chunkId: input.chunkId,
    speaker: input.speaker,
    startMs: input.startMs,
    endMs: input.endMs,
    textPartial: input.textPartial,
    textFinal: input.textFinal,
    source: input.source || "realtime",
  });

  const existingTranscript = session.transcript.filter((segment) => segment.id !== newSegment.id);
  const transcript = [...existingTranscript, newSegment].sort((a, b) => a.t0 - b.t0);

  const createdEvent = detectValidatedDirection({
    transcript,
    newChunk: newSegment,
    existingValidated: session.validatedFeedback,
  });

  const validatedFeedback: ValidatedFeedback[] = [...session.validatedFeedback];

  if (createdEvent) {
    const alreadyExists = validatedFeedback.some(
      (item) =>
        item.summaryChunkId === createdEvent.summaryChunkId &&
        item.affirmationChunkId === createdEvent.affirmationChunkId
    );

    if (!alreadyExists) {
      validatedFeedback.push({
        chunkId: createdEvent.summaryChunkId,
        text: createdEvent.validatedText,
        confidence: createdEvent.confidence,
        summaryChunkId: createdEvent.summaryChunkId,
        affirmationChunkId: createdEvent.affirmationChunkId,
        supportingChunkIds: createdEvent.supportingChunkIds,
      });
    }
  }

  const highlightedChunkIds = new Set<string>();
  for (const item of validatedFeedback) {
    if (item.summaryChunkId) {
      highlightedChunkIds.add(item.summaryChunkId);
    }
    if (item.affirmationChunkId) {
      highlightedChunkIds.add(item.affirmationChunkId);
    }
  }

  const normalizedTranscript = transcript.map((segment) => ({
    ...segment,
    validated: highlightedChunkIds.has(segment.id),
  }));

  const updated = await updateSession(session.id, (current) => ({
    ...current,
    transcript: normalizedTranscript,
    validatedFeedback,
  }));

  if (!updated) {
    throw new Error("Failed to persist transcript chunk.");
  }

  return { session: updated, createdEvent };
}

export async function latestValidatorArtifacts() {
  const recordingsDir = path.resolve(process.cwd(), "miralo/runtime/recordings");
  const list = await readdir(recordingsDir).catch(() => [] as string[]);

  const videos = list.filter((file) => file.endsWith(".webm")).sort();
  const screenshots = list.filter((file) => file.endsWith(".png")).sort();

  return {
    readyToShow: videos.length > 0,
    latestVideo: videos.length > 0 ? path.join(recordingsDir, videos[videos.length - 1]) : null,
    latestScreenshot:
      screenshots.length > 0 ? path.join(recordingsDir, screenshots[screenshots.length - 1]) : null,
  };
}

export async function replayTranscriptFromSample(sessionId: string): Promise<MiraloSession> {
  const session = await readSession(sessionId);
  if (!session) {
    throw new Error("Session not found.");
  }

  const samplePath = path.resolve(
    process.cwd(),
    "miralo/runtime/transcripts/sample-transcript.json"
  );
  const raw = await readFile(samplePath, "utf8");
  const sample = JSON.parse(raw) as Array<{
    id: string;
    t0: number;
    t1: number;
    speaker: "Interviewer" | "Interviewee";
    text: string;
    validated?: boolean;
  }>;

  const transcript = sample.map((chunk) => ({
    id: chunk.id,
    speaker: chunk.speaker,
    t0: chunk.t0,
    t1: chunk.t1,
    text: chunk.text,
    textFinal: chunk.text,
    source: "replay" as const,
    validated: Boolean(chunk.validated),
  }));

  const validatedFeedback = transcript
    .filter((chunk) => chunk.validated)
    .map((chunk) => ({
      chunkId: chunk.id,
      text: chunk.text,
      confidence: "high" as const,
    }));

  const updated = await updateSession(session.id, (current) => ({
    ...current,
    transcript,
    validatedFeedback,
  }));

  if (!updated) {
    throw new Error("Failed to persist replay transcript.");
  }

  return updated;
}
