import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { artifactRegistry } from "@/lib/pi/artifacts";
import { ensureSlidePages, slidePageFile } from "@/lib/slides/render";

/** One rendered document page (PNG). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; page: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id, page } = await params;
  const pageNumber = Number(page.replace(/\.png$/, ""));
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return new Response("Not found", { status: 404 });
  }

  const artifact = await artifactRegistry.getViewable(user.id, id);
  const renderable =
    artifact &&
    typeof artifact.url === "string" &&
    (artifact.type === "slides" || artifact.type === "reports");
  if (!renderable) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const pages = await ensureSlidePages(id, artifact);
    if (pageNumber > pages) return new Response("Not found", { status: 404 });
    const file = slidePageFile(id, artifact.updatedAt ?? "0", pageNumber);
    const png = readFileSync(file);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Render failed", { status: 502 });
  }
}
