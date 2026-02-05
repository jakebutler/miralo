import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MiraloSession } from "./types";

function specsDir(sessionId: string): string {
  return path.resolve(process.cwd(), "demo-orchestration/runtime/specs", sessionId);
}

async function writeSpecFile(filePath: string, body: string): Promise<boolean> {
  try {
    await writeFile(filePath, body, "utf8");
    return true;
  } catch {
    return false;
  }
}

function productSpecBody(session: MiraloSession): string {
  const primaryDirection = session.analysis?.directions[0];
  const validated = session.validatedFeedback[0];
  return [
    "# Product Spec",
    "",
    `Session ID: ${session.id}`,
    "",
    "## Problem Statement",
    primaryDirection
      ? `Users struggle with ${primaryDirection.title.toLowerCase()} and need a faster path to value.`
      : "Users reported usability friction that should be reduced in the UI.",
    "",
    "## Interview-Validated Findings",
    validated ? `- ${validated.text}` : "- No validated summary captured yet.",
    "",
    "## UX Goals",
    "- Reduce confusion in early interactions.",
    "- Improve action clarity and progression visibility.",
    "- Keep scope UI-only for this iteration.",
    "",
    "## Non-Goals",
    "- No backend changes.",
    "- No schema changes.",
    "- No auth hardening or production infra work.",
    "",
  ].join("\n");
}

function techSpecBody(session: MiraloSession): string {
  const selectedDirectionIds = session.script?.selectedDirectionIds || [];
  return [
    "# Tech Spec",
    "",
    `Session ID: ${session.id}`,
    "",
    "## Architecture Snapshot",
    "- App framework: Next.js (app router).",
    "- Primary demo target route: `/demo`.",
    "",
    "## Candidate Implementation Areas",
    "- `src/app/demo`",
    "- `src/redux`",
    "- `src/components`",
    "- `public` (if assets are needed)",
    "",
    "## Selected Directions",
    ...(selectedDirectionIds.length > 0
      ? selectedDirectionIds.map((id) => `- ${id}`)
      : ["- None selected yet."]),
    "",
    "## Constraints",
    "- UI-only changes.",
    "- Avoid API/auth/orchestrator changes from coding agent output.",
    "- Keep changes focused and demo-safe.",
    "",
  ].join("\n");
}

export async function generateSessionSpecs(session: MiraloSession): Promise<{
  productSpecPath?: string;
  techSpecPath?: string;
  warnings: string[];
}> {
  const dir = specsDir(session.id);
  await mkdir(dir, { recursive: true });

  const productPath = path.join(dir, "product-spec.md");
  const techPath = path.join(dir, "tech-spec.md");
  const warnings: string[] = [];

  const productWritten = await writeSpecFile(productPath, productSpecBody(session));
  if (!productWritten) {
    warnings.push("SPEC_PRODUCT_WRITE_FAILED");
  }

  const techWritten = await writeSpecFile(techPath, techSpecBody(session));
  if (!techWritten) {
    warnings.push("SPEC_TECH_WRITE_FAILED");
  }

  return {
    productSpecPath: productWritten ? productPath : undefined,
    techSpecPath: techWritten ? techPath : undefined,
    warnings,
  };
}

export async function generateIterationBuildSpec(session: MiraloSession, iterationNumber: number): Promise<{
  specPath?: string;
  warnings: string[];
}> {
  const dir = specsDir(session.id);
  await mkdir(dir, { recursive: true });

  const primaryDirection = session.analysis?.directions.find((direction) =>
    session.script?.selectedDirectionIds?.includes(direction.id)
  );
  const validated = session.validatedFeedback[0];

  const body = [
    `# Iteration ${iterationNumber} Build Spec`,
    "",
    `Session ID: ${session.id}`,
    "",
    "## Objective",
    primaryDirection
      ? `Ship a UI iteration for ${primaryDirection.title.toLowerCase()} that reflects validated interview feedback.`
      : "Ship a focused UI iteration based on validated interview feedback.",
    "",
    "## Validated Signal",
    validated ? `- ${validated.text}` : "- No validated signal captured; use best available transcript context.",
    "",
    "## Allowed Paths",
    "- `src/app/demo`",
    "- `src/components`",
    "- `src/redux`",
    "- `public`",
    "",
    "## Forbidden Paths",
    "- `src/app/api`",
    "- `src/lib/miralo`",
    "- `src/app/miralo`",
    "- `package.json`, `bun.lock`, `next.config.js`, `tsconfig.json`",
    "",
    "## Acceptance Checklist",
    "- UI behavior for `/demo` is visibly improved.",
    "- Build passes.",
    "- Validator clickthrough artifacts generated.",
    "",
  ].join("\n");

  const filePath = path.join(dir, `iteration-${iterationNumber}-build-spec.md`);
  const ok = await writeSpecFile(filePath, body);
  return {
    specPath: ok ? filePath : undefined,
    warnings: ok ? [] : ["SPEC_ITERATION_WRITE_FAILED"],
  };
}
