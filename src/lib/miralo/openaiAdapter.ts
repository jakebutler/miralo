import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MODEL = process.env.MIRALO_OPENAI_MODEL || "gpt-4.1-mini";
const HARD_BUDGET = Number.parseFloat(process.env.MIRALO_OPENAI_BUDGET_USD || "50");
const SOFT_BUDGET = Number.parseFloat(process.env.MIRALO_OPENAI_SOFT_CAP_USD || "20");
const USAGE_LOG_PATH = path.resolve(process.cwd(), "demo-orchestration/runtime/logs/openai-usage.log");

interface OpenAiChoice {
  message?: {
    content?: string;
  };
}

interface OpenAiResponse {
  choices?: OpenAiChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function parseJsonFromModelOutput(raw: string): unknown | null {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(withoutFence.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function featureEnabled(): boolean {
  return process.env.MIRALO_USE_OPENAI === "1" && Boolean(process.env.OPENAI_API_KEY);
}

function estimateCost(totalTokens: number): number {
  // Conservative blended estimate for hackathon budgeting.
  return Number(((totalTokens / 1000) * 0.01).toFixed(4));
}

async function logUsage(event: {
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedUsd: number;
}) {
  const logsDir = path.resolve(process.cwd(), "demo-orchestration/runtime/logs");
  await mkdir(logsDir, { recursive: true });

  const line = `${new Date().toISOString()} ${JSON.stringify(event)}\n`;
  await appendFile(USAGE_LOG_PATH, line, "utf8");
}

async function getLoggedSpendUsd(): Promise<number> {
  try {
    const raw = await readFile(USAGE_LOG_PATH, "utf8");
    const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);

    return lines.reduce((sum, line) => {
      const jsonStart = line.indexOf("{");
      if (jsonStart === -1) {
        return sum;
      }

      try {
        const event = JSON.parse(line.slice(jsonStart)) as { estimatedUsd?: number };
        return sum + (event.estimatedUsd || 0);
      } catch {
        return sum;
      }
    }, 0);
  } catch {
    return 0;
  }
}

async function canSpend(estimatedUsd: number): Promise<boolean> {
  const spent = await getLoggedSpendUsd();
  return spent + estimatedUsd <= HARD_BUDGET;
}

export interface RealtimeSessionResult {
  mode: "realtime" | "fallback";
  reason?: string;
  model?: string;
  sessionId?: string;
  clientSecret?: string;
  expiresAt?: string;
  budget: {
    hardCapUsd: number;
    softCapUsd: number;
    spentUsd: number;
  };
}

export async function maybeGenerateJson<T>(params: {
  task: string;
  input: unknown;
  maxTokens: number;
  systemPrompt?: string;
}): Promise<T | null> {
  if (!featureEnabled()) {
    return null;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0,
      max_tokens: params.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            params.systemPrompt ||
            "You are a product-research and UX strategy assistant. Output strictly valid JSON with no markdown.",
        },
        {
          role: "user",
          content: `Task: ${params.task}\nInput JSON:\n${JSON.stringify(params.input)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OpenAiResponse;
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) {
    return null;
  }

  const promptTokens = payload.usage?.prompt_tokens || 0;
  const completionTokens = payload.usage?.completion_tokens || 0;
  const totalTokens = payload.usage?.total_tokens || 0;
  const estimatedUsd = estimateCost(totalTokens);

  if (!(await canSpend(estimatedUsd))) {
    return null;
  }

  await logUsage({
    endpoint: params.task,
    model: DEFAULT_MODEL,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedUsd,
  });

  const parsed = parseJsonFromModelOutput(raw);
  if (!parsed) {
    return null;
  }

  return parsed as T;
}

export async function createRealtimeTranscriptionSession(): Promise<RealtimeSessionResult> {
  const spentUsd = await getLoggedSpendUsd();

  if (!featureEnabled()) {
    return {
      mode: "fallback",
      reason: "MIRALO_USE_OPENAI=1 and OPENAI_API_KEY are required.",
      budget: {
        hardCapUsd: HARD_BUDGET,
        softCapUsd: SOFT_BUDGET,
        spentUsd,
      },
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      mode: "fallback",
      reason: "OPENAI_API_KEY is missing.",
      budget: {
        hardCapUsd: HARD_BUDGET,
        softCapUsd: SOFT_BUDGET,
        spentUsd,
      },
    };
  }

  if (spentUsd >= HARD_BUDGET) {
    return {
      mode: "fallback",
      reason: "OpenAI hard budget reached.",
      budget: {
        hardCapUsd: HARD_BUDGET,
        softCapUsd: SOFT_BUDGET,
        spentUsd,
      },
    };
  }

  const transcriptionModel =
    process.env.MIRALO_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: transcriptionModel,
      modalities: ["audio", "text"],
      input_audio_transcription: {
        model: transcriptionModel,
      },
      turn_detection: {
        type: "server_vad",
      },
      instructions:
        "Transcription-only mode for usability interview capture. Do not generate assistant replies.",
    }),
  });

  if (!response.ok) {
    const reason = await response.text();

    await logUsage({
      endpoint: "realtime-session-failed",
      model: transcriptionModel,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedUsd: 0,
    });

    return {
      mode: "fallback",
      reason: `Realtime session request failed: ${reason.slice(0, 180)}`,
      budget: {
        hardCapUsd: HARD_BUDGET,
        softCapUsd: SOFT_BUDGET,
        spentUsd,
      },
    };
  }

  const payload = (await response.json()) as {
    id?: string;
    model?: string;
    expires_at?: string;
    client_secret?: {
      value?: string;
    };
  };

  await logUsage({
    endpoint: "realtime-session",
    model: transcriptionModel,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedUsd: 0,
  });

  return {
    mode: "realtime",
    model: payload.model || transcriptionModel,
    sessionId: payload.id,
    expiresAt: payload.expires_at,
    clientSecret: payload.client_secret?.value,
    budget: {
      hardCapUsd: HARD_BUDGET,
      softCapUsd: SOFT_BUDGET,
      spentUsd,
    },
  };
}
