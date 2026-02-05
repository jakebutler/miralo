import path from "node:path";
import { readdir } from "node:fs/promises";
import { createIterationPlan } from "./iterationPlanner";
import { maybeGenerateJson } from "./openaiAdapter";
import { analyzeRepoDeterministic, resolveRepoPath } from "./repoAnalyzer";
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
