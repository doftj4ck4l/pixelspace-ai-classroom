import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";
import { roleOf } from "@/lib/roles";
import { readFeedbackFile } from "@/lib/feedback/store";

/** Serve one attachment: its submitter, or any admin. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id, index } = await params;
  const [row] = await db.select().from(feedback).where(eq(feedback.id, id));
  if (!row) return new Response("Not found", { status: 404 });
  if (row.userId !== user.id && roleOf(user) !== "superadmin") {
    return new Response("Not found", { status: 404 });
  }

  const attachment = row.attachments[Number(index)];
  if (!attachment) return new Response("Not found", { status: 404 });

  const bytes = await readFeedbackFile(attachment.file);
  if (!bytes) return new Response("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.name)}"`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
