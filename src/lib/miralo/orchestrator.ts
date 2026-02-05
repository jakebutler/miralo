import { randomUUID } from "node:crypto";
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { createIterationPlan } from "./iterationPlanner";
import { generateSessionSpecs } from "./specGenerator";
import { maybeGenerateJson } from "./openaiAdapter";
import { analyzeRepoDeterministic, buildRepoContext, resolveRepoPath } from "./repoAnalyzer";
import { detectValidatedDirection, finalizeChunkToSegment } from "./confirmationDetector";
import {
  createSession,
  readSession,
  updateSession,
} from "./sessionStore";
import { buildWorktrees, simulateTranscript } from "./sessionSimulator";
import { generateInterviewScript } from "./scriptGenerator";
import {
  AnalyzeRepoInput,
  DirectionOption,
  GenerateScriptInput,
  IntakeState,
  MiraloSession,
  ScriptLine,
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pickFirstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function normalizeConfidence(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const clamped = Math.max(0, Math.min(1, parsed));
  return Number(clamped.toFixed(2));
}

function normalizeDirectionId(value: string, index: number): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || `direction-${index + 1}`;
}

function normalizeDirectionOption(value: unknown, index: number): DirectionOption | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const title = pickFirstString(record.title, record.name, record.hypothesis, record.topic);
  const reason = pickFirstString(record.reason, record.rationale, record.why, record.problem);
  const interviewFocus = pickFirstString(
    record.interviewFocus,
    record.interview_focus,
    record.discoveryQuestion,
    record.discovery,
    record.question
  );

  if (!title || !reason || !interviewFocus) {
    return null;
  }

  const idSource = pickFirstString(record.id, title) || `direction-${index + 1}`;
  const fallbackConfidence = Math.max(0.55, 0.82 - index * 0.05);

  return {
    id: normalizeDirectionId(idSource, index),
    title,
    reason,
    interviewFocus,
    confidence: normalizeConfidence(record.confidence, fallbackConfidence),
  };
}

function normalizeDirectionsFromEnhanced(value: unknown): DirectionOption[] {
  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const candidates = [
    record.directions,
    record.hypotheses,
    record.options,
    record.recommendations,
    record.priorities,
  ];
  const source = candidates.find((candidate) => Array.isArray(candidate));
  if (!Array.isArray(source)) {
    return [];
  }

  const seen = new Set<string>();
  const directions: DirectionOption[] = [];
  source.forEach((item, index) => {
    const normalized = normalizeDirectionOption(item, index);
    if (!normalized || seen.has(normalized.id)) {
      return;
    }
    seen.add(normalized.id);
    directions.push(normalized);
  });

  return directions.slice(0, 5);
}

function normalizeCapabilitiesFromEnhanced(value: unknown): string[] {
  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const candidates = [record.capabilities, record.keyCapabilities, record.strengths, record.signals];
  const strings: string[] = [];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }
    for (const item of candidate) {
      if (typeof item !== "string" || item.trim().length === 0) {
        continue;
      }
      strings.push(item.trim());
    }
  }

  return Array.from(new Set(strings)).slice(0, 8);
}

function normalizeSummaryFromEnhanced(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return pickFirstString(record.summary, record.overview, record.repoSummary, record.analysisSummary);
}

function normalizeSpeaker(value: unknown): "Interviewer" | "Interviewee" {
  const raw = pickFirstString(value)?.toLowerCase() || "";
  if (/(interviewee|participant|user|customer|client|stakeholder|guest)/.test(raw)) {
    return "Interviewee";
  }
  return "Interviewer";
}

function normalizeBeat(value: unknown, text: string): "explore" | "summary" | "confirmation" {
  const merged = `${pickFirstString(value) || ""} ${text}`.toLowerCase();
  if (/(confirmation|confirm|affirm|agree|yes[,!.\s]|that's right|that is right)/.test(merged)) {
    return "confirmation";
  }
  if (/(summary|summarize|recap|restate)/.test(merged)) {
    return "summary";
  }
  return "explore";
}

function normalizeScriptLine(value: unknown): ScriptLine | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const text = pickFirstString(
    record.text,
    record.line,
    record.content,
    record.utterance,
    record.message
  );
  if (!text) {
    return null;
  }

  const beat = normalizeBeat(record.beat ?? record.phase ?? record.type, text);
  const expectedValidationRaw =
    typeof record.expectedValidation === "boolean"
      ? record.expectedValidation
      : typeof record.expected_validation === "boolean"
        ? record.expected_validation
        : typeof record.validationExpected === "boolean"
          ? record.validationExpected
          : undefined;

  return {
    id: pickFirstString(record.id) || randomUUID(),
    speaker: normalizeSpeaker(record.speaker ?? record.role ?? record.voice),
    beat,
    text,
    directionId: pickFirstString(
      record.directionId,
      record.direction_id,
      record.direction,
      record.hypothesisId
    ),
    expectedValidation:
      expectedValidationRaw !== undefined
        ? expectedValidationRaw
        : beat === "confirmation"
          ? true
          : undefined,
  };
}

function normalizeScriptLinesFromEnhanced(value: unknown): ScriptLine[] {
  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const candidates = [record.lines, record.scriptLines, record.script, record.dialogue, record.conversation];
  const source = candidates.find((candidate) => Array.isArray(candidate));
  if (!Array.isArray(source)) {
    return [];
  }

  const normalized: ScriptLine[] = [];
  source.forEach((item) => {
    const line = normalizeScriptLine(item);
    if (line) {
      normalized.push(line);
    }
  });

  return normalized.slice(0, 40);
}

function normalizeScriptTitleFromEnhanced(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return pickFirstString(record.title, record.scriptTitle, record.name);
}

export async function analyzeRepoAndPersist(input: AnalyzeRepoInput): Promise<MiraloSession> {
  const intake = sanitizeIntake(input);
  const baseAnalysis = await analyzeRepoDeterministic(intake.repoPath);
  const repoContext = await buildRepoContext(intake.repoPath);

  const enhanced = await maybeGenerateJson<Record<string, unknown>>({
    task: "analyze-repo",
    maxTokens: 900,
    systemPrompt:
      "You are a product research analyst. Return JSON only, no markdown. Required top-level keys: summary (string), capabilities (array of short strings), directions (array of 3-5 items). Each directions item must include: id, title, reason, interviewFocus, confidence (0 to 1).",
    input: {
      instruction:
        "Generalize for any product. Use domain-specific language only if clearly evident from repo context. Keep direction titles concise and interview-focused.",
      intake,
      baseAnalysis,
      repoContext,
    },
  });

  const normalizedSummary = normalizeSummaryFromEnhanced(enhanced);
  const normalizedCapabilities = normalizeCapabilitiesFromEnhanced(enhanced);
  const normalizedDirections = normalizeDirectionsFromEnhanced(enhanced);

  const analysis = {
    ...baseAnalysis,
    summary: normalizedSummary || baseAnalysis.summary,
    capabilities: normalizedCapabilities.length > 0 ? normalizedCapabilities : baseAnalysis.capabilities,
    directions:
      normalizedDirections.length >= 3
        ? normalizedDirections
        : baseAnalysis.directions,
  };

  if (input.sessionId) {
    const updated = await updateSession(input.sessionId, (current) => ({
      ...current,
      intake,
      analysis,
    }));

    if (updated) {
      const specResult = await generateSessionSpecs(updated);
      const withSpecs = await updateSession(updated.id, (current) => ({
        ...current,
        specs: {
          generatedAt: new Date().toISOString(),
          productSpecPath: specResult.productSpecPath,
          techSpecPath: specResult.techSpecPath,
          warnings: specResult.warnings,
        },
      }));
      return withSpecs || updated;
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

  const specResult = await generateSessionSpecs(updated);
  const withSpecs = await updateSession(updated.id, (current) => ({
    ...current,
    specs: {
      generatedAt: new Date().toISOString(),
      productSpecPath: specResult.productSpecPath,
      techSpecPath: specResult.techSpecPath,
      warnings: specResult.warnings,
    },
  }));

  return withSpecs || updated;
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

  const scriptTemplate = deterministicScript.lines.map((line, index) => ({
    step: index + 1,
    speaker: line.speaker,
    beat: line.beat,
    directionId: line.directionId,
    expectedValidation: line.expectedValidation,
  }));

  const enhanced = await maybeGenerateJson<Record<string, unknown>>({
    task: "generate-script",
    maxTokens: 1400,
    systemPrompt:
      "You are an interview script writer. Return JSON only, no markdown. Required keys: title (string), lines (array). Each line must include speaker (Interviewer or Interviewee), beat (explore|summary|confirmation), text (string), and optional directionId and expectedValidation. Keep the same line count and beat sequence as the template.",
    input: {
      instruction:
        "Write a natural script for product UX discovery. Keep it concise and grounded in selected directions. Avoid references to demo or todo unless directions require it. Rewrite line wording; do not copy wording from any template.",
      intake: session.intake,
      selectedDirections,
      targetLineCount: deterministicScript.lines.length,
      scriptTemplate,
    },
  });

  const normalizedTitle = normalizeScriptTitleFromEnhanced(enhanced);
  const normalizedLines = normalizeScriptLinesFromEnhanced(enhanced);

  const script = {
    ...deterministicScript,
    title: normalizedTitle || deterministicScript.title,
    lines:
      normalizedLines.length >= deterministicScript.lines.length / 2
        ? normalizedLines
        : deterministicScript.lines,
  };

  const updated = await updateSession(session.id, (current) => ({
    ...current,
    script,
    worktrees: buildWorktrees(selectedDirections),
    decisionLog: [],
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

  const nonTemplateDecisionLog = session.decisionLog.filter(
    (entry) => !/^(Heard:|Inferred:|Deferred:|Guardrail:)/.test(entry)
  );
  const nextDecisionLog = [...nonTemplateDecisionLog];
  let nextWorktrees = [...session.worktrees];

  if (createdEvent) {
    const summarySegment = normalizedTranscript.find(
      (segment) => segment.id === createdEvent.summaryChunkId
    );
    const validatedText = summarySegment?.text || createdEvent.validatedText;
    const worktreeName = `validated-${createdEvent.id.slice(0, 8)}`;

    nextDecisionLog.push(`Validated summary captured: ${validatedText}`);
    nextDecisionLog.push(`Selected worktree ${worktreeName} from live transcript confirmation.`);

    const existing = nextWorktrees.find((tree) => tree.name === worktreeName);
    if (!existing) {
      nextWorktrees = [
        {
          name: worktreeName,
          status: "selected",
          rationale: `Created from validated transcript summary: ${validatedText}`,
        },
        ...nextWorktrees.map((tree) =>
          tree.status === "selected" ? { ...tree, status: "queued" as const } : tree
        ),
      ];
    }
  }

  const updated = await updateSession(session.id, (current) => ({
    ...current,
    transcript: normalizedTranscript,
    validatedFeedback,
    decisionLog: nextDecisionLog,
    worktrees: nextWorktrees,
  }));

  if (!updated) {
    throw new Error("Failed to persist transcript chunk.");
  }

  return { session: updated, createdEvent };
}

export async function latestValidatorArtifacts() {
  const recordingsDir = path.resolve(process.cwd(), "demo-orchestration/runtime/recordings");
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
    "demo-orchestration/runtime/transcripts/sample-transcript.json"
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
