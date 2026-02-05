import { NextResponse } from "next/server";
import { cancelBuildJob } from "@/lib/miralo/iterationBuildManager";

interface RouteContext {
  params: {
    jobId: string;
  };
}

export async function POST(_: Request, context: RouteContext) {
  try {
    const jobId = context.params.jobId;
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required." }, { status: 400 });
    }

    const { session, job } = await cancelBuildJob(jobId);
    return NextResponse.json({ session, job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel build job.";
    const status = /not found/.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
