import { piConfigured, piFetch } from "@/lib/pi/client";

/**
 * Proxy for the workspace download links the agent shares
 * (`/api/workspace/files/<path>?workspaceId=…`). The links are relative, so
 * they resolve against this app's origin — same as pixelspacev3's console,
 * where the API lives on the console's own domain. We forward to the harness
 * with the service-account session and pass the download headers through.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!piConfigured()) return new Response("File not found", { status: 404 });

  const { path } = await params;
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");

  const encoded = path
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join("/");
  const query = workspaceId
    ? `?workspaceId=${encodeURIComponent(workspaceId)}`
    : "";

  try {
    const res = await piFetch(`/api/workspace/files/${encoded}${query}`);
    if (!res.ok || !res.body) {
      return new Response("File not found", {
        status: res.status === 404 ? 404 : 502,
      });
    }
    const headers = new Headers();
    headers.set(
      "Content-Type",
      res.headers.get("content-type") ?? "application/octet-stream",
    );
    const disposition = res.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    const length = res.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(res.body, { status: 200, headers });
  } catch {
    return new Response("File not found", { status: 502 });
  }
}
