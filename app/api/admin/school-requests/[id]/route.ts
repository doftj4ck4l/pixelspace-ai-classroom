import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schoolRequests, schools } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

const DECISIONS = ["approved", "rejected"] as const;

const isDecision = (value: unknown): value is (typeof DECISIONS)[number] =>
  typeof value === "string" && (DECISIONS as readonly string[]).includes(value);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "sekolah";

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const uniqueSlug = async (name: string) => {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (
    (
      await db
        .select({ id: schools.id })
        .from(schools)
        .where(eq(schools.slug, slug))
    ).length > 0
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRoleApi("superadmin");
  if (!user) return response;

  const { id } = await params;
  const [request] = await db
    .select()
    .from(schoolRequests)
    .where(eq(schoolRequests.id, id));
  if (!request) {
    return NextResponse.json(
      { error: "Permintaan tidak ditemui." },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  if (!isDecision(body.status)) {
    return NextResponse.json({ error: "Status tidak sah." }, { status: 400 });
  }
  if (request.status !== "pending") {
    return NextResponse.json(
      { error: "Permintaan ini telah diproses." },
      { status: 409 },
    );
  }

  if (body.status === "approved") {
    const slug = await uniqueSlug(request.schoolName);
    await db.transaction(async (tx) => {
      await tx.insert(schools).values({
        id: newId("sch"),
        name: request.schoolName,
        slug,
        type: "secondary",
        state: request.state,
      });
      await tx
        .update(schoolRequests)
        .set({ status: "approved" })
        .where(eq(schoolRequests.id, id));
    });
  } else {
    await db
      .update(schoolRequests)
      .set({ status: "rejected" })
      .where(eq(schoolRequests.id, id));
  }

  return NextResponse.json({ ok: true, status: body.status });
}
