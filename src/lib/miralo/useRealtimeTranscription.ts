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
  const [activeSpeaker, setActiveSpeaker] = useState<TranscriptSpeaker>("Interviewee");
  const [partials, setPartials] = useState<LivePartial[]>([]);
  const [realtimeMode, setRealtimeMode] = useState<"realtime" | "fallback">("fallback");
  const [modeReason, setModeReason] = useState<string>("Not started.");
  const [budgetInfo, setBudgetInfo] = useState<RealtimeSessionResponse["budget"]>();

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const partialIdRef = useRef<string | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const pushPartial = (text: string) => {
    const id = partialIdRef.current || `partial-${Date.now()}`;
    partialIdRef.current = id;

    setPartials((current) => {
      const next = current.filter((item) => item.id !== id);
      next.push({
        id,
        text,
        speaker: activeSpeaker,
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

  const finalizeChunk = async (textFinal: string) => {
    const now = Date.now();
    const chunkId = `rt-${now}-${Math.round(Math.random() * 10000)}`;

    const response = await fetch("/api/miralo/transcript/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: params.sessionId,
        chunkId,
        speaker: activeSpeaker,
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

        if (result.isFinal) {
          clearPartial();
          try {
            await finalizeChunk(transcript);
          } catch (error) {
            params.onError(error instanceof Error ? error.message : "Finalize failed.");
            setStatus("error");
          }
        } else {
          pushPartial(transcript);
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
    activeSpeaker,
    setActiveSpeaker,
    partials,
    start,
    stop,
  };
}
