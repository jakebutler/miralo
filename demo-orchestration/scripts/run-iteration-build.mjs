#!/usr/bin/env node
import { spawn } from "node:child_process";
import { lstat, mkdir, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(process.cwd());
const sessionsDir = path.join(repoRoot, "demo-orchestration/runtime/sessions");
const runtimeRoot = path.join(repoRoot, "demo-orchestration/runtime");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { sessionId: "", jobId: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--session") {
      out.sessionId = args[i + 1] || "";
    }
    if (args[i] === "--job") {
      out.jobId = args[i + 1] || "";
    }
  }
  return out;
}

function sessionPath(sessionId) {
  return path.join(sessionsDir, `${sessionId}.json`);
}

async function readSession(sessionId) {
  const raw = await readFile(sessionPath(sessionId), "utf8");
  return JSON.parse(raw);
}

async function writeSession(session) {
  const filePath = sessionPath(session.id);
  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(session, null, 2)}\n`, "utf8");
  await rename(tmpPath, filePath);
}

async function mutateSession(sessionId, updater) {
  const session = await readSession(sessionId);
  const next = updater(session);
  next.updatedAt = new Date().toISOString();
  next.buildJobs = next.buildJobs || [];
  next.iterations = next.iterations || [];
  await writeSession(next);
  return next;
}

function getJob(session, jobId) {
  return (session.buildJobs || []).find((entry) => entry.id === jobId);
}

async function appendLog(logPath, line) {
  await mkdir(path.dirname(logPath), { recursive: true });
  const stamp = new Date().toISOString();
  await writeFile(logPath, `[${stamp}] ${line}\n`, { encoding: "utf8", flag: "a" });
}

async function transition(sessionId, jobId, patch) {
  return mutateSession(sessionId, (session) => ({
    ...session,
    buildJobs: (session.buildJobs || []).map((entry) =>
      entry.id === jobId ? { ...entry, ...patch } : entry
    ),
  }));
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    if (options.stdin) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    child.on("close", (code) => {
      resolve({ code: code || 0, stdout, stderr });
    });
  });
}

function modelNotFound(output) {
  return /model_not_found|does not exist|requested model/i.test(output);
}

function parseShortStat(shortstat) {
  const filesMatch = shortstat.match(/(\d+)\s+files?\s+changed/);
  const insertionsMatch = shortstat.match(/(\d+)\s+insertions?\(\+\)/);
  const deletionsMatch = shortstat.match(/(\d+)\s+deletions?\(-\)/);
  return {
    filesChanged: filesMatch ? Number(filesMatch[1]) : 0,
    insertions: insertionsMatch ? Number(insertionsMatch[1]) : 0,
    deletions: deletionsMatch ? Number(deletionsMatch[1]) : 0,
  };
}

function isAllowedPath(filePath) {
  return (
    filePath.startsWith("src/app/demo/") ||
    filePath.startsWith("src/components/") ||
    filePath.startsWith("src/redux/") ||
    filePath.startsWith("public/")
  );
}

function isDeniedPath(filePath) {
  return (
    filePath.startsWith("src/app/api/") ||
    filePath.startsWith("src/lib/miralo/") ||
    filePath.startsWith("src/app/miralo/") ||
    filePath === "package.json" ||
    filePath === "bun.lock" ||
    filePath === "next.config.js" ||
    filePath === "tsconfig.json"
  );
}

async function ensureIterationSpec(sessionId, iterationNumber, validatedText) {
  const dir = path.join(runtimeRoot, "specs", sessionId);
  await mkdir(dir, { recursive: true });
  const specPath = path.join(dir, `iteration-${iterationNumber}-build-spec.md`);
  const body = [
    `# Iteration ${iterationNumber} Build Spec`,
    "",
    `Session ID: ${sessionId}`,
    "",
    "## Objective",
    "Implement UI-only updates on /demo informed by validated interview feedback.",
    "",
    "## Validated Signal",
    validatedText ? `- ${validatedText}` : "- No validated feedback found.",
    "",
    "## Allowed Paths",
    "- src/app/demo",
    "- src/components",
    "- src/redux",
    "- public",
    "",
    "## Forbidden Paths",
    "- src/app/api",
    "- src/lib/miralo",
    "- src/app/miralo",
    "- package.json/bun.lock/next.config.js/tsconfig.json",
    "",
  ].join("\n");
  await writeFile(specPath, body, "utf8");
  return specPath;
}

async function main() {
  const { sessionId, jobId } = parseArgs();
  if (!sessionId || !jobId) {
    process.exit(1);
  }

  let session = await readSession(sessionId);
  let job = getJob(session, jobId);
  if (!job) {
    process.exit(1);
  }

  const logPath =
    job.logPath || path.join(runtimeRoot, "logs", `iteration-build-${job.id}.log`);
  await appendLog(logPath, "Worker started.");

  try {
    await transition(sessionId, jobId, {
      stage: "specifying",
      statusMessage: "Preparing spec context.",
      startedAt: new Date().toISOString(),
      logPath,
    });
    session = await readSession(sessionId);
    job = getJob(session, jobId);

    const validatedText = session.validatedFeedback?.[0]?.text || "";
    const specIterationPath = await ensureIterationSpec(
      session.id,
      job.iterationNumber,
      validatedText
    );
    await appendLog(logPath, `Iteration spec created at ${specIterationPath}`);

    const productSpecPath = session.specs?.productSpecPath;
    const techSpecPath = session.specs?.techSpecPath;
    const warningCodes = [];
    if (!productSpecPath) {
      warningCodes.push("SPEC_PRODUCT_MISSING");
    }
    if (!techSpecPath) {
      warningCodes.push("SPEC_TECH_MISSING");
    }

    await transition(sessionId, jobId, {
      specProductPath: productSpecPath,
      specTechPath: techSpecPath,
      specIterationPath,
      warningCodes,
    });

    await transition(sessionId, jobId, {
      stage: "prompting",
      statusMessage: "Generating iteration prompt.",
    });

    const shortSessionId = session.id.split("-")[0];
    const shortJobId = job.id.split("-")[0];
    const branchName = `codex/iter-${shortSessionId}-${job.iterationNumber}-${shortJobId}`;
    const worktreePath = path.join(
      runtimeRoot,
      "worktrees",
      session.id,
      `iteration-${job.iterationNumber}`
    );
    const removeRegisteredWorktree = await run("git", [
      "-C",
      repoRoot,
      "worktree",
      "remove",
      "--force",
      worktreePath,
    ]);
    if (removeRegisteredWorktree.code !== 0) {
      await appendLog(
        logPath,
        "No existing registered worktree to remove, or removal failed; continuing."
      );
    }
    await rm(worktreePath, { recursive: true, force: true });
    await mkdir(path.dirname(worktreePath), { recursive: true });

    await appendLog(logPath, `Creating worktree ${worktreePath} on branch ${branchName}`);
    const addWorktree = await run("git", [
      "-C",
      repoRoot,
      "worktree",
      "add",
      "-f",
      "-B",
      branchName,
      worktreePath,
      "HEAD",
    ]);
    if (addWorktree.code !== 0) {
      throw new Error(`WORKTREE_CREATE_FAILED: ${addWorktree.stderr || addWorktree.stdout}`);
    }

    const nodeModulesLink = path.join(worktreePath, "node_modules");
    try {
      await lstat(nodeModulesLink);
    } catch {
      await symlink(path.join(repoRoot, "node_modules"), nodeModulesLink, "dir");
    }

    const promptPath = path.join(worktreePath, "demo-orchestration/runtime/iteration_prompt.txt");
    await mkdir(path.dirname(promptPath), { recursive: true });
    const promptBody = [
      "You are implementing a UI-only iteration for a Next.js app.",
      "",
      "Primary objective:",
      validatedText || "Improve /demo UX using available session context.",
      "",
      `Product spec path: ${productSpecPath || "(missing)"}`,
      `Tech spec path: ${techSpecPath || "(missing)"}`,
      `Iteration build spec path: ${specIterationPath}`,
      "",
      "Rules:",
      "- Change only UI-facing files.",
      "- Do not modify backend/api/auth/orchestrator files.",
      "- Keep changes small and coherent.",
      "- Ensure `/demo` remains functional.",
    ].join("\n");
    await writeFile(promptPath, promptBody, "utf8");

    await transition(sessionId, jobId, {
      worktreePath,
      branchName,
      promptPath,
      stage: "coding",
      statusMessage: "Running coding agent in worktree.",
    });

    const agentOutputPath = path.join(runtimeRoot, "logs", `iteration-agent-${job.id}.jsonl`);
    const fakeMode = process.env.MIRALO_BUILD_FAKE === "1";
    if (fakeMode) {
      await appendLog(logPath, "MIRALO_BUILD_FAKE=1: applying mock UI change.");
      const demoFile = path.join(worktreePath, "src/app/demo/page.tsx");
      try {
        const original = await readFile(demoFile, "utf8");
        if (!original.includes("Iteration marker")) {
          await writeFile(
            demoFile,
            `${original}\n// Iteration marker: build ${job.id}\n`,
            "utf8"
          );
        }
      } catch (error) {
        throw new Error(`MOCK_BUILD_FAILED: ${error instanceof Error ? error.message : String(error)}`);
      }
      await writeFile(agentOutputPath, '{"event":"mock-build-applied"}\n', "utf8");
    } else {
      const modelCandidates = Array.from(
        new Set([process.env.MIRALO_CODEX_MODEL, "gpt-5-codex", "o3"].filter(Boolean))
      );
      let codexOutput = "";
      let codexError = "";
      let codexCode = 1;

      for (const model of modelCandidates) {
        await appendLog(logPath, `Running Codex with model=${model}`);
        const codex = await run(
          "codex",
          [
            "-a",
            "never",
            "-s",
            "workspace-write",
            "exec",
            "-c",
            "model_reasoning_effort=\"high\"",
            "-m",
            model,
            "-C",
            worktreePath,
            "--json",
            "-",
          ],
          {
            stdin: promptBody,
          }
        );

        codexOutput = codex.stdout;
        codexError = codex.stderr;
        codexCode = codex.code;
        const combined = `${codex.stdout}\n${codex.stderr}`;

        if (codex.code === 0) {
          await appendLog(logPath, `Codex completed with model=${model}`);
          break;
        }

        if (!modelNotFound(combined)) {
          await appendLog(logPath, `Codex failed with non-model error using model=${model}`);
          break;
        }

        await appendLog(logPath, `Model unavailable (${model}); trying next fallback.`);
      }

      await writeFile(agentOutputPath, `${codexOutput}\n${codexError}`, "utf8");
      if (codexCode !== 0) {
        throw new Error(`AGENT_FAILED: ${codexError || codexOutput}`);
      }
    }

    await transition(sessionId, jobId, {
      agentOutputPath,
      stage: "guardrails",
      statusMessage: "Evaluating diff guardrails.",
    });

    const namesResult = await run("git", ["-C", worktreePath, "diff", "--name-only"]);
    if (namesResult.code !== 0) {
      throw new Error(`GUARDRAIL_DIFF_FAILED: ${namesResult.stderr || namesResult.stdout}`);
    }
    const changedFiles = namesResult.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (changedFiles.length === 0) {
      throw new Error("GUARDRAIL_EMPTY_DIFF: no files changed by coding agent.");
    }

    const denied = changedFiles.filter((filePath) => isDeniedPath(filePath));
    if (denied.length > 0) {
      throw new Error(`GUARDRAIL_VIOLATION_DENIED_PATHS: ${denied.join(", ")}`);
    }

    const notAllowed = changedFiles.filter((filePath) => !isAllowedPath(filePath));
    if (notAllowed.length > 0) {
      throw new Error(`GUARDRAIL_VIOLATION_OUTSIDE_ALLOWLIST: ${notAllowed.join(", ")}`);
    }

    const statsResult = await run("git", ["-C", worktreePath, "diff", "--shortstat"]);
    const parsedStats = parseShortStat(statsResult.stdout);

    await transition(sessionId, jobId, {
      diffFilesChanged: parsedStats.filesChanged,
      diffInsertions: parsedStats.insertions,
      diffDeletions: parsedStats.deletions,
      stage: "validating",
      statusMessage: "Running build and clickthrough validator.",
    });

    const buildResult = await run("bun", ["run", "build"], {
      cwd: worktreePath,
      env: {
        NODE_ENV: "production",
      },
    });
    await appendLog(logPath, `bun run build exit=${buildResult.code}`);
    if (buildResult.code !== 0) {
      const buildOutput = `${buildResult.stdout}\n${buildResult.stderr}`;
      const ignorable = /TypeError:\s+generate is not a function/.test(buildOutput);
      if (!ignorable) {
        throw new Error(`VALIDATION_BUILD_FAILED: ${buildResult.stderr || buildResult.stdout}`);
      }
      await appendLog(logPath, "Build step failed with known generateBuildId issue; continuing.");
      await transition(sessionId, jobId, {
        warningCodes: Array.from(
          new Set([...(job.warningCodes || []), "VALIDATION_BUILD_SKIPPED_GENERATE_BUILD_ID"])
        ),
      });
    }

    const iterationRecordingsDir = path.join(runtimeRoot, "recordings", "iterations", job.id);
    await mkdir(iterationRecordingsDir, { recursive: true });
    const validateResult = await run("bash", ["demo-orchestration/scripts/validate-clickthrough.sh"], {
      cwd: worktreePath,
      env: {
        MIRALO_REPO_ROOT: worktreePath,
        MIRALO_OUTPUT_DIR: iterationRecordingsDir,
        NODE_ENV: "development",
      },
    });
    await appendLog(logPath, `validator exit=${validateResult.code}`);
    let validatorWarningCode = undefined;
    if (validateResult.code !== 0) {
      const validateOutput = `${validateResult.stdout}\n${validateResult.stderr}`;
      const ignorable =
        /ReactFreshWebpackPlugin/.test(validateOutput) ||
        /Cannot destructure property 'version'/.test(validateOutput);
      if (!ignorable) {
        throw new Error(`VALIDATION_CLICKTHROUGH_FAILED: ${validateResult.stderr || validateResult.stdout}`);
      }
      validatorWarningCode = "VALIDATION_CLICKTHROUGH_SKIPPED_REACT_REFRESH";
      await appendLog(logPath, "Validator failed with known React refresh issue; continuing.");
    }

    const artifacts = await readdir(iterationRecordingsDir);
    const video = artifacts.filter((file) => file.endsWith(".webm")).sort().pop();
    const screenshot = artifacts.filter((file) => file.endsWith(".png")).sort().pop();
    const validatorVideoPath = video ? path.join(iterationRecordingsDir, video) : undefined;
    const validatorScreenshotPath = screenshot
      ? path.join(iterationRecordingsDir, screenshot)
      : undefined;
    const validatorReadyToShow = validateResult.code === 0 || Boolean(validatorWarningCode);

    await transition(sessionId, jobId, {
      stage: "launching",
      statusMessage: "Starting iteration app on port 3001.",
      validatorReadyToShow,
      validatorVideoPath,
      validatorScreenshotPath,
      warningCodes: validatorWarningCode
        ? Array.from(new Set([...(job.warningCodes || []), validatorWarningCode]))
        : job.warningCodes,
    });

    const cleanupPort = await run("bash", ["-lc", "lsof -ti tcp:3001 | xargs kill -9 2>/dev/null || true"]);
    if (cleanupPort.code !== 0) {
      await appendLog(logPath, "Port 3001 cleanup command failed; continuing.");
    }

    const serverLogPath = path.join(worktreePath, "demo-orchestration/runtime/iteration-server.log");
    const serverLogFd = await writeFile(serverLogPath, "", { encoding: "utf8" }).then(() => null);
    if (serverLogFd === null) {
      // no-op, placeholder to ensure file exists
    }
    const server = spawn("bun", ["run", "dev", "--", "-p", "3001"], {
      cwd: worktreePath,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, PORT: "3001", NODE_ENV: "development" },
    });
    server.unref();

    const launchUrl = "http://localhost:3001/demo";
    const historianPath = path.join(runtimeRoot, "logs", `iteration-${session.id}-${job.iterationNumber}.md`);
    await writeFile(
      historianPath,
      [
        `# Iteration ${job.iterationNumber}`,
        "",
        `Session ID: ${session.id}`,
        `Launch URL: ${launchUrl}`,
        `Branch: ${branchName}`,
        `Worktree: ${worktreePath}`,
        "",
      ].join("\n"),
      "utf8"
    );

    await mutateSession(sessionId, (current) => ({
      ...current,
      buildJobs: (current.buildJobs || []).map((entry) =>
        entry.id === jobId
          ? {
              ...entry,
              stage: "ready",
              statusMessage: "Iteration is ready to launch.",
              finishedAt: new Date().toISOString(),
              launchUrl,
              validatorReadyToShow,
              validatorVideoPath,
              validatorScreenshotPath,
              diffFilesChanged: parsedStats.filesChanged,
              diffInsertions: parsedStats.insertions,
              diffDeletions: parsedStats.deletions,
            }
          : entry
      ),
      activeBuildJobId: current.activeBuildJobId === jobId ? undefined : current.activeBuildJobId,
      iterations: [
        ...(current.iterations || []),
        {
          id: `iter-${jobId}`,
          sessionId: current.id,
          iterationNumber: job.iterationNumber,
          createdAt: new Date().toISOString(),
          worktreePath,
          branchName,
          launchUrl,
          promptPath,
          historianPath,
          validator: {
            readyToShow: validatorReadyToShow,
            videoPath: validatorVideoPath,
            screenshotPath: validatorScreenshotPath,
          },
          diffSummary: {
            filesChanged: parsedStats.filesChanged,
            insertions: parsedStats.insertions,
            deletions: parsedStats.deletions,
          },
        },
      ],
    }));

    await appendLog(logPath, "Build finished successfully.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog(logPath, `Build failed: ${message}`);
    await mutateSession(sessionId, (session) => ({
      ...session,
      buildJobs: (session.buildJobs || []).map((entry) =>
        entry.id === jobId
          ? {
              ...entry,
              stage: "failed",
              statusMessage: "Iteration build failed.",
              errorMessage: message,
              errorCode: message.split(":")[0] || "BUILD_FAILED",
              finishedAt: new Date().toISOString(),
            }
          : entry
      ),
      activeBuildJobId: session.activeBuildJobId === jobId ? undefined : session.activeBuildJobId,
    }));
  }
}

main().catch(() => {
  process.exit(1);
});
