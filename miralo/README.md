# Miralo Hackathon Scaffolding

This folder contains the demo scaffolding for the Miralo hackathon build. The
Next.js app lives at the repo root, with the demo console at `/miralo` and the
Todo demo at `/demo`.

## Demo Flow

1. Run the Todo app on Port A.
2. Run the updated worktree on Port B.
3. Use the Miralo console to highlight validated transcript feedback.
4. Show the Before/After toggle and recorded clickthrough.

## Key Locations

- `miralo/docs` — architecture notes, demo script, and templates.
- `miralo/runtime` — transcript chunks, logs, recordings, and worktree notes.
- `miralo/scripts` — helper scripts for running ports and validation.
- `miralo/config` — demo configuration and anticipated directions.

## Next App Routes

- `/miralo` — Miralo demo console (transcript, worktrees, decision log).
- `/miralo/intake` — intake wizard (repo selection, prep mode, direction selection, script generation).
- `/miralo/session/<id>` — session runtime (simulation, iteration generation, validator status).
- `/demo` — Todo demo without auth, used for before/after ports.
- `/todos` — Original auth-gated Todo flow.

## Live Transcript Controls

Session runtime now includes:

- Start/stop live transcript controls
- Active speaker selector (Interviewer / Interviewee)
- Partial transcript stream cards before chunks finalize

## Validation Command

From repo root:

```bash
bun run miralo:validate
```

This command starts the app on an isolated port, performs a deterministic
clickthrough on `/demo`, and writes:

- `miralo/runtime/recordings/clickthrough-*.webm`
- `miralo/runtime/recordings/clickthrough-*.png`

## Transcript Replay Fallback

When live transcription is unavailable, replay the canned transcript for a session:

```bash
curl -X POST http://localhost:3000/api/miralo/transcript/replay \\
  -H "Content-Type: application/json" \\
  -d '{"sessionId":"<session-id>"}'
```

The same session timeline updates in UI, and iteration generation writes:

- `miralo/runtime/worktrees/<session-id>/iteration_prompt.txt`

## Execution Plan + Worktrees

- Ticket plan: `miralo/docs/execution-plan.md`
- Initialize parallel worktrees: `bash miralo/scripts/worktree-init.sh`
