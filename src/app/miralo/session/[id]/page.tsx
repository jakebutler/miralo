"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IterationBuildJob, MiraloSession } from "@/lib/miralo/types";
import { useRealtimeTranscription } from "@/lib/miralo/useRealtimeTranscription";

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
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iterationPromptText, setIterationPromptText] = useState<string | null>(null);
  const [buildJob, setBuildJob] = useState<IterationBuildJob | null>(null);
  const [buildLogTail, setBuildLogTail] = useState<string>("");
  const iterationSectionRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
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
      const nextJob = (payload.activeBuildJob || payload.latestBuildJob || null) as IterationBuildJob | null;
      setBuildJob(nextJob);
      const terminal = !nextJob || ["ready", "failed", "canceled"].includes(nextJob.stage);
      setIterating(!terminal);
      setIterationPromptText(
        typeof payload.iterationPromptText === "string" ? payload.iterationPromptText : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    void load();
  }, [sessionId, load]);

  const realtime = useRealtimeTranscription({
    sessionId,
    onFinalized: load,
    onError: (message) => setError(message),
  });

  const transcriptLines = useMemo(() => {
    const finalized = [...(session?.transcript || [])]
      .sort((a, b) => a.t0 - b.t0)
      .map((segment) => ({
        id: segment.id,
        speaker: segment.speaker,
        text: segment.textFinal || segment.text,
        isLive: false,
        validated: Boolean(segment.validated),
      }));

    const partials = realtime.partials.map((partial) => ({
      id: partial.id,
      speaker: partial.speaker,
      text: partial.text,
      isLive: true,
      validated: false,
    }));

    return [...finalized, ...partials];
  }, [session?.transcript, realtime.partials]);

  const liveDecisionLog = useMemo(
    () =>
      (session?.decisionLog || []).filter(
        (entry) => !/^(Heard:|Inferred:|Deferred:|Guardrail:)/.test(entry)
      ),
    [session?.decisionLog]
  );

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
    setIterationPromptText(null);
    iterationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const response = await fetch("/api/miralo/iteration/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create iteration.");
      }

      setSession(payload.session as MiraloSession);
      setBuildJob((payload.job || null) as IterationBuildJob | null);
      setBuildLogTail("");
      setIterationPromptText(
        typeof payload.iterationPromptText === "string" ? payload.iterationPromptText : null
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIterating(false);
    }
  };

  const cancelIterationBuild = async () => {
    if (!buildJob) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/miralo/iteration/build/${buildJob.id}/cancel`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to cancel build.");
      }
      setSession(payload.session as MiraloSession);
      setBuildJob((payload.job || null) as IterationBuildJob | null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  useEffect(() => {
    if (!buildJob) {
      return;
    }

    const terminal = buildJob.stage === "ready" || buildJob.stage === "failed" || buildJob.stage === "canceled";
    if (terminal) {
      setIterating(false);
    }
    if (terminal) {
      return;
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/miralo/iteration/build/${buildJob.id}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to poll build status.");
        }
        setSession(payload.session as MiraloSession);
        setBuildJob((payload.job || null) as IterationBuildJob | null);
        setBuildLogTail(typeof payload.logTail === "string" ? payload.logTail : "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      }
    };

    const handle = setInterval(() => {
      void poll();
    }, 1500);

    void poll();
    return () => clearInterval(handle);
  }, [buildJob]);

  const latestIteration = useMemo(
    () => [...(session?.iterations || [])].sort((a, b) => b.iterationNumber - a.iterationNumber)[0],
    [session?.iterations]
  );

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
              onClick={createIteration}
              disabled={iterating}
              className="rounded-full bg-[#f6b26b] px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
            >
              {iterating ? "Building..." : "Create UI Iteration"}
            </button>
            <button
              type="button"
              onClick={realtime.start}
              disabled={realtime.status === "listening" || !realtime.isSupported}
              className="rounded-full bg-[#1f6f78] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {realtime.status === "connecting" ? "Connecting..." : "Start Live Transcript"}
            </button>
            <button
              type="button"
              onClick={realtime.stop}
              disabled={realtime.status !== "listening"}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Stop Live Transcript
            </button>
            <button
              type="button"
              onClick={() =>
                realtime.setSpeakerMode(realtime.speakerMode === "auto" ? "manual" : "auto")
              }
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
            >
              Speaker Mode: {realtime.speakerMode === "auto" ? "Auto" : "Manual"}
            </button>
            {realtime.speakerMode === "manual" ? (
              <select
                value={realtime.manualSpeaker}
                onChange={(event) =>
                  realtime.setManualSpeaker(event.target.value as "Interviewer" | "Interviewee")
                }
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                <option value="Interviewer">Manual: Interviewer</option>
                <option value="Interviewee">Manual: Interviewee</option>
              </select>
            ) : (
              <span className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                Auto Speaker: {realtime.activeSpeaker}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSimulationEnabled((current) => !current)}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
            >
              {simulationEnabled ? "Hide Simulation Controls" : "Enable Simulation Controls"}
            </button>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Session: {session.id}
            </span>
          </div>
          {simulationEnabled ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <button
                type="button"
                onClick={runInterview}
                disabled={running}
                className="rounded-full border border-slate-400 bg-white px-5 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
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
            </div>
          ) : null}
          <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
            Realtime mode: {realtime.realtimeMode} ({realtime.modeReason})
          </div>
          {realtime.budgetInfo ? (
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
              Budget: ${realtime.budgetInfo.spentUsd.toFixed(2)} spent / $
              {realtime.budgetInfo.hardCapUsd.toFixed(2)} cap
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="miralo-card rounded-3xl p-6">
            <h2 className="text-lg font-semibold">Transcript</h2>
            <div className="mt-4 space-y-2">
              {transcriptLines.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No transcript yet. Start live transcription to stream lines here.
                </p>
              ) : (
                transcriptLines.map((line) => (
                  <div
                    key={line.id}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      line.validated ? "border-[#1f6f78] bg-[#1f6f78]/10" : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{line.speaker}</p>
                    <p className="mt-1 text-base text-slate-800">
                      {line.text}
                      {line.isLive ? <span className="ml-2 text-sm text-slate-500">...</span> : null}
                    </p>
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
              {liveDecisionLog.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  No live decisions yet. Decisions appear after a validated summary + confirmation.
                </p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {liveDecisionLog.map((entry) => (
                    <li key={entry}>- {entry}</li>
                  ))}
                </ul>
              )}
            </div>

            <div ref={iterationSectionRef} className="miralo-card rounded-3xl p-6">
              <h2 className="text-lg font-semibold">Iteration + Validator</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href="http://localhost:3000/demo"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
                >
                  Launch Original
                </a>
                <a
                  href={latestIteration?.launchUrl || "http://localhost:3001/demo"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 disabled:opacity-50"
                >
                  Launch Iteration 1
                </a>
                {buildJob?.stage === "ready" && latestIteration ? (
                  <a
                    href={latestIteration.launchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-[#1f6f78] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                  >
                    Launch New Iteration
                  </a>
                ) : null}
                {buildJob && buildJob.stage !== "ready" && buildJob.stage !== "failed" && buildJob.stage !== "canceled" ? (
                  <button
                    type="button"
                    onClick={cancelIterationBuild}
                    className="rounded-full border border-red-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-700"
                  >
                    Cancel Build
                  </button>
                ) : null}
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>Port A: http://localhost:3000/demo</p>
                <p>Port B: {latestIteration?.launchUrl || "http://localhost:3001/demo"}</p>
                <p>
                  READY_TO_SHOW:{" "}
                  {buildJob?.validatorReadyToShow ? "Yes" : validator?.readyToShow ? "Yes" : "No"}
                </p>
                <p>Latest video: {buildJob?.validatorVideoPath || validator?.latestVideo || "(none yet)"}</p>
                <p>
                  Latest screenshot:{" "}
                  {buildJob?.validatorScreenshotPath || validator?.latestScreenshot || "(none yet)"}
                </p>
              </div>

              {buildJob ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Build Job</p>
                  <p className="mt-2">
                    Stage: <span className="font-semibold">{buildJob.stage}</span>
                  </p>
                  <p className="mt-1">{buildJob.statusMessage}</p>
                  {buildJob.errorMessage ? (
                    <p className="mt-2 text-red-700">Error: {buildJob.errorMessage}</p>
                  ) : null}
                </div>
              ) : null}

              {iterating ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                  Building iteration plan...
                </div>
              ) : null}

              {latestIteration ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Iteration {latestIteration.iterationNumber} is ready.
                  </p>
                  <p className="mt-2 text-sm text-slate-700">Worktree: {latestIteration.worktreePath}</p>
                  <p className="mt-1 text-sm text-slate-700">Branch: {latestIteration.branchName}</p>
                  <p className="mt-1 text-sm text-slate-700">Launch URL: {latestIteration.launchUrl}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Historian: {latestIteration.historianPath}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Prompt: {latestIteration.promptPath}
                  </p>
                </div>
              ) : session.iteration ? (
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

              {session.specs ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Spec Context</p>
                  <p className="mt-2">Product spec: {session.specs.productSpecPath || "(missing)"}</p>
                  <p className="mt-1">Tech spec: {session.specs.techSpecPath || "(missing)"}</p>
                  {session.specs.warnings?.length ? (
                    <p className="mt-1 text-amber-700">
                      Warnings: {session.specs.warnings.join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Iteration Prompt
                </p>
                {iterationPromptText ? (
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                    {iterationPromptText}
                  </pre>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    {iterating
                      ? "Preparing prompt..."
                      : "Prompt will appear here after an iteration is created."}
                  </p>
                )}
              </div>

              {buildLogTail ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Build Log</p>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                    {buildLogTail}
                  </pre>
                </div>
              ) : null}
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
