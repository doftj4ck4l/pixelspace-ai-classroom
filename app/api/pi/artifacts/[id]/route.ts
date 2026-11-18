import { NextResponse } from "next/server";
import { artifactRegistry } from "@/lib/pi/artifacts";

/** Removes the gallery card only; the file stays in the harness workspace. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await artifactRegistry.remove(id);
  return new Response(null, { status: 204 });
}
