import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, users } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

const SCHOOL_TYPES = ["primary", "secondary"] as const;

const isSchoolType = (value: unknown): value is string =>
  typeof value === "string" &&
  (SCHOOL_TYPES as readonly string[]).includes(value);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRoleApi("superadmin");
  if (!user) return response;

  const { id } = await params;
  const [school] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.id, id));
  if (!school) {
    return NextResponse.json(
      { error: "Sekolah tidak ditemui." },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    type?: unknown;
    state?: unknown;
    district?: unknown;
    isActive?: unknown;
  };

  const updates: {
    name?: string;
    type?: string;
    state?: string | null;
    district?: string | null;
    isActive?: boolean;
  } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 200) {
      return NextResponse.json(
        { error: "Nama sekolah tidak sah." },
        { status: 400 },
      );
    }
    updates.name = name;
  }
  if (body.type !== undefined) {
    if (!isSchoolType(body.type)) {
      return NextResponse.json(
        { error: "Jenis sekolah tidak sah." },
        { status: 400 },
      );
    }
    updates.type = body.type;
  }
  if (body.state !== undefined) {
    if (body.state !== null && typeof body.state !== "string") {
      return NextResponse.json({ error: "Negeri tidak sah." }, { status: 400 });
    }
    updates.state =
      typeof body.state === "string" && body.state.trim()
        ? body.state.trim()
        : null;
  }
  if (body.district !== undefined) {
    if (body.district !== null && typeof body.district !== "string") {
      return NextResponse.json({ error: "Daerah tidak sah." }, { status: 400 });
    }
    updates.district =
      typeof body.district === "string" && body.district.trim()
        ? body.district.trim()
        : null;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "Status tidak sah." }, { status: 400 });
    }
    updates.isActive = body.isActive;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Tiada perubahan dihantar." },
      { status: 400 },
    );
  }

  await db.update(schools).set(updates).where(eq(schools.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRoleApi("superadmin");
  if (!user) return response;

  const { id } = await params;
  const [school] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.id, id));
  if (!school) {
    return NextResponse.json(
      { error: "Sekolah tidak ditemui." },
      { status: 404 },
    );
  }

  const [linked] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.schoolId, id));
  if ((linked?.value ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Sekolah ini mempunyai ${linked?.value} pengguna dan tidak boleh dipadam. Pindahkan pengguna terlebih dahulu.`,
      },
      { status: 409 },
    );
  }

  await db.delete(schools).where(eq(schools.id, id));
  return NextResponse.json({ ok: true });
}
