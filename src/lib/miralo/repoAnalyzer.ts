import { randomUUID } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { DirectionOption, RepoAnalysis } from "./types";

const MAX_FILES = 250;
const MAX_FILE_BYTES = 256_000;
const README_LIMIT = 1400;

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".vercel",
]);

const DOMAIN_KEYWORDS = [
  "checkout",
  "billing",
  "payments",
  "invoice",
  "subscription",
  "catalog",
  "inventory",
  "order",
  "crm",
  "pipeline",
  "dashboard",
  "analytics",
  "report",
  "chat",
  "message",
  "notification",
  "calendar",
  "schedule",
  "booking",
  "appointment",
  "notes",
  "tasks",
  "todo",
  "kanban",
  "onboarding",
  "profile",
  "settings",
  "admin",
];

type RepoContext = {
  repoPath: string;
  fileCount: number;
  topExtensions: { ext: string; count: number }[];
  topDirectories: { name: string; count: number }[];
  packageSummary?: {
    name?: string;
    scripts?: string[];
    dependencies?: string[];
    devDependencies?: string[];
  };
  frameworks: string[];
  hasAppRouter: boolean;
  hasPagesRouter: boolean;
  routeCount: number;
  readmeExcerpt?: string;
  keywordSignals: string[];
};

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
          if (IGNORED_DIRS.has(entry.name)) {
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

function toSortedCounts<T extends string>(
  items: Record<T, number>
): { key: string; count: number }[] {
  return (Object.entries(items) as Array<[string, number]>)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function pickTopExtensions(files: string[]): { ext: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase() || "no-ext";
    counts[ext] = (counts[ext] || 0) + 1;
  }
  return toSortedCounts(counts)
    .slice(0, 8)
    .map((item) => ({ ext: item.key, count: item.count }));
}

function pickTopDirectories(repoPath: string, files: string[]): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const filePath of files) {
    const relative = path.relative(repoPath, filePath);
    const [top] = relative.split(path.sep);
    if (!top) {
      continue;
    }
    counts[top] = (counts[top] || 0) + 1;
  }
  return toSortedCounts(counts)
    .slice(0, 8)
    .map((item) => ({ name: item.key, count: item.count }));
}

function mapFrameworks(deps: string[]): string[] {
  const signals: Record<string, string> = {
    next: "Next.js",
    react: "React",
    vue: "Vue",
    svelte: "Svelte",
    nuxt: "Nuxt",
    remix: "Remix",
    astro: "Astro",
    express: "Express",
    fastify: "Fastify",
    "next-auth": "NextAuth",
    nextauth: "NextAuth",
    prisma: "Prisma",
    drizzle: "Drizzle",
    mongoose: "Mongoose",
    firebase: "Firebase",
    supabase: "Supabase",
    stripe: "Stripe",
    tailwindcss: "Tailwind CSS",
    redux: "Redux",
    zustand: "Zustand",
    mobx: "MobX",
    "@tanstack/react-query": "React Query",
    "react-query": "React Query",
    trpc: "tRPC",
    graphql: "GraphQL",
    apollo: "Apollo GraphQL",
    playwright: "Playwright",
    cypress: "Cypress",
    vitest: "Vitest",
    jest: "Jest",
  };

  const frameworks = new Set<string>();
  for (const dep of deps) {
    const normalized = dep.toLowerCase();
    if (signals[normalized]) {
      frameworks.add(signals[normalized]);
    }
  }
  return Array.from(frameworks);
}

function extractKeywords(text: string): string[] {
  const lowered = text.toLowerCase();
  return DOMAIN_KEYWORDS.filter((keyword) => lowered.includes(keyword));
}

function buildDirections(context: RepoContext, capabilities: string[]): DirectionOption[] {
  const directions: DirectionOption[] = [];

  directions.push({
    id: "first-run-clarity",
    title: "Clarify First-Run Experience",
    reason:
      "New users likely need stronger orientation, especially if the product has multiple routes or configuration steps.",
    interviewFocus:
      "Ask what they expected to see first and which missing context would help them start faster.",
    confidence: 0.78,
  });

  directions.push({
    id: "core-flow-efficiency",
    title: "Streamline the Core Workflow",
    reason:
      "Primary tasks should feel faster; small friction points compound over repeated use.",
    interviewFocus:
      "Probe where they hesitate or take extra clicks when completing their most common task.",
    confidence: 0.82,
  });

  if (context.routeCount >= 4) {
    directions.push({
      id: "navigation-ia",
      title: "Improve Navigation and Information Architecture",
      reason:
        "Multiple routes imply more navigation decisions; clarity here reduces bounce and confusion.",
      interviewFocus:
        "Ask which screens they jump between and where they get lost or need breadcrumbs.",
      confidence: 0.74,
    });
  }

  if (capabilities.some((capability) => capability.includes("authentication"))) {
    directions.push({
      id: "auth-onboarding-handoff",
      title: "Smooth the Auth-to-Value Handoff",
      reason:
        "Sign-in gates can interrupt momentum; aligning the entry point with user intent reduces drop-off.",
      interviewFocus:
        "Ask what would convince them to sign in and what they need to see immediately after.",
      confidence: 0.71,
    });
  }

  if (
    capabilities.some((capability) =>
      /state management|database|data|list|dashboard|analytics/i.test(capability)
    )
  ) {
    directions.push({
      id: "feedback-and-trust",
      title: "Increase Feedback and Trust Signals",
      reason:
        "When data updates quickly, users need clear confirmation to trust the outcome.",
      interviewFocus:
        "Ask which actions feel uncertain and what feedback would make changes feel reliable.",
      confidence: 0.69,
    });
  }

  if (context.keywordSignals.length > 0) {
    directions.push({
      id: "domain-specific-flow",
      title: "Tighten Domain-Specific Flow",
      reason:
        "The repo hints at domain-specific workflows that could benefit from tighter sequencing.",
      interviewFocus:
        "Ask how they complete the key domain task and where handoffs or missing steps appear.",
      confidence: 0.66,
    });
  }

  return directions.slice(0, 5);
}

async function loadPackageJson(repoPath: string): Promise<{
  name?: string;
  scripts?: string[];
  dependencies?: string[];
  devDependencies?: string[];
}> {
  try {
    const packagePath = path.join(repoPath, "package.json");
    const raw = await readTextIfSmall(packagePath);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as {
      name?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return {
      name: parsed.name,
      scripts: parsed.scripts ? Object.keys(parsed.scripts) : [],
      dependencies: parsed.dependencies ? Object.keys(parsed.dependencies) : [],
      devDependencies: parsed.devDependencies ? Object.keys(parsed.devDependencies) : [],
    };
  } catch {
    return {};
  }
}

async function loadReadmeExcerpt(repoPath: string): Promise<string | undefined> {
  const candidates = ["README.md", "Readme.md", "readme.md"];
  for (const name of candidates) {
    try {
      const raw = await readTextIfSmall(path.join(repoPath, name));
      if (raw) {
        return raw.slice(0, README_LIMIT).trim();
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

async function buildRepoContextFromFiles(
  repoPath: string,
  files: string[]
): Promise<RepoContext> {
  const topExtensions = pickTopExtensions(files);
  const topDirectories = pickTopDirectories(repoPath, files);
  const packageSummary = await loadPackageJson(repoPath);
  const readmeExcerpt = await loadReadmeExcerpt(repoPath);

  const appPages = files.filter((filePath) => /src\/app\/.+page\.(ts|tsx|js|jsx)$/.test(filePath));
  const pagesRouter = files.filter((filePath) =>
    /pages\/.+\.(ts|tsx|js|jsx)$/.test(filePath)
  );

  const depList = [
    ...(packageSummary.dependencies || []),
    ...(packageSummary.devDependencies || []),
  ];

  const frameworks = mapFrameworks(depList);
  const keywordSignals = Array.from(
    new Set(
      [
        ...(readmeExcerpt ? extractKeywords(readmeExcerpt) : []),
        ...files.flatMap((filePath) => extractKeywords(filePath)),
      ].filter(Boolean)
    )
  );

  return {
    repoPath,
    fileCount: files.length,
    topExtensions,
    topDirectories,
    packageSummary,
    frameworks,
    hasAppRouter: appPages.length > 0,
    hasPagesRouter: pagesRouter.length > 0,
    routeCount: appPages.length + pagesRouter.length,
    readmeExcerpt,
    keywordSignals,
  };
}

export async function buildRepoContext(repoPathInput: string): Promise<RepoContext> {
  const repoPath = resolveRepoPath(repoPathInput);
  const files = await walkFiles(repoPath);
  return buildRepoContextFromFiles(repoPath, files);
}

export async function analyzeRepoDeterministic(repoPathInput: string): Promise<RepoAnalysis> {
  const startedAt = Date.now();
  const repoPath = resolveRepoPath(repoPathInput);
  const files = await walkFiles(repoPath);
  const context = await buildRepoContextFromFiles(repoPath, files);

  const hasRedux = files.some((filePath) => filePath.includes("/src/redux/"));
  const hasTailwindConfig = files.some((filePath) => filePath.endsWith("tailwind.config.js"));
  const hasAuthRoute = files.some((filePath) =>
    /\/(auth|login|signup|register)\//i.test(filePath)
  );
  const hasLocalStorage = files.some((filePath) => /localStorage/i.test(filePath));

  const capabilities: string[] = [];
  if (context.frameworks.length > 0) {
    capabilities.push(`Frameworks detected: ${context.frameworks.join(", ")}.`);
  }
  if (context.routeCount > 0) {
    const routerLabel = context.hasAppRouter
      ? "Next.js app router"
      : context.hasPagesRouter
        ? "pages router"
        : "route definitions";
    capabilities.push(`Detected ${context.routeCount} ${routerLabel} page(s).`);
  }
  if (context.topExtensions.length > 0) {
    const extSummary = context.topExtensions
      .slice(0, 4)
      .map((item) => `${item.ext} (${item.count})`)
      .join(", ");
    capabilities.push(`Primary file types: ${extSummary}.`);
  }

  if (hasRedux) {
    capabilities.push("State management appears to use Redux Toolkit.");
  }
  if (hasTailwindConfig) {
    capabilities.push("Tailwind CSS is configured for rapid UI iteration.");
  }
  if (hasAuthRoute) {
    capabilities.push("Authentication-related routes or flows appear in the codebase.");
  }
  if (hasLocalStorage) {
    capabilities.push("Client-side storage usage (localStorage) appears in the codebase.");
  }
  if (context.keywordSignals.length > 0) {
    capabilities.push(`Domain hints: ${context.keywordSignals.slice(0, 5).join(", ")}.`);
  }

  const summary = [
    "This repository looks like a product-facing app with enough UI surface to run interview-driven iteration loops quickly.",
    context.frameworks.length > 0
      ? `It appears to be built with ${context.frameworks.join(", ")}.`
      : "It includes a mix of client and UI code suitable for iterative UX updates.",
    context.routeCount > 0
      ? `It includes roughly ${context.routeCount} route(s) to explore.`
      : "The structure suggests a focused feature set rather than a large multi-module system.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: randomUUID(),
    repoPath,
    generatedAt: new Date().toISOString(),
    filesScanned: files.length,
    elapsedMs: Date.now() - startedAt,
    summary,
    capabilities,
    directions: buildDirections(context, capabilities),
  };
}
