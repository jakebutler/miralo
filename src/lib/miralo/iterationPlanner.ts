import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DirectionOption, IterationPlan, MiraloSession } from "./types";

function createUiChanges(selectedDirections: DirectionOption[]): string[] {
  return selectedDirections.map((direction) => {
    switch (direction.id) {
      case "onboarding-empty-state":
        return "Improve empty state with guided copy and first-task suggestions.";
      case "task-priority-clarity":
        return "Add visual hierarchy cues so users can prioritize tasks faster.";
      case "bulk-actions-and-closure":
        return "Introduce bulk-complete or clear-completed controls in the list header.";
      case "auth-entry-friction":
        return "Clarify sign-in entry points with concise value framing and clearer CTA labels.";
      case "state-feedback-visibility":
        return "Add explicit UI confirmations for task completion and deletion actions.";
      default:
        return `Refine UI for ${direction.title.toLowerCase()} based on validated interview feedback.`;
    }
  });
}

function buildHistorianMarkdown(session: MiraloSession, uiChanges: string[]): string {
  const validated = session.validatedFeedback[0];
  const transcriptLine = validated ? validated.text : "No validated feedback captured.";

  return [
    `# Iteration: ${session.id}`,
    "",
    "## Validated Transcript Chunk",
    `- ${transcriptLine}`,
    "",
    "## Interpretation",
    ...session.decisionLog.map((item) => `- ${item}`),
    "",
    "## UI Changes",
    ...uiChanges.map((item) => `- ${item}`),
    "",
    "## Before/After",
    "- Port A: http://localhost:3000/demo",
    "- Port B: http://localhost:3001/demo",
    "",
    "## Validator",
    "- Run `bun run miralo:validate` to generate READY_TO_SHOW artifacts.",
    "",
  ].join("\n");
}

function buildIterationPrompt(session: MiraloSession): string {
  const primary = session.validatedFeedback[0];
  const validatedText = primary?.text || "No validated summary detected yet.";
  const supporting = primary?.supportingChunkIds?.join(", ") || "(none)";

  return [
    "# Iteration Prompt",
    "",
    "Validated summary:",
    validatedText,
    "",
    `Session ID: ${session.id}`,
    `Summary chunk: ${primary?.summaryChunkId || "(none)"}`,
    `Affirmation chunk: ${primary?.affirmationChunkId || "(none)"}`,
    `Supporting chunk ids: ${supporting}`,
    "",
    "Constraint: UI-only changes. No backend/schema/auth hardening.",
    "",
  ].join("\n");
}

export async function createIterationPlan(
  session: MiraloSession,
  selectedDirections: DirectionOption[]
): Promise<IterationPlan> {
  const uiChanges = createUiChanges(selectedDirections);
  const createdAt = new Date().toISOString();
  const id = randomUUID();

  const logsDir = path.resolve(process.cwd(), "miralo/runtime/logs");
  const worktreesDir = path.resolve(process.cwd(), "miralo/runtime/worktrees", session.id);
  await mkdir(logsDir, { recursive: true });
  await mkdir(worktreesDir, { recursive: true });

  const historianPath = path.join(logsDir, `iteration-${session.id}.md`);
  const iterationPromptPath = path.join(worktreesDir, "iteration_prompt.txt");
  const historianBody = buildHistorianMarkdown(session, uiChanges);
  const promptBody = buildIterationPrompt(session);
  await writeFile(historianPath, historianBody, "utf8");
  await writeFile(iterationPromptPath, promptBody, "utf8");

  return {
    id,
    createdAt,
    summary:
      "Prepared a UI-only iteration plan from validated interview feedback and queued follow-on opportunities.",
    uiChanges,
    skipped: ["No backend or schema changes.", "No auth/permission hardening in hackathon slice."],
    historianPath,
    iterationPromptPath,
  };
}
