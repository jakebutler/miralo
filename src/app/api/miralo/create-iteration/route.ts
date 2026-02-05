import { NextResponse } from "next/server";
import { startIterationBuild } from "@/lib/miralo/iterationBuildManager";
import { readIterationPromptText } from "@/lib/miralo/iterationPrompt";
import { CreateIterationInput } from "@/lib/miralo/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CreateIterationInput;

    if (!input.sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const { session, job } = await startIterationBuild(input.sessionId);
    const iterationPromptText = await readIterationPromptText(session);
    return NextResponse.json({ session, job, iterationPromptText });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create iteration.",
      },
      { status: 500 }
    );
  }
}
