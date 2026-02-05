import { NextResponse } from "next/server";
import { latestValidatorArtifacts } from "@/lib/miralo/orchestrator";
import { readSession } from "@/lib/miralo/sessionStore";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const sessionId = context.params.id;
    if (!sessionId) {
      return NextResponse.json({ error: "session id is required." }, { status: 400 });
    }

    const session = await readSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const validator = await latestValidatorArtifacts();
    return NextResponse.json({ session, validator });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load session.",
      },
      { status: 500 }
    );
  }
}
