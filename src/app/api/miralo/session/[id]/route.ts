import { NextResponse } from "next/server";
import { latestValidatorArtifacts } from "@/lib/miralo/orchestrator";
import { readIterationPromptText } from "@/lib/miralo/iterationPrompt";
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
    const iterationPromptText = await readIterationPromptText(session);
    const activeBuildJob = session.activeBuildJobId
      ? (session.buildJobs || []).find((job) => job.id === session.activeBuildJobId) || null
      : null;
    const latestBuildJob = [...(session.buildJobs || [])].reverse()[0] || null;
    const latestIteration = [...(session.iterations || [])].reverse()[0] || null;
    return NextResponse.json({
      session,
      validator,
      iterationPromptText,
      activeBuildJob,
      latestBuildJob,
      latestIteration,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load session.",
      },
      { status: 500 }
    );
  }
}
