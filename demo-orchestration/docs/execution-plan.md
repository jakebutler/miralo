# Miralo Build Plan (Hackathon)

## Objective

Ship an end-to-end Miralo vertical slice that supports:

1. Repo intake
2. Guided interview prep (directions + script)
3. Simulated interview with validated feedback trigger
4. Iteration proposal + historian artifact
5. Before/after + validator artifact integration

## Delivery Strategy

- Build deterministic flow first so functionality is testable immediately.
- Layer OpenAI augmentation behind feature flags.
- Use worktrees to run independent lanes in parallel.

## OpenAI Credit Strategy ($50 cap)

- Default mode: deterministic local generation (zero API spend).
- Optional mode: `MIRALO_USE_OPENAI=1` and `OPENAI_API_KEY` set.
- Budget guardrails:
- `MIRALO_OPENAI_BUDGET_USD=50` global cap.
- `MIRALO_OPENAI_SOFT_CAP_USD=20` warns in UI/logs.
- Max 2 API calls per intake flow (`analyze-repo`, `generate-script`).
- Keep response token ceilings low (analysis <= 700 tokens, script <= 900 tokens).
- Log token usage and estimated cost per request to runtime logs.

## Ticket Board

### T-001 Domain Contracts + Persistence
- Scope:
- Add typed contracts for intake, analysis, script, session, and iteration outputs.
- Add file-backed runtime store under `demo-orchestration/runtime/sessions`.
- Engineering tasks:
- Create `src/lib/miralo/types.ts` with shared interfaces.
- Create `src/lib/miralo/sessionStore.ts` with `create`, `read`, `update`, `list` helpers.
- Enforce deterministic ID generation and timestamp metadata.
- Acceptance criteria:
- Can create/read/update session JSON without API routes.
- Data shape validates at compile-time.
- Dependencies: none.
- Parallel lane: Foundation lane.

### T-002 Repo Analyzer Engine (Deterministic)
- Scope:
- Analyze selected repo path and produce summary + 3-5 interview directions.
- Engineering tasks:
- Create `src/lib/miralo/repoAnalyzer.ts`.
- Scan app routes/components and infer current capabilities using heuristics.
- Return opportunity directions with interview prompts and confidence scores.
- Add path safety check to keep reads inside workspace root.
- Acceptance criteria:
- Analyzer returns stable output for this repo.
- Handles missing repo path or unreadable files gracefully.
- Dependencies: T-001.
- Parallel lane: Backend lane A.

### T-003 Script Generator Engine
- Scope:
- Generate interview script from selected directions.
- Engineering tasks:
- Create `src/lib/miralo/scriptGenerator.ts`.
- Produce 2-3 summary-confirmation beats mapped to selected directions.
- Include interviewer lines, interviewee lines, expected triggers, and timing.
- Acceptance criteria:
- Script contains explicit summary + confirmation moments.
- Script references selected directions only.
- Dependencies: T-001.
- Parallel lane: Backend lane B.

### T-004 OpenAI Augmentation Adapter (Optional)
- Scope:
- Optional AI enhancement for analyzer/script outputs.
- Engineering tasks:
- Create `src/lib/miralo/openaiAdapter.ts` using REST `fetch`.
- Add feature flag + fallback to deterministic engines.
- Log usage/cost estimates to runtime logs.
- Acceptance criteria:
- With no key or flag, system remains fully functional.
- With key+flag, outputs are enhanced and structured.
- Dependencies: T-002, T-003.
- Parallel lane: Backend lane C.

### T-005 Miralo API Routes
- Scope:
- Build orchestration endpoints.
- Engineering tasks:
- Add routes:
- `POST /api/miralo/analyze-repo`
- `POST /api/miralo/generate-script`
- `POST /api/miralo/run-session`
- `POST /api/miralo/create-iteration`
- `GET /api/miralo/session/[id]`
- Persist each step into session store.
- Write historian markdown artifacts from `create-iteration`.
- Acceptance criteria:
- Full intake->session->iteration flow works via APIs.
- API errors return clear JSON with status codes.
- Dependencies: T-001, T-002, T-003.
- Parallel lane: Backend integration lane.

### T-006 Intake UI Wizard
- Scope:
- Build `/miralo/intake` multi-step flow.
- Engineering tasks:
- Step 1: repo selection.
- Step 2: indicate script/hypothesis availability or ask for help.
- Step 3: show analyzer summary and choose 1-2 directions.
- Step 4: generate script and start session.
- Add optimistic loading states and error handling.
- Acceptance criteria:
- User can complete flow with no manual JSON edits.
- Direction selection limits enforced (1-2).
- Dependencies: T-005.
- Parallel lane: Frontend lane A (can start with mocked payloads).

### T-007 Session UI + Iteration Trigger
- Scope:
- Build `/miralo/session/[id]` runtime page.
- Engineering tasks:
- Render transcript stream and validated chunks.
- Show selected worktree direction and Codex decision log.
- Trigger `create-iteration`, then show historian artifact path.
- Show before/after ports and validator status.
- Acceptance criteria:
- Session page can drive complete demo narrative.
- Iteration artifact is generated and linked.
- Dependencies: T-005.
- Parallel lane: Frontend lane B.

### T-008 Validator Integration
- Scope:
- Integrate existing clickthrough validator into session UX.
- Engineering tasks:
- Add artifact discovery helper for latest `.webm` and `.png`.
- Display latest validator artifacts in session page.
- Ensure READY_TO_SHOW state derives from artifact existence.
- Acceptance criteria:
- Session page clearly signals show readiness.
- Dependencies: T-007.
- Parallel lane: Frontend lane B.

### T-009 Worktree Automation Helpers
- Scope:
- Make parallel dev easy to execute.
- Engineering tasks:
- Add `demo-orchestration/scripts/worktree-init.sh` to create lane worktrees.
- Add per-lane branch naming conventions (`codex/<ticket-id>-<slug>`).
- Add merge checklist doc.
- Acceptance criteria:
- Team can spin up all lanes with one script.
- Dependencies: none.
- Parallel lane: DevEx lane.

### T-010 QA + Demo Readiness
- Scope:
- Verify flow and produce runbook.
- Engineering tasks:
- Add smoke test checklist for APIs and UI flow.
- Add runbook commands for local demo ports and validator.
- Record known risks and fallback plan.
- Acceptance criteria:
- Single operator can run the 3-minute demo deterministically.
- Dependencies: T-005, T-006, T-007, T-008.
- Parallel lane: QA lane.

## Sequence Graph

- Must be sequential:
- T-001 -> T-002/T-003 -> T-005 -> T-006/T-007 -> T-008 -> T-010
- Parallel-capable:
- T-002 and T-003
- T-006 and T-007 (once T-005 contract is stable)
- T-004 can begin once deterministic engines exist
- T-009 can run at any time

## Worktree Execution Plan

- Lane A (Foundation/Backend): T-001, T-002, T-005
- Lane B (Frontend Intake): T-006
- Lane C (Frontend Session): T-007, T-008
- Lane D (AI Adapter): T-004
- Lane E (DevEx/QA): T-009, T-010

Example branch names:
- `codex/t-001-domain-contracts`
- `codex/t-006-intake-wizard`
- `codex/t-007-session-runtime`

## Definition of Done (Hackathon)

- Intake->analysis->direction selection->script generation works in UI.
- Session page demonstrates validated feedback and iteration generation.
- Historian artifact markdown generated per session.
- Validator artifacts are discoverable and surfaced.
- Deterministic mode works without external API.
- OpenAI mode is optional and bounded by budget controls.
