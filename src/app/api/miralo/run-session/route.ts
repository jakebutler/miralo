import { NextResponse } from "next/server";
import { runInterviewSession } from "@/lib/miralo/orchestrator";
import { RunSessionInput } from "@/lib/miralo/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as RunSessionInput;

    if (!input.sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const session = await runInterviewSession(input.sessionId);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run session.",
      },
      { status: 500 }
    );
  }
}
