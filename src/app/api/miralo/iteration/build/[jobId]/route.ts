import { NextResponse } from "next/server";
import { findBuildJobById, readBuildLogTail } from "@/lib/miralo/iterationBuildManager";

interface RouteContext {
  params: {
    jobId: string;
  };
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const jobId = context.params.jobId;
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required." }, { status: 400 });
    }

    const found = await findBuildJobById(jobId);
    if (!found) {
      return NextResponse.json({ error: "Build job not found." }, { status: 404 });
    }

    const logTail = await readBuildLogTail(found.job);
    return NextResponse.json({ session: found.session, job: found.job, logTail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load build job." },
      { status: 500 }
    );
  }
}
