import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { feedback, schools, type FeedbackAttachment } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";
import { roleOf } from "@/lib/roles";
import {
  FEEDBACK_EXTS,
  MAX_FEEDBACK_FILE_BYTES,
  MAX_FEEDBACK_FILES,
  feedbackMimeFor,
  removeFeedbackFile,
  saveFeedbackFile,
} from "@/lib/feedback/store";

const MAX_SUBJECT = 120;
const MAX_MESSAGE = 4000;

const toRow = (row: typeof feedback.$inferSelect) => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  email: row.email,
  role: row.role,
  schoolId: row.schoolId,
  schoolName: row.schoolName,
  subject: row.subject,
  message: row.message,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  attachments: row.attachments.map((attachment, index) => ({
    name: attachment.name,
    mime: attachment.mime,
    size: attachment.size,
    url: `/api/feedback/${row.id}/files/${index}`,
  })),
});

/**
 * Feedback inbox. Teachers and KPM see only what they submitted; admins see
 * everything, newest first.
 */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const role = roleOf(user);
  if (role !== "teacher" && role !== "kpm" && role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows =
    role === "superadmin"
      ? await db.select().from(feedback).orderBy(desc(feedback.createdAt))
      : await db
          .select()
          .from(feedback)
          .where(eq(feedback.userId, user.id))
          .orderBy(desc(feedback.createdAt));

  return NextResponse.json(
    { feedback: rows.map(toRow) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Submit feedback (multipart form data). Identity — name, email, role and
 * school — is captured from the session, never typed by the user.
 */
export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const role = roleOf(user);
  if (role !== "teacher" && role !== "kpm") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Permintaan tidak sah." },
      { status: 400 },
    );
  }

  const subject = String(form.get("subject") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  if (!subject || subject.length > MAX_SUBJECT) {
    return NextResponse.json(
      { error: `Subjek diperlukan (maksimum ${MAX_SUBJECT} aksara).` },
      { status: 400 },
    );
  }
  if (!message || message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Mesej diperlukan (maksimum ${MAX_MESSAGE} aksara).` },
      { status: 400 },
    );
  }

  const files = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);
  if (files.length > MAX_FEEDBACK_FILES) {
    return NextResponse.json(
      { error: `Maksimum ${MAX_FEEDBACK_FILES} lampiran sahaja.` },
      { status: 400 },
    );
  }

  const attachments: FeedbackAttachment[] = [];
  for (const file of files) {
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!(FEEDBACK_EXTS as readonly string[]).includes(ext)) {
      return NextResponse.json(
        {
          error: `Format .${ext} tidak disokong. Lampirkan imej (png, jpg, jpeg, gif, webp, svg) atau pdf.`,
        },
        { status: 400 },
      );
    }
    if (file.size > MAX_FEEDBACK_FILE_BYTES) {
      return NextResponse.json(
        { error: `${file.name} melebihi 10 MB.` },
        { status: 400 },
      );
    }
    const stored = await saveFeedbackFile(
      ext,
      Buffer.from(await file.arrayBuffer()),
    );
    attachments.push({
      name: file.name,
      mime: feedbackMimeFor(ext),
      size: file.size,
      file: stored,
    });
  }

  // Snapshot who sent this and from which school.
  const school = user.schoolId
    ? (await db.select().from(schools).where(eq(schools.id, user.schoolId)))[0]
    : undefined;

  const id = `fbk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await db.insert(feedback).values({
      id,
      userId: user.id,
      schoolId: school?.id ?? null,
      name: user.name,
      email: user.email,
      role,
      schoolName: school?.name ?? null,
      subject,
      message,
      attachments,
      status: "baru",
    });
  } catch {
    for (const attachment of attachments)
      await removeFeedbackFile(attachment.file);
    return NextResponse.json(
      { error: "Gagal menghantar maklum balas. Cuba lagi." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id });
}
