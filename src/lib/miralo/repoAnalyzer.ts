import { randomUUID } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { DirectionOption, RepoAnalysis } from "./types";

const MAX_FILES = 250;
const MAX_FILE_BYTES = 256_000;

export function resolveRepoPath(inputPath: string): string {
  const fallback = process.cwd();
  const resolved = path.resolve(inputPath || fallback);
  const workspaceRoot = path.resolve(process.cwd());

  if (!resolved.startsWith(workspaceRoot)) {
    throw new Error("Repo path must be inside the current workspace.");
  }

  return resolved;
}

async function walkFiles(root: string): Promise<string[]> {
  const queue = [root];
  const files: string[] = [];

  while (queue.length > 0 && files.length < MAX_FILES) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === ".next"
        ) {
          continue;
        }
        queue.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }

      if (files.length >= MAX_FILES) {
        break;
      }
    }
  }

  return files;
}

async function readTextIfSmall(filePath: string): Promise<string> {
  const fileStat = await stat(filePath);
  if (fileStat.size > MAX_FILE_BYTES) {
    return "";
  }
  return readFile(filePath, "utf8");
}

function buildDirections(capabilities: string[]): DirectionOption[] {
  const hasAuth = capabilities.some((capability) => capability.includes("authentication"));
  const hasRedux = capabilities.some((capability) => capability.includes("Redux"));

  const directions: DirectionOption[] = [
    {
      id: "onboarding-empty-state",
      title: "Improve Empty-State Onboarding",
      reason:
        "The todo flow has a basic empty state and can benefit from stronger first-task guidance.",
      interviewFocus:
        "Ask how users decide their first task and what guidance they expect when the list is empty.",
      confidence: 0.87,
    },
    {
      id: "task-priority-clarity",
      title: "Clarify Priority and Next Action",
      reason:
        "Current list interactions are simple; users may need faster scanning and clearer next actions.",
      interviewFocus:
        "Probe which tasks users struggle to prioritize and what visual cues would reduce hesitation.",
      confidence: 0.82,
    },
    {
      id: "bulk-actions-and-closure",
      title: "Add Bulk Action Comfort",
      reason:
        "Deleting and toggling are item-by-item; repetitive cleanup can create friction.",
      interviewFocus:
        "Explore how users wrap up sessions and what batch operations they reach for most.",
      confidence: 0.79,
    },
  ];

  if (hasAuth) {
    directions.push({
      id: "auth-entry-friction",
      title: "Reduce Sign-In Entry Friction",
      reason:
        "There is an auth-gated todo route; the handoff from landing page to task entry may be unclear.",
      interviewFocus:
        "Ask where users hesitate in sign-in and what reassurance they need before continuing.",
      confidence: 0.74,
    });
  }

  if (hasRedux) {
    directions.push({
      id: "state-feedback-visibility",
      title: "Increase State Feedback Visibility",
      reason:
        "Redux-driven state changes happen immediately but feedback affordances are minimal.",
      interviewFocus:
        "Ask which confirmations or transitions would increase trust when tasks change state.",
      confidence: 0.7,
    });
  }

  return directions.slice(0, 5);
}

export async function analyzeRepoDeterministic(repoPathInput: string): Promise<RepoAnalysis> {
  const repoPath = resolveRepoPath(repoPathInput);
  const files = await walkFiles(repoPath);

  const appPages = files.filter((filePath) => /src\/app\/.+page\.(ts|tsx|js|jsx)$/.test(filePath));
  const hasRedux = files.some((filePath) => filePath.includes("/src/redux/"));
  const hasTailwindConfig = files.some((filePath) => filePath.endsWith("tailwind.config.js"));
  const hasAuthRoute = files.some((filePath) => filePath.includes("/src/app/api/auth/"));

  let usesLocalStorage = false;
  let todoSignals = 0;

  const signalCandidates = files.filter((filePath) =>
    /(todo|localStorage|ToDo|todos)/i.test(filePath)
  );

  for (const filePath of signalCandidates.slice(0, 20)) {
    const text = await readTextIfSmall(filePath);
    if (text.includes("localStorage")) {
      usesLocalStorage = true;
    }
    if (/todo/i.test(text)) {
      todoSignals += 1;
    }
  }

  const capabilities: string[] = [];
  capabilities.push(`Detected ${appPages.length} app route page(s) in Next.js app router.`);

  if (hasRedux) {
    capabilities.push("State management appears to use Redux Toolkit.");
  }
  if (hasTailwindConfig) {
    capabilities.push("Tailwind CSS is configured for rapid UI iteration.");
  }
  if (hasAuthRoute) {
    capabilities.push("App includes authentication route handlers (NextAuth-style structure).");
  }
  if (usesLocalStorage) {
    capabilities.push("Todo data persistence appears to rely on browser localStorage.");
  }
  if (todoSignals > 0) {
    capabilities.push("Codebase contains direct todo workflow components and list interactions.");
  }

  const summary =
    "This repository is a lightweight Next.js todo application with enough UI surface to run interview-driven iteration loops quickly. It already supports list creation and task state changes, making it a good target for validated UX refinements in onboarding, prioritization, and completion flow.";

  return {
    id: randomUUID(),
    repoPath,
    generatedAt: new Date().toISOString(),
    summary,
    capabilities,
    directions: buildDirections(capabilities),
  };
}
