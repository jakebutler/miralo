"use client";

import { useMemo, useRef, useState } from "react";
import { TranscriptSpeaker } from "./types";

type TranscriptionStatus = "idle" | "connecting" | "listening" | "error";

interface LivePartial {
  id: string;
  text: string;
  speaker: TranscriptSpeaker;
  updatedAt: number;
}

interface UseRealtimeTranscriptionParams {
  sessionId: string;
  onFinalized: () => Promise<void>;
  onError: (message: string) => void;
}

type SpeakerMode = "auto" | "manual";

interface RealtimeSessionResponse {
  mode?: "realtime" | "fallback";
  reason?: string;
  budget?: {
    hardCapUsd: number;
    softCapUsd: number;
    spentUsd: number;
  };
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionResultAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionResultAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function useRealtimeTranscription(params: UseRealtimeTranscriptionParams) {
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>("auto");
  const [manualSpeaker, setManualSpeaker] = useState<TranscriptSpeaker>("Interviewee");
  const [activeSpeaker, setActiveSpeaker] = useState<TranscriptSpeaker>("Interviewee");
  const [partials, setPartials] = useState<LivePartial[]>([]);
  const [realtimeMode, setRealtimeMode] = useState<"realtime" | "fallback">("realtime");
  const [modeReason, setModeReason] = useState<string>(
    "Live mode is default. Start live transcript when ready."
  );
  const [budgetInfo, setBudgetInfo] = useState<RealtimeSessionResponse["budget"]>();

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const partialIdRef = useRef<string | null>(null);
  const lastDetectedSpeakerRef = useRef<TranscriptSpeaker>("Interviewer");

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const detectSpeaker = (text: string): TranscriptSpeaker => {
    if (speakerMode === "manual") {
      return manualSpeaker;
    }

    const normalized = text.trim().toLowerCase();
    const previous = lastDetectedSpeakerRef.current;

    const summaryPattern =
      /(can i summarize|let me summarize|so what i'm hearing|does that sound right|can i confirm)/;
    const interviewerPattern =
      /(^thanks for joining|^today we|^walk me through|^tell me about|what would|what did|how did|can you|could you|would you)/;
    const intervieweePattern =
      /(^i want|^i need|^i wish|^i don't|^this feels|^it's|^also|^honestly|^for me|^my flow)/;
    const affirmationPattern = /^(yes|yeah|yep|exactly|that's right|correct|totally)\b/;

    if (summaryPattern.test(normalized) || interviewerPattern.test(normalized)) {
      return "Interviewer";
    }

    if (affirmationPattern.test(normalized) || intervieweePattern.test(normalized)) {
      return "Interviewee";
    }

    if (normalized.endsWith("?")) {
      return "Interviewer";
    }

    if (normalized.length < 12) {
      return previous === "Interviewer" ? "Interviewee" : "Interviewer";
    }

    return previous;
  };

  const pushPartial = (text: string, speaker: TranscriptSpeaker) => {
    const id = partialIdRef.current || `partial-${Date.now()}`;
    partialIdRef.current = id;

    setPartials((current) => {
      const next = current.filter((item) => item.id !== id);
      next.push({
        id,
        text,
        speaker,
        updatedAt: Date.now(),
      });
      return next.slice(-4);
    });
  };

  const clearPartial = () => {
    const id = partialIdRef.current;
    if (!id) {
      return;
    }

    setPartials((current) => current.filter((item) => item.id !== id));
    partialIdRef.current = null;
  };

  const finalizeChunk = async (textFinal: string, speaker: TranscriptSpeaker) => {
    const now = Date.now();
    const chunkId = `rt-${now}-${Math.round(Math.random() * 10000)}`;

    const response = await fetch("/api/miralo/transcript/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: params.sessionId,
        chunkId,
        speaker,
        startMs: now - 1200,
        endMs: now,
        textFinal,
        source: "realtime",
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Failed to finalize transcript chunk.");
    }

    await params.onFinalized();
  };

  const start = async () => {
    if (!isSupported) {
      params.onError("Browser SpeechRecognition is unavailable.");
      setStatus("error");
      return;
    }

    setStatus("connecting");

    try {
      const sessionResponse = await fetch("/api/miralo/realtime/session", {
        method: "POST",
      });
      const sessionPayload = (await sessionResponse.json().catch(() => ({}))) as RealtimeSessionResponse;

      setRealtimeMode(sessionPayload.mode || "fallback");
      setModeReason(sessionPayload.reason || "Realtime session initialized.");
      setBudgetInfo(sessionPayload.budget);
    } catch {
      setRealtimeMode("fallback");
      setModeReason("Realtime session endpoint unavailable; using local speech fallback.");
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      params.onError("SpeechRecognition constructor not available.");
      setStatus("error");
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = async (event: SpeechRecognitionEventLike) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) {
          continue;
        }
        const detectedSpeaker = detectSpeaker(transcript);
        setActiveSpeaker(detectedSpeaker);

        if (result.isFinal) {
          clearPartial();
          lastDetectedSpeakerRef.current = detectedSpeaker;
          try {
            await finalizeChunk(transcript, detectedSpeaker);
          } catch (error) {
            params.onError(error instanceof Error ? error.message : "Finalize failed.");
            setStatus("error");
          }
        } else {
          pushPartial(transcript, detectedSpeaker);
        }
      }
    };

    recognition.onerror = (event) => {
      params.onError(event.error || "Realtime transcription error.");
      setStatus("error");
    };

    recognition.onend = () => {
      setStatus((current) => (current === "error" ? "error" : "idle"));
    };

    recognitionRef.current = recognition;
    recognition.start();
    setStatus("listening");
  };

  const stop = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    clearPartial();
    setStatus("idle");
  };

  return {
    isSupported,
    status,
    realtimeMode,
    modeReason,
    budgetInfo,
    speakerMode,
    setSpeakerMode,
    manualSpeaker,
    setManualSpeaker,
    activeSpeaker,
    partials,
    start,
    stop,
  };
}
