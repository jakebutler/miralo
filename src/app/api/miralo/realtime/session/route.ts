import { NextResponse } from "next/server";
import { createRealtimeTranscriptionSession } from "@/lib/miralo/openaiAdapter";

export async function POST() {
  try {
    const session = await createRealtimeTranscriptionSession();
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      {
        mode: "fallback",
        reason:
          error instanceof Error
            ? error.message
            : "Failed to create realtime transcription session.",
      },
      { status: 500 }
    );
  }
}
