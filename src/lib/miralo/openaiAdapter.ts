import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MODEL = process.env.MIRALO_OPENAI_MODEL || "gpt-4.1-mini";
const HARD_BUDGET = Number.parseFloat(process.env.MIRALO_OPENAI_BUDGET_USD || "50");

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
  const logsDir = path.resolve(process.cwd(), "miralo/runtime/logs");
  await mkdir(logsDir, { recursive: true });

  const line = `${new Date().toISOString()} ${JSON.stringify(event)}\n`;
  await appendFile(path.join(logsDir, "openai-usage.log"), line, "utf8");
}

export async function maybeGenerateJson<T>(params: {
  task: string;
  input: unknown;
  maxTokens: number;
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
      temperature: 0.2,
      max_tokens: params.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a product-research assistant. Output strictly valid JSON with no markdown.",
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

  if (estimatedUsd > HARD_BUDGET) {
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

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
