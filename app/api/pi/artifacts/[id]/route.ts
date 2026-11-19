import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { artifactRegistry } from "@/lib/pi/artifacts";

/** One owned artifact (used by the deck page). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const artifact = await artifactRegistry.get(user.id, id);
  if (!artifact) return new Response(null, { status: 404 });
  // Silent refetches after AI edits must never hit an HTTP cache.
  return NextResponse.json(artifact, {
    headers: { "Cache-Control": "no-store" },
  });
}

/** Pin / favorite a deck or file card. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const patch = (await req.json().catch(() => ({}))) as {
    pinned?: boolean;
    favorite?: boolean;
  };

  if (
    typeof patch.pinned === "boolean" ||
    typeof patch.favorite === "boolean"
  ) {
    await artifactRegistry.setFlags(user.id, id, {
      ...(typeof patch.pinned === "boolean" ? { pinned: patch.pinned } : {}),
      ...(typeof patch.favorite === "boolean"
        ? { favorite: patch.favorite }
        : {}),
    });
  }
  return new Response(null, { status: 204 });
}

/** Removes the gallery card only; the file stays in the harness workspace. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  await artifactRegistry.remove(user.id, id);
  return new Response(null, { status: 204 });
}
