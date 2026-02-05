import path from "node:path";
import Link from "next/link";
import { latestValidatorArtifacts } from "@/lib/miralo/orchestrator";
import { listSessions } from "@/lib/miralo/sessionStore";

interface LandingStat {
  label: string;
  value: string;
  detail: string;
}

interface LandingStep {
  title: string;
  body: string;
}

interface LandingDifferentiator {
  title: string;
  body: string;
}

const STEPS: LandingStep[] = [
  {
    title: "Capture and Validate the Signal",
    body: "Stream interview context, detect summary-plus-confirmation beats, and isolate feedback worth acting on.",
  },
  {
    title: "Select a Safe Iteration Path",
    body: "Choose a worktree with clear rationale and keep execution inside UI-only guardrails for clean demos.",
  },
  {
    title: "Ship Proof for Review",
    body: "Run deterministic clickthrough validation and produce evidence artifacts before presenting the result.",
  },
];

const DIFFERENTIATORS: LandingDifferentiator[] = [
  {
    title: "Signal-Gated Decisions",
    body: "Validated feedback drives changes, so the iteration story is grounded in what users actually confirmed.",
  },
  {
    title: "Scoped by Guardrails",
    body: "UI-only constraints keep iterations focused, faster to verify, and safer to demonstrate live.",
  },
  {
    title: "Traceable by Default",
    body: "Decision logs, worktree rationale, and validator outputs create an auditable loop from transcript to result.",
  },
];

function formatTimestamp(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return input;
  }
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function Home() {
  const [validator, sessions] = await Promise.all([
    latestValidatorArtifacts(),
    listSessions(20),
  ]);

  const latestSession = sessions[0] ?? null;
  const latestVideoName = validator.latestVideo
    ? path.basename(validator.latestVideo)
    : "none yet";
  const proofStats: LandingStat[] = [
    {
      label: "Validated Session Runs",
      value: String(sessions.length),
      detail: latestSession
        ? `Latest update ${formatTimestamp(latestSession.updatedAt)}`
        : "Start your first run from intake",
    },
    {
      label: "READY_TO_SHOW Gate",
      value: validator.readyToShow ? "ON" : "OFF",
      detail: "Enabled only after deterministic validator flow",
    },
    {
      label: "Latest Validator Artifact",
      value: latestVideoName,
      detail: "Recorded clickthrough evidence from /demo path",
    },
  ];

  return (
    <main className="miralo-landing">
      <div className="miralo-landing-bg" />
      <div className="miralo-landing-aurora miralo-landing-aurora-a" />
      <div className="miralo-landing-aurora miralo-landing-aurora-b" />

      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-8">
        <header className="miralo-landing-fade" style={{ animationDelay: "40ms" }}>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
            Validated Interview-to-UI Loop
          </p>
          <h1 className="miralo-display mt-5 max-w-4xl text-4xl font-semibold leading-tight text-slate-900 sm:text-6xl">
            Turn live interview feedback into demo-ready UI changes.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-700 sm:text-xl">
            Miralo detects validated feedback, selects the right worktree, and
            delivers UI-only iterations with before/after proof and deterministic
            validator artifacts.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/miralo" className="miralo-landing-cta">
              Open Live Demo
            </Link>
            <Link href="/demo" className="miralo-landing-cta-subtle">
              See Before/After Flow
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            READY_TO_SHOW appears only after a recorded clickthrough and screenshot
            are generated.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {proofStats.map((stat, index) => (
            <article
              key={stat.label}
              className="miralo-landing-proof miralo-landing-fade"
              style={{ animationDelay: `${110 + index * 80}ms` }}
            >
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                {stat.label}
              </p>
              <p className="mt-3 break-all text-lg font-semibold text-slate-900 sm:text-xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-slate-700">{stat.detail}</p>
              {stat.label === "READY_TO_SHOW Gate" && validator.readyToShow ? (
                <span className="mt-4 inline-flex rounded-full bg-[#1f6f78] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white miralo-pulse">
                  Live Proof Ready
                </span>
              ) : null}
            </article>
          ))}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="miralo-landing-panel miralo-landing-fade" style={{ animationDelay: "220ms" }}>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              How Miralo Works
            </p>
            <h2 className="miralo-display mt-4 text-3xl text-slate-900 sm:text-4xl">
              From conversation to confident change in 3 steps.
            </h2>
            <div className="mt-8 space-y-5">
              {STEPS.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-slate-200 bg-white/75 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#1f6f78]">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{step.body}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="miralo-landing-panel miralo-landing-fade" style={{ animationDelay: "280ms" }}>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Proof, Not Promises
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">
              Before/after storytelling with deterministic evidence.
            </h2>
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Port A</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">http://localhost:3000/demo</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Port B</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">http://localhost:3001/demo</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Ready State</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {validator.readyToShow ? "READY_TO_SHOW" : "Pending validator artifact"}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/miralo/intake" className="miralo-landing-cta-subtle">
                Start Intake
              </Link>
              {latestSession ? (
                <Link href={`/miralo/session/${latestSession.id}`} className="miralo-landing-cta-subtle">
                  Open Latest Session
                </Link>
              ) : null}
            </div>
          </aside>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {DIFFERENTIATORS.map((item, index) => (
            <article
              key={item.title}
              className="miralo-landing-proof miralo-landing-fade"
              style={{ animationDelay: `${340 + index * 70}ms` }}
            >
              <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-slate-300 bg-[#0d1117] px-6 py-8 text-white miralo-landing-fade" style={{ animationDelay: "470ms" }}>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-300">
            Demo-Day CTA
          </p>
          <h2 className="miralo-display mt-4 max-w-4xl text-3xl leading-tight sm:text-4xl">
            Show the next product iteration while the conversation is still fresh.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-200">
            If your team can hear it, validate it, and see it in the interface within
            the same session, you move faster with more confidence.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/miralo" className="miralo-landing-cta">
              Open Live Demo
            </Link>
            <Link href="/demo" className="miralo-landing-cta-subtle-dark">
              Open Demo Todo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
