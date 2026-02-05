# Miralo

Miralo is a hackathon demo that pairs a scripted user interview with real-time
UI-only changes. The demo app is a small Next.js Todo list (Redux Toolkit +
localStorage) that Miralo iterates on during the interview.

## Quick Start

1. Install dependencies

```bash
bun install
```

2. Run the demo Todo (no auth)

```bash
bun run dev
```

Then visit `http://localhost:3000/demo`.

3. Install Playwright browser (first run only)

```bash
bunx playwright install chromium
```

## Demo Console

The Miralo console lives at `http://localhost:3000/miralo` and visualizes:

- Transcript streaming + validated highlights
- Codex decision log and active prompt
- Worktree selection rationale
- Before/after ports

## New Flow (Intake -> Session -> Iteration)

1. Open `http://localhost:3000/miralo/intake`
2. Select repo + guidance mode
3. Analyze codebase and pick 1-2 interview directions
4. Generate script and start session
5. Run interview simulation and create iteration from `http://localhost:3000/miralo/session/<id>`

## Before / After Ports

- Port A (before): `http://localhost:3000/demo`
- Port B (after): `http://localhost:3001/demo`

Start Port B in a second terminal by setting the port.

```bash
PORT=3001 bun run dev
```

## Clickthrough Validator

Run a deterministic validation flow that records a browser video and screenshot.

```bash
bun run miralo:validate
```

Artifacts are written to `miralo/runtime/recordings/` and the script prints
`READY_TO_SHOW` when complete.

## Optional Realtime Transcription (OpenAI)

Enable OpenAI-powered realtime transcription session creation:

```bash
export MIRALO_USE_OPENAI=1
export OPENAI_API_KEY=your_key
export MIRALO_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
```

Create a client session token:

```bash
curl -X POST http://localhost:3000/api/miralo/realtime/session
```

If OpenAI is disabled or budget-limited, the API returns `mode: "fallback"` with a reason.

## Parallel Worktrees

Create lane worktrees for parallel implementation:

```bash
bash miralo/scripts/worktree-init.sh
```

Detailed ticket sequencing and dependencies:

- `miralo/docs/execution-plan.md`

## Project Structure

- `src/app/miralo` — Miralo demo console UI
- `src/app/demo` — Demo Todo route without auth
- `src/app/todos` — Original auth-gated Todo flow
- `miralo/` — Demo scaffolding, logs, and scripts
