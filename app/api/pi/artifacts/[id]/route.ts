import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { removeGeneratedImage } from "@/lib/generated/store";
import { artifactRegistry } from "@/lib/pi/artifacts";
import { piConfigured, piFetch } from "@/lib/pi/client";

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

/**
 * Delete an artifact. Output files are kept forever until the user deletes
 * them here — so this also removes the stored bytes (the workspace file via
 * the harness, or an app-generated image), but only when no other artifact
 * still references the same file.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const artifact = await artifactRegistry.get(user.id, id);

  if (artifact?.kind === "file" && artifact.url) {
    const others = await artifactRegistry.list(user.id);
    const stillReferenced = others.some(
      (other) =>
        other.id !== id &&
        (other.url === artifact.url ||
          (other.path !== undefined && other.path === artifact.path)),
    );
    if (!stillReferenced) {
      try {
        if (artifact.url.startsWith("/api/generated/")) {
          await removeGeneratedImage(
            artifact.url.replace("/api/generated/", ""),
          );
        } else if (
          artifact.url.startsWith("/api/workspace/files/") &&
          piConfigured()
        ) {
          // Deletes the workspace file and its object-storage copy.
          await piFetch(artifact.url, { method: "DELETE" });
        }
      } catch {
        // Best-effort: the gallery card must still disappear.
      }
    }
  }

  await artifactRegistry.remove(user.id, id);
  return new Response(null, { status: 204 });
}
