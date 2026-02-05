import { NextResponse } from "next/server";
import { createIteration } from "@/lib/miralo/orchestrator";
import { CreateIterationInput } from "@/lib/miralo/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CreateIterationInput;

    if (!input.sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const session = await createIteration(input.sessionId);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create iteration.",
      },
      { status: 500 }
    );
  }
}
