import { NextResponse } from "next/server";
import { finalizeTranscriptChunkAndPersist } from "@/lib/miralo/orchestrator";
import { TranscriptFinalizeInput } from "@/lib/miralo/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as TranscriptFinalizeInput;

    if (!input.sessionId || !input.chunkId || !input.textFinal) {
      return NextResponse.json(
        { error: "sessionId, chunkId, and textFinal are required." },
        { status: 400 }
      );
    }

    if (typeof input.startMs !== "number" || typeof input.endMs !== "number") {
      return NextResponse.json(
        { error: "startMs and endMs must be numbers." },
        { status: 400 }
      );
    }

    const payload = await finalizeTranscriptChunkAndPersist(input);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to finalize transcript chunk.",
      },
      { status: 500 }
    );
  }
}
