import { NextResponse } from "next/server";
import { listSessions } from "@/lib/miralo/sessionStore";

export async function GET() {
  try {
    const sessions = await listSessions(20);
    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to list sessions.",
      },
      { status: 500 }
    );
  }
}
