import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { MiraloSession } from "./types";

const SESSIONS_DIR = path.resolve(process.cwd(), "miralo/runtime/sessions");

async function ensureSessionsDir() {
  await mkdir(SESSIONS_DIR, { recursive: true });
}

function sessionPath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.json`);
}

async function writeSessionFile(session: MiraloSession) {
  await ensureSessionsDir();

  const filePath = sessionPath(session.id);
  const tmpPath = `${filePath}.tmp`;
  const payload = `${JSON.stringify(session, null, 2)}\n`;

  await writeFile(tmpPath, payload, "utf8");
  await rename(tmpPath, filePath);
}

export async function createSession(initial: {
  intake: MiraloSession["intake"];
}): Promise<MiraloSession> {
  const now = new Date().toISOString();
  const session: MiraloSession = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    intake: initial.intake,
    transcript: [],
    validatedFeedback: [],
    worktrees: [],
    decisionLog: [],
  };

  await writeSessionFile(session);
  return session;
}

export async function readSession(sessionId: string): Promise<MiraloSession | null> {
  try {
    const raw = await readFile(sessionPath(sessionId), "utf8");
    return JSON.parse(raw) as MiraloSession;
  } catch {
    return null;
  }
}

export async function updateSession(
  sessionId: string,
  updater: (current: MiraloSession) => MiraloSession
): Promise<MiraloSession | null> {
  const current = await readSession(sessionId);
  if (!current) {
    return null;
  }

  const updated = updater({ ...current, updatedAt: new Date().toISOString() });
  updated.updatedAt = new Date().toISOString();
  await writeSessionFile(updated);
  return updated;
}

export async function listSessions(limit = 20): Promise<MiraloSession[]> {
  await ensureSessionsDir();

  const entries = await readdir(SESSIONS_DIR);
  const files = entries.filter((entry) => entry.endsWith(".json")).sort().reverse();
  const selected = files.slice(0, limit);

  const sessions: MiraloSession[] = [];

  for (const fileName of selected) {
    const raw = await readFile(path.join(SESSIONS_DIR, fileName), "utf8");
    sessions.push(JSON.parse(raw) as MiraloSession);
  }

  return sessions;
}
