import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";
import { roleOf } from "@/lib/roles";
import { removeFeedbackFile } from "@/lib/feedback/store";

const STATUSES = ["baru", "dibaca", "selesai"] as const;

/** Admin actions on one submission: mark read/resolved. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  if (roleOf(user) !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = String(body.status ?? "");
  if (!(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Status tidak sah." }, { status: 400 });
  }

  const [row] = await db.select().from(feedback).where(eq(feedback.id, id));
  if (!row) return new Response("Not found", { status: 404 });

  await db.update(feedback).set({ status }).where(eq(feedback.id, id));
  return NextResponse.json({ ok: true });
}

/** Admin can discard a submission; its attachments go with it. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  if (roleOf(user) !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [row] = await db.select().from(feedback).where(eq(feedback.id, id));
  if (!row) return new Response("Not found", { status: 404 });

  await db.delete(feedback).where(eq(feedback.id, id));
  for (const attachment of row.attachments) {
    removeFeedbackFile(attachment.file);
  }
  return new Response(null, { status: 204 });
}
