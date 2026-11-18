import { NextResponse } from "next/server";
import { artifactRegistry } from "@/lib/pi/artifacts";

/** Artifacts the agent shared in chat, newest first. */
export async function GET() {
  return NextResponse.json({ artifacts: await artifactRegistry.list() });
}
