import Link from "next/link";
import { latestValidatorArtifacts } from "@/lib/miralo/orchestrator";
import { listSessions } from "@/lib/miralo/sessionStore";

export default async function MiraloPage() {
  const sessions = await listSessions(8);
  const activeSession = sessions[0] || null;
  const validator = await latestValidatorArtifacts();

  const transcript = activeSession?.transcript?.slice(0, 6) || [];
  const worktrees = activeSession?.worktrees || [];
  const decisionLog = activeSession?.decisionLog || [];

  return (
    <div className="min-h-screen bg-[#f6f3ec] text-slate-900">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 miralo-grid opacity-30" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#f6b26b] blur-3xl opacity-40" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[#1f6f78] blur-3xl opacity-30" />

        <div className="relative mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Miralo Demo Console
              </p>
              <h1 className="miralo-display mt-3 text-4xl font-semibold text-slate-900">
                Lets look at it now
              </h1>
              <p className="mt-4 max-w-2xl text-base text-slate-700">
                Repo intake drives interview prep, validated feedback drives UI-only
                iteration, and validator artifacts determine READY_TO_SHOW.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/miralo/intake"
                className="rounded-full bg-[#1f6f78] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#1f6f78]/30"
              >
                Start Intake
              </Link>
              <Link
                href="/demo"
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
              >
                Open Demo Todo
              </Link>
              {activeSession ? (
                <Link
                  href={`/miralo/session/${activeSession.id}`}
                  className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
                >
                  Open Active Session
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="miralo-card rounded-3xl p-6 miralo-fade">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Live Transcript</h2>
                <span className="rounded-full bg-[#1f6f78]/10 px-3 py-1 text-xs font-semibold text-[#1f6f78]">
                  {transcript.length > 0 ? "Loaded" : "Waiting"}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {transcript.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    No transcript loaded. Start with intake, generate script, then run session.
                  </div>
                ) : (
                  transcript.map((segment) => (
                    <div
                      key={segment.id}
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        segment.validated
                          ? "border-[#1f6f78] bg-[#1f6f78]/10"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                        <span>{segment.speaker}</span>
                        <span>
                          {segment.t0.toFixed(1)}-{segment.t1.toFixed(1)}s
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-800">{segment.text}</p>
                      {segment.validated ? (
                        <div className="mt-3 inline-flex items-center rounded-full bg-[#1f6f78] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                          Validated Feedback
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="grid gap-6">
              <div className="miralo-card rounded-3xl p-6 miralo-fade">
                <h2 className="text-lg font-semibold text-slate-900">Decision Log</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {decisionLog.length === 0 ? (
                    <li>No decisions yet. Generate script to initialize plan.</li>
                  ) : (
                    decisionLog.map((entry) => (
                      <li key={entry} className="flex gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-[#1f6f78]" />
                        <span>{entry}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="miralo-card rounded-3xl p-6 miralo-fade">
                <h2 className="text-lg font-semibold text-slate-900">Worktree Manager</h2>
                <div className="mt-4 space-y-3">
                  {worktrees.length === 0 ? (
                    <p className="text-sm text-slate-600">No worktrees yet. Generate script first.</p>
                  ) : (
                    worktrees.map((tree) => (
                      <div
                        key={tree.name}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900">{tree.name}</p>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              tree.status === "selected"
                                ? "bg-[#1f6f78]/10 text-[#1f6f78]"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {tree.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{tree.rationale}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="miralo-card rounded-3xl p-6 miralo-fade">
                <h2 className="text-lg font-semibold text-slate-900">Before / After + Validator</h2>
                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Port A (Before)</p>
                    <p className="mt-2">http://localhost:3000/demo</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Port B (After)</p>
                    <p className="mt-2">http://localhost:3001/demo</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">READY_TO_SHOW</p>
                    <p className="mt-2">{validator.readyToShow ? "Yes" : "No"}</p>
                    <p className="mt-1 text-xs text-slate-500">Video: {validator.latestVideo || "none"}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="mt-8 miralo-card rounded-3xl p-6 miralo-fade">
            <h2 className="text-lg font-semibold text-slate-900">Recent Sessions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-slate-600">No sessions yet. Start intake to create one.</p>
              ) : (
                sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/miralo/session/${session.id}`}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <p className="font-semibold text-slate-900">{session.id}</p>
                    <p className="mt-1 text-slate-600">Updated: {session.updatedAt}</p>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
