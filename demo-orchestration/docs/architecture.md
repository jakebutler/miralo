# Miralo Architecture Notes

## Roles

- Demo Orchestrator: loads the session plan, coordinates events, and enforces UI-only changes.
- Listener / Transcriber: streams transcript segments with timestamps.
- Signal Detector: recognizes summary + confirmation beats and emits validated feedback.
- Hypothesis & Worktree Manager: pre-builds likely directions and selects a worktree on confirmation.
- Codex UI Builder: applies UI changes to the chosen worktree with a decision log.
- Validator + Screen Recorder: runs the demo clickthrough before marking READY_TO_SHOW.
- Historian: records each iteration into a markdown log and tracks deferred ideas.

## Event Flow (Happy Path)

1. TRANSCRIPT_SEGMENT events stream to the UI.
2. Signal detector identifies a summary + confirmation pair.
3. VALIDATED_FEEDBACK event is emitted.
4. Worktree Manager selects or creates a worktree and logs a rationale.
5. Codex UI Builder applies UI-only changes and writes a decision log.
6. Validator runs Playwright clickthrough and captures a demo clip.
7. Historian writes the iteration record.

## UI-Only Guardrails

- No backend or schema changes.
- No auth or production hardening changes.
- Keep diffs to components, layout, copy, or visibility.
