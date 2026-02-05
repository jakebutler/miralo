import { readFile } from "node:fs/promises";
import path from "node:path";
import { MiraloSession } from "./types";

const WORKTREES_ROOT = path.resolve(process.cwd(), "demo-orchestration/runtime/worktrees");
const RUNTIME_ROOT = path.resolve(process.cwd(), "demo-orchestration/runtime");

export async function readIterationPromptText(
  session: MiraloSession
): Promise<string | null> {
  const activeJob = session.activeBuildJobId
    ? (session.buildJobs || []).find((job) => job.id === session.activeBuildJobId)
    : null;
  const latestJob = [...(session.buildJobs || [])].reverse().find((job) => Boolean(job.promptPath));
  const latestIteration = [...(session.iterations || [])]
    .reverse()
    .find((iteration) => Boolean(iteration.promptPath));

  const promptPath =
    activeJob?.promptPath ||
    latestJob?.promptPath ||
    latestIteration?.promptPath ||
    session.iteration?.iterationPromptPath;
  if (!promptPath) {
    return null;
  }

  const resolved = path.resolve(promptPath);
  if (!resolved.startsWith(WORKTREES_ROOT) && !resolved.startsWith(RUNTIME_ROOT)) {
    return null;
  }

  try {
    return await readFile(resolved, "utf8");
  } catch {
    return null;
  }
}
