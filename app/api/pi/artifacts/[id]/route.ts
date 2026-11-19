import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { artifactRegistry } from "@/lib/pi/artifacts";
import { remapDeckProgress } from "@/lib/flashcards/progress";
import { validateDeckSpec, type FlashcardSpec } from "@/lib/flashcards/spec";

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
  return NextResponse.json(artifact);
}

/**
 * Pin / favorite a deck or file card, or replace a deck's spec (manual edits).
 * Spec edits remap the user's mastery so unchanged cards keep their progress.
 */
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
    spec?: unknown;
  };

  if (patch.spec !== undefined) {
    const artifact = await artifactRegistry.get(user.id, id);
    if (
      !artifact ||
      artifact.type !== "flashcards" ||
      artifact.kind !== "spec"
    ) {
      return NextResponse.json(
        { error: "Only deck specs can be edited." },
        { status: 400 },
      );
    }
    const result = validateDeckSpec(patch.spec);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const oldSpec = artifact.spec as FlashcardSpec | undefined;
    await artifactRegistry.updateSpec(
      user.id,
      id,
      result.spec,
      result.spec.title ?? artifact.title,
    );
    await remapDeckProgress(
      user.id,
      id,
      oldSpec?.cards ?? [],
      result.spec.cards,
    );
  }

  await artifactRegistry.setFlags(user.id, id, {
    ...(typeof patch.pinned === "boolean" ? { pinned: patch.pinned } : {}),
    ...(typeof patch.favorite === "boolean"
      ? { favorite: patch.favorite }
      : {}),
  });
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
