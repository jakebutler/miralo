import { NextResponse } from "next/server";
import { generateScriptAndPersist } from "@/lib/miralo/orchestrator";
import { GenerateScriptInput } from "@/lib/miralo/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as GenerateScriptInput;

    if (!input.sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    if (!Array.isArray(input.selectedDirectionIds)) {
      return NextResponse.json(
        { error: "selectedDirectionIds must be an array." },
        { status: 400 }
      );
    }

    const session = await generateScriptAndPersist(input);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate script.",
      },
      { status: 500 }
    );
  }
}
