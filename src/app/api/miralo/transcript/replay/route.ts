import { NextResponse } from "next/server";
import { replayTranscriptFromSample } from "@/lib/miralo/orchestrator";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as { sessionId?: string };
    if (!input.sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const session = await replayTranscriptFromSample(input.sessionId);
    return NextResponse.json({ session, source: "sample-transcript" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to replay transcript.",
      },
      { status: 500 }
    );
  }
}
