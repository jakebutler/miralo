import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { listSessions, readSession, updateSession } from "./sessionStore";
import { IterationBuildJob, IterationBuildStage, MiraloSession } from "./types";

const TERMINAL_STAGES: IterationBuildStage[] = ["ready", "failed", "canceled"];

function isTerminal(stage: IterationBuildStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function getActiveBuildJob(session: MiraloSession): IterationBuildJob | null {
  if (!session.activeBuildJobId) {
    return null;
  }
  return session.buildJobs.find((job) => job.id === session.activeBuildJobId) || null;
}

export async function startIterationBuild(sessionId: string): Promise<{
  session: MiraloSession;
  job: IterationBuildJob;
}> {
  const session = await readSession(sessionId);
  if (!session) {
    throw new Error("Session not found.");
  }
  if (!session.analysis) {
    throw new Error("Session analysis is required before creating an iteration.");
  }

  const active = getActiveBuildJob(session);
  if (active && !isTerminal(active.stage)) {
    throw new Error(`Build already in progress (${active.id}).`);
  }

  const now = new Date().toISOString();
  const jobId = randomUUID();
  const iterationNumber = (session.iterations?.length || 0) + 1;
  const logsDir = path.resolve(process.cwd(), "demo-orchestration/runtime/logs");
  await mkdir(logsDir, { recursive: true });
  const logPath = path.join(logsDir, `iteration-build-${jobId}.log`);

  const job: IterationBuildJob = {
    id: jobId,
    sessionId: session.id,
    iterationNumber,
    stage: "queued",
    statusMessage: "Queued build job.",
    createdAt: now,
    validatorReadyToShow: false,
    logPath,
  };

  const updated = await updateSession(session.id, (current) => ({
    ...current,
    buildJobs: [...(current.buildJobs || []), job],
    activeBuildJobId: job.id,
  }));

  if (!updated) {
    throw new Error("Failed to persist build job.");
  }

  const scriptPath = path.resolve(process.cwd(), "demo-orchestration/scripts/run-iteration-build.mjs");
  const child = spawn(process.execPath, [scriptPath, "--session", session.id, "--job", job.id], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();

  const withPid = await updateSession(session.id, (current) => ({
    ...current,
    buildJobs: (current.buildJobs || []).map((entry) =>
      entry.id === job.id ? { ...entry, workerPid: child.pid } : entry
    ),
  }));

  if (!withPid) {
    throw new Error("Failed to persist build worker pid.");
  }

  const finalJob = withPid.buildJobs.find((entry) => entry.id === job.id);
  if (!finalJob) {
    throw new Error("Failed to locate persisted build job.");
  }

  return { session: withPid, job: finalJob };
}

export async function findBuildJobById(jobId: string): Promise<{
  session: MiraloSession;
  job: IterationBuildJob;
} | null> {
  const sessions = await listSessions(200);
  for (const session of sessions) {
    const job = (session.buildJobs || []).find((entry) => entry.id === jobId);
    if (job) {
      return { session, job };
    }
  }
  return null;
}

export async function readBuildLogTail(job: IterationBuildJob, maxLines = 80): Promise<string> {
  if (!job.logPath) {
    return "";
  }
  try {
    const raw = await readFile(job.logPath, "utf8");
    return raw.split("\n").slice(-maxLines).join("\n");
  } catch {
    return "";
  }
}

export async function cancelBuildJob(jobId: string): Promise<{
  session: MiraloSession;
  job: IterationBuildJob;
}> {
  const found = await findBuildJobById(jobId);
  if (!found) {
    throw new Error("Build job not found.");
  }

  if (found.job.workerPid && !isTerminal(found.job.stage)) {
    try {
      process.kill(found.job.workerPid, "SIGTERM");
    } catch {
      // Ignore missing process errors.
    }
  }

  const updated = await updateSession(found.session.id, (current) => ({
    ...current,
    buildJobs: (current.buildJobs || []).map((entry) =>
      entry.id === jobId
        ? {
            ...entry,
            stage: "canceled" as const,
            statusMessage: "Build canceled by user.",
            finishedAt: new Date().toISOString(),
          }
        : entry
    ),
    activeBuildJobId: current.activeBuildJobId === jobId ? undefined : current.activeBuildJobId,
  }));

  if (!updated) {
    throw new Error("Failed to cancel build job.");
  }

  const job = updated.buildJobs.find((entry) => entry.id === jobId);
  if (!job) {
    throw new Error("Canceled build job not found after update.");
  }

  return { session: updated, job };
}
