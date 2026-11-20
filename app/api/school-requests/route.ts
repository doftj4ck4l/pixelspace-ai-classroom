import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schoolRequests } from "@/lib/db/schema";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

/** Public "my school isn't listed" requests from the registration flow. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    schoolName?: unknown;
    state?: unknown;
    note?: unknown;
    requestedBy?: unknown;
  } | null;

  const schoolName = clean(body?.schoolName);
  const state = clean(body?.state);
  const note = clean(body?.note);
  const requestedBy = clean(body?.requestedBy);

  if (
    schoolName.length < 3 ||
    schoolName.length > 120 ||
    state.length > 60 ||
    note.length > 500 ||
    (requestedBy.length > 0 && !EMAIL_PATTERN.test(requestedBy))
  ) {
    return NextResponse.json(
      { error: "Permintaan tidak sah." },
      { status: 400 },
    );
  }

  await db.insert(schoolRequests).values({
    id: `sr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    schoolName,
    state: state || null,
    note: note || null,
    requestedBy: requestedBy || null,
  });

  return NextResponse.json({ ok: true });
}
