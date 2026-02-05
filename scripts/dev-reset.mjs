#!/usr/bin/env node
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { execSync } from "node:child_process";

const extraArgs = process.argv.slice(2);
const defaultPort = "3000";

function getPort(args) {
  const portFlagIndex = args.findIndex((arg) => arg === "-p" || arg === "--port");
  if (portFlagIndex >= 0 && args[portFlagIndex + 1]) {
    return String(args[portFlagIndex + 1]);
  }
  return process.env.PORT || defaultPort;
}

function killPortListener(port) {
  try {
    execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: "ignore" });
  } catch {
    // No listener found or command unavailable.
  }
}

const port = getPort(extraArgs);
killPortListener(port);

await rm(".next", { recursive: true, force: true });

const child = spawn("bun", ["run", "dev", "--", ...extraArgs], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
