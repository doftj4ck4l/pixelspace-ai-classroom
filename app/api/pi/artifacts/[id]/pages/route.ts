import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { artifactRegistry } from "@/lib/pi/artifacts";
import { ensureSlidePages } from "@/lib/slides/render";

/** Render (or serve the cached count of) a document's pages (slides, reports). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const artifact = await artifactRegistry.getViewable(user.id, id);
  const renderable =
    artifact &&
    typeof artifact.url === "string" &&
    (artifact.type === "slides" || artifact.type === "reports");
  if (!renderable) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const pages = await ensureSlidePages(id, artifact);
    return NextResponse.json(
      { pages, version: artifact.updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "render failed" }, { status: 502 });
  }
}
