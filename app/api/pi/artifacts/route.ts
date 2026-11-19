import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { artifactRegistry } from "@/lib/pi/artifacts";

/** Artifacts the agent shared in chat, newest first, for the signed-in user. */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  return NextResponse.json({ artifacts: await artifactRegistry.list(user.id) });
}
