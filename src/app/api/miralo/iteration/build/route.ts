import { NextResponse } from "next/server";
import { startIterationBuild } from "@/lib/miralo/iterationBuildManager";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { sessionId?: string };
    if (!payload.sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const { session, job } = await startIterationBuild(payload.sessionId);
    return NextResponse.json({ session, job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start iteration build.";
    const status = /already in progress/.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
