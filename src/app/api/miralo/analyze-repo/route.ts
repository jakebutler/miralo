import { NextResponse } from "next/server";
import { analyzeRepoAndPersist } from "@/lib/miralo/orchestrator";
import { AnalyzeRepoInput } from "@/lib/miralo/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as AnalyzeRepoInput;

    if (!input.repoPath) {
      return NextResponse.json({ error: "repoPath is required." }, { status: 400 });
    }

    if (input.guidanceMode !== "user-provided" && input.guidanceMode !== "needs-help") {
      return NextResponse.json(
        { error: "guidanceMode must be 'user-provided' or 'needs-help'." },
        { status: 400 }
      );
    }

    const session = await analyzeRepoAndPersist(input);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze repository.",
      },
      { status: 500 }
    );
  }
}
