# Product Marketing Context

*Last updated: February 5, 2026*

## Product Overview
**One-liner:**  
Miralo turns live interview signals into validated, demo-ready UI iterations.

**What it does:**  
Miralo runs a structured interview workflow, detects validated feedback moments, and drives UI-only iteration paths that can be shown immediately. It pairs transcript intelligence with worktree selection, decision logging, and deterministic validation artifacts. The core demo proves a before/after transformation, not just a summary.

**Product category:**  
Interview-to-iteration workflow tool for product teams.

**Product type:**  
Developer/product workflow software (currently hackathon demo implementation in a Next.js app).

**Business model:**  
Not defined in-repo yet. Near-term use is demo validation and pilot conversations.

## Target Audience
**Target companies:**  
Early-stage to growth software teams building web products.

**Decision-makers:**  
Founder/CEO, Head of Product, Product Manager, Design Lead, Engineering Lead.

**Primary use case:**  
Convert interview findings into visible, scoped UI changes quickly enough to show in the same demo cycle.

**Jobs to be done:**  
- Validate user signals before acting.  
- Turn validated feedback into a clear iteration direction.  
- Produce before/after proof that can be shown to stakeholders.

**Use cases:**  
- Hackathon demos where proof and speed matter.  
- Product discovery sessions that need immediate UI follow-up.  
- Internal product reviews where teams need a decision trail and demo artifact.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Product Manager | Fast learning loops and clear prioritization | Interviews generate notes, not actionable UI outcomes | Validated feedback and decision log mapped to concrete iteration directions |
| Design/Product Lead | User alignment and visible UX improvements | Hard to connect research quotes to shipped interface changes | Before/after proof tied to transcript context |
| Founder/Builder | Shipping velocity and demo credibility | AI demos feel hand-wavy without evidence | Deterministic validator artifacts and READY_TO_SHOW gating |

## Problems & Pain Points
**Core problem:**  
Teams collect interview insight but struggle to turn it into trustworthy, immediate product changes.

**Why alternatives fall short:**  
- Manual synthesis takes too long.  
- Generic AI summaries are hard to trust.  
- Traditional workflows rarely produce same-session, evidence-backed UI changes.

**What it costs them:**  
Delayed iteration, unclear priorities, and weak demo confidence.

**Emotional tension:**  
"We heard good feedback, but can we prove we acted on it?"

## Competitive Landscape
**Direct:** Interview analysis and product feedback tools that summarize conversations but do not provide scoped, validated UI iteration flow.  
**Secondary:** Manual stack (recording + notes + tickets + ad hoc prototyping) that introduces handoff delay and ambiguity.  
**Indirect:** Standard sprint planning without a live interview-to-iteration loop.

## Differentiation
**Key differentiators:**  
- Summary + confirmation detection for validated feedback events.  
- UI-only guardrails to keep iteration scoped and demo-safe.  
- Worktree manager with rationale tracking.  
- Deterministic clickthrough validator producing video/screenshot artifacts.  
- READY_TO_SHOW gate that appears only after validation flow completes.

**How we do it differently:**  
Miralo links transcript events, decision logic, worktree strategy, and validator outputs in one end-to-end flow.

**Why that's better:**  
Teams get both speed and proof: faster iterations with concrete evidence.

**Why customers choose us:**  
It turns "interesting interview notes" into "showable, validated product change."

## Objections
| Objection | Response |
|-----------|----------|
| "Will this change too much at once?" | Miralo enforces UI-only guardrails and keeps scope visible in decision logs. |
| "How do we know this is not smoke and mirrors?" | Validator artifacts (recorded clickthrough + screenshot) are generated deterministically before READY_TO_SHOW. |
| "What if transcript signals are noisy?" | Miralo highlights validated feedback patterns (summary + confirmation) before action. |

**Anti-persona:**  
Teams primarily looking for backend/schema automation in the same loop.

## Switching Dynamics
**Push:**  
Current interview workflows produce lag, uncertainty, and weak traceability.

**Pull:**  
A single flow from live signal to visible UI proof with explicit readiness gating.

**Habit:**  
Existing team habits rely on notes, backlog grooming, and delayed release cycles.

**Anxiety:**  
Concern that fast AI-assisted iteration may reduce quality or confidence.

## Customer Language
**How they describe the problem:**  
- "We have interview notes, but no clear next UI move."  
- "We need a before/after that stakeholders can trust."

**How they describe us:**  
- "Validated feedback drives UI-only iteration."  
- "READY_TO_SHOW only after recorded proof."

**Words to use:**  
validated feedback, UI-only, before/after, deterministic, decision log, worktree, ready to show.

**Words to avoid:**  
autonomous magic, guaranteed outcomes, instant PMF, fully automated product team.

**Glossary:**
| Term | Meaning |
|------|---------|
| Validated feedback | Interview signal confirmed by summary + confirmation pattern |
| UI-only guardrails | Restriction to interface-level changes without backend/schema changes |
| READY_TO_SHOW | Status set after deterministic validation artifacts are produced |
| Worktree manager | Mechanism for selecting/creating isolated implementation lanes |

## Brand Voice
**Tone:**  
Confident, pragmatic, evidence-driven.

**Style:**  
Direct language with technical credibility and minimal fluff.

**Personality:**  
Precise, bold, disciplined, demo-ready.

## Proof Points
**Metrics:**  
No public performance metrics captured in current repo docs.

**Customers:**  
No published customer list yet (hackathon-stage product).

**Testimonials:**  
Not yet available.

**Value themes:**
| Theme | Proof |
|-------|-------|
| Trustworthy speed | Deterministic clickthrough validator writes `.webm` and `.png` artifacts |
| Actionable interview signal | Validated feedback event pipeline in session workflow |
| Demo readiness | READY_TO_SHOW shown only after validation completion |
| Transparent decisioning | Decision logs and session history surfaced in Miralo console |

## Goals
**Business goal:**  
Win hackathon judging by proving a credible interview-to-iteration loop.

**Conversion action:**  
Primary: open `/miralo` live demo console. Secondary: open `/demo` before/after path.

**Current metrics:**  
No formal conversion analytics configured in this repository yet.
