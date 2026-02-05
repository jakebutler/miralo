"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { DirectionOption, MiraloSession } from "@/lib/miralo/types";

const DEFAULT_REPO_PATH = "/Users/jacobbutler/Documents/GitHub/miralo/demo-todo-app";

export default function MiraloIntakePage() {
  const router = useRouter();

  const [repoPath, setRepoPath] = useState(DEFAULT_REPO_PATH);
  const [guidanceMode, setGuidanceMode] = useState<"user-provided" | "needs-help">(
    "needs-help"
  );
  const [hasHypotheses, setHasHypotheses] = useState(false);
  const [hasScript, setHasScript] = useState(false);
  const [hypothesesNotes, setHypothesesNotes] = useState("");
  const [scriptNotes, setScriptNotes] = useState("");

  const [session, setSession] = useState<MiraloSession | null>(null);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = repoPath.trim().length > 0;
  const canGenerateScript = selectedDirections.length >= 1 && selectedDirections.length <= 2;

  const directions = useMemo<DirectionOption[]>(() => {
    return session?.analysis?.directions || [];
  }, [session]);

  const onAnalyze = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoadingAnalyze(true);

    try {
      const response = await fetch("/api/miralo/analyze-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoPath,
          guidanceMode,
          hasHypotheses,
          hasScript,
          hypothesesNotes,
          scriptNotes,
          sessionId: session?.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to analyze repository.");
      }

      setSession(payload.session as MiraloSession);
      setSelectedDirections([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoadingAnalyze(false);
    }
  };

  const toggleDirection = (directionId: string) => {
    setSelectedDirections((current) => {
      if (current.includes(directionId)) {
        return current.filter((id) => id !== directionId);
      }
      if (current.length >= 2) {
        return current;
      }
      return [...current, directionId];
    });
  };

  const onGenerateScript = async () => {
    if (!session) {
      return;
    }

    setError(null);
    setLoadingScript(true);

    try {
      const response = await fetch("/api/miralo/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.id,
          selectedDirectionIds: selectedDirections,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate script.");
      }

      setSession(payload.session as MiraloSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoadingScript(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f3ec] px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Miralo Intake</p>
            <h1 className="miralo-display mt-2 text-4xl font-semibold">Prepare the Interview</h1>
          </div>
          <Link
            href="/miralo"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to Console
          </Link>
        </div>

        <form onSubmit={onAnalyze} className="miralo-card rounded-3xl p-6">
          <h2 className="text-lg font-semibold">1) Project Intake</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Repo Path
              <input
                value={repoPath}
                onChange={(event) => setRepoPath(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Interview Prep Mode
              <select
                value={guidanceMode}
                onChange={(event) =>
                  setGuidanceMode(event.target.value as "user-provided" | "needs-help")
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2"
              >
                <option value="needs-help">I want Miralo to help create hypotheses and script</option>
                <option value="user-provided">I already have hypotheses/script</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasHypotheses}
                onChange={(event) => setHasHypotheses(event.target.checked)}
              />
              I already have hypotheses
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasScript}
                onChange={(event) => setHasScript(event.target.checked)}
              />
              I already have an interview script
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Hypotheses Notes (optional)
              <textarea
                value={hypothesesNotes}
                onChange={(event) => setHypothesesNotes(event.target.value)}
                className="min-h-[90px] rounded-xl border border-slate-300 bg-white px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Script Notes (optional)
              <textarea
                value={scriptNotes}
                onChange={(event) => setScriptNotes(event.target.value)}
                className="min-h-[90px] rounded-xl border border-slate-300 bg-white px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={!canAnalyze || loadingAnalyze}
              className="rounded-full bg-[#1f6f78] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingAnalyze ? "Analyzing..." : "Analyze Codebase"}
            </button>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Deterministic-first, OpenAI-optional
            </span>
          </div>
          {loadingAnalyze ? (
            <p className="mt-3 text-sm text-slate-600">
              Scanning repository files and generating interview directions...
            </p>
          ) : null}
        </form>

        {session?.analysis ? (
          <section className="miralo-card rounded-3xl p-6">
            <h2 className="text-lg font-semibold">2) Suggested Directions</h2>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              Scanned {session.analysis.filesScanned} file(s) in {session.analysis.elapsedMs}ms
            </p>
            <p className="mt-3 text-sm text-slate-700">{session.analysis.summary}</p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Capabilities</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {session.analysis.capabilities.map((capability) => (
                  <li key={capability}>- {capability}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 grid gap-3">
              {directions.map((direction) => {
                const selected = selectedDirections.includes(direction.id);
                return (
                  <button
                    key={direction.id}
                    type="button"
                    onClick={() => toggleDirection(direction.id)}
                    className={`rounded-2xl border p-4 text-left ${
                      selected
                        ? "border-[#1f6f78] bg-[#1f6f78]/10"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{direction.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{direction.reason}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      Confidence: {Math.round(direction.confidence * 100)}%
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onGenerateScript}
                disabled={!canGenerateScript || loadingScript}
                className="rounded-full bg-[#f6b26b] px-5 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingScript ? "Generating..." : "Generate Script"}
              </button>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Select 1-2 directions ({selectedDirections.length}/2)
              </span>
            </div>
          </section>
        ) : null}

        {session?.script ? (
          <section className="miralo-card rounded-3xl p-6">
            <h2 className="text-lg font-semibold">3) Generated Interview Script</h2>
            <p className="mt-2 text-sm text-slate-600">{session.script.title}</p>
            <div className="mt-4 space-y-3">
              {session.script.lines.map((line) => (
                <div key={line.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {line.speaker} · {line.beat}
                  </p>
                  <p className="mt-1 text-slate-800">{line.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => router.push(`/miralo/session/${session.id}`)}
                className="rounded-full bg-[#1f6f78] px-5 py-2 text-sm font-semibold text-white"
              >
                Start Interview Session
              </button>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
