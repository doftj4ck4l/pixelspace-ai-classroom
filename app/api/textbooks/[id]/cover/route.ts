import { requireApiUser } from "@/lib/auth-session";
import { storage } from "@/lib/storage";
import { getBook } from "@/lib/textbooks/library";

/** The cover image of a textbook, streamed from object storage. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const book = await getBook(Number(id));
  if (!book) return new Response("Not found", { status: 404 });

  for (const ext of ["jpg", "png"]) {
    const stored = await storage.get(`textbooks/covers/${book.id}.${ext}`);
    if (stored) {
      return new Response(new Uint8Array(stored.bytes), {
        headers: {
          "Content-Type": ext === "png" ? "image/png" : "image/jpeg",
          "Cache-Control": "private, max-age=31536000, immutable",
        },
      });
    }
  }
  return new Response("Not found", { status: 404 });
}
