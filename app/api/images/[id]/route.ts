import { requireApiUser } from "@/lib/auth-session";
import { piConfigured, piFetch } from "@/lib/pi/client";

/**
 * Proxy for generated/uploaded images (`/api/images/<id>`), which the agent
 * embeds in its answers. pi serves them with their real content type so they
 * render inline — same path the console uses on its own origin.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  if (!piConfigured()) return new Response("Not found", { status: 404 });

  const { id } = await params;
  try {
    const res = await piFetch(`/api/images/${encodeURIComponent(id)}`);
    if (!res.ok || !res.body) {
      return new Response("Not found", {
        status: res.status === 404 ? 404 : 502,
      });
    }
    const headers = new Headers();
    headers.set(
      "Content-Type",
      res.headers.get("content-type") ?? "application/octet-stream",
    );
    headers.set(
      "Cache-Control",
      res.headers.get("cache-control") ?? "public, max-age=31536000, immutable",
    );
    const length = res.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(res.body, { status: 200, headers });
  } catch {
    return new Response("Not found", { status: 502 });
  }
}
