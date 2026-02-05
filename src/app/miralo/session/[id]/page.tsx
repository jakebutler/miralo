"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MiraloSession } from "@/lib/miralo/types";

interface ValidatorArtifacts {
  readyToShow: boolean;
  latestVideo: string | null;
  latestScreenshot: string | null;
}

export default function MiraloSessionPage() {
  const params = useParams();
  const sessionId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [session, setSession] = useState<MiraloSession | null>(null);
  const [validator, setValidator] = useState<ValidatorArtifacts | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [iterating, setIterating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/miralo/session/${sessionId}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load session.");
      }

      setSession(payload.session as MiraloSession);
      setValidator(payload.validator as ValidatorArtifacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    void load();
  }, [sessionId]);

  const runInterview = async () => {
    setRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/miralo/run-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to run interview.");
      }

      setSession(payload.session as MiraloSession);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setRunning(false);
    }
  };

  const createIteration = async () => {
    setIterating(true);
    setError(null);

    try {
      const response = await fetch("/api/miralo/create-iteration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create iteration.");
      }

      setSession(payload.session as MiraloSession);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIterating(false);
    }
  };

  const replayTranscript = async () => {
    setReplaying(true);
    setError(null);

    try {
      const response = await fetch("/api/miralo/transcript/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to replay transcript.");
      }

      setSession(payload.session as MiraloSession);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setReplaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] px-6 py-12 text-slate-900">
        <div className="mx-auto max-w-5xl">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] px-6 py-12 text-slate-900">
        <div className="mx-auto max-w-5xl">Session not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Miralo Session</p>
            <h1 className="miralo-display mt-2 text-4xl font-semibold">Interview Runtime</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/miralo/intake"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              New Intake
            </Link>
            <Link
              href="/miralo"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Console
            </Link>
          </div>
        </div>

        <section className="miralo-card rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Session Controls</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runInterview}
              disabled={running}
              className="rounded-full bg-[#1f6f78] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {running ? "Running..." : "Run Interview Simulation"}
            </button>
            <button
              type="button"
              onClick={replayTranscript}
              disabled={replaying}
              className="rounded-full border border-slate-400 bg-white px-5 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              {replaying ? "Replaying..." : "Replay Sample Transcript"}
            </button>
            <button
              type="button"
              onClick={createIteration}
              disabled={iterating}
              className="rounded-full bg-[#f6b26b] px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
            >
              {iterating ? "Building..." : "Create UI Iteration"}
            </button>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Session: {session.id}
            </span>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="miralo-card rounded-3xl p-6">
            <h2 className="text-lg font-semibold">Transcript</h2>
            <div className="mt-4 space-y-3">
              {session.transcript.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No transcript yet. Run the interview simulation.
                </p>
              ) : (
                session.transcript.map((segment) => (
                  <div
                    key={segment.id}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      segment.validated
                        ? "border-[#1f6f78] bg-[#1f6f78]/10"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
                      <span>{segment.speaker}</span>
                      <span>
                        {segment.t0.toFixed(1)}s - {segment.t1.toFixed(1)}s
                      </span>
                    </div>
                    <p className="mt-1 text-slate-800">{segment.text}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="miralo-card rounded-3xl p-6">
              <h2 className="text-lg font-semibold">Validated Feedback</h2>
              <div className="mt-4 space-y-3">
                {session.validatedFeedback.length === 0 ? (
                  <p className="text-sm text-slate-600">No validated chunks yet.</p>
                ) : (
                  session.validatedFeedback.map((item) => (
                    <div key={item.chunkId} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Confidence: {item.confidence}
                      </p>
                      <p className="mt-1 text-sm text-slate-800">{item.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="miralo-card rounded-3xl p-6">
              <h2 className="text-lg font-semibold">Worktrees + Decision Log</h2>
              <div className="mt-4 space-y-3">
                {session.worktrees.map((tree) => (
                  <div key={tree.name} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                    <p className="font-semibold text-slate-900">{tree.name}</p>
                    <p className="mt-1 text-slate-600">{tree.rationale}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {session.decisionLog.map((entry) => (
                  <li key={entry}>- {entry}</li>
                ))}
              </ul>
            </div>

            <div className="miralo-card rounded-3xl p-6">
              <h2 className="text-lg font-semibold">Iteration + Validator</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>Port A: http://localhost:3000/demo</p>
                <p>Port B: http://localhost:3001/demo</p>
                <p>READY_TO_SHOW: {validator?.readyToShow ? "Yes" : "No"}</p>
                <p>Latest video: {validator?.latestVideo || "(none yet)"}</p>
                <p>Latest screenshot: {validator?.latestScreenshot || "(none yet)"}</p>
              </div>

              {session.iteration ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{session.iteration.summary}</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {session.iteration.uiChanges.map((change) => (
                      <li key={change}>- {change}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Historian: {session.iteration.historianPath}
                  </p>
                  {session.iteration.iterationPromptPath ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      Iteration prompt: {session.iteration.iterationPromptPath}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  Create iteration to generate historian output.
                </p>
              )}
            </div>
          </section>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
