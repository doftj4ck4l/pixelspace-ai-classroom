import { requireApiUser } from "@/lib/auth-session";
import { storage } from "@/lib/storage";
import { getBook } from "@/lib/textbooks/library";

/** The textbook PDF itself, streamed from object storage (inline). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const book = await getBook(Number(id));
  if (!book?.fileName) return new Response("Not found", { status: 404 });

  const stored = await storage.get(`textbooks/${book.fileName}`);
  if (!stored) return new Response("Not found", { status: 404 });

  const safeName = book.fileName.replace(/[\r\n"]/g, "_");
  return new Response(new Uint8Array(stored.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(safeName)}"`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
