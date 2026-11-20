import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, users } from "@/lib/db/schema";
import { isRole, requireRoleApi } from "@/lib/roles";

const USER_STATUSES = ["active", "suspended"] as const;

const isUserStatus = (
  value: unknown,
): value is (typeof USER_STATUSES)[number] =>
  typeof value === "string" &&
  (USER_STATUSES as readonly string[]).includes(value);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRoleApi("superadmin");
  if (!user) return response;

  const { id } = await params;
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id));
  if (!target) {
    return NextResponse.json(
      { error: "Pengguna tidak ditemui." },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    role?: unknown;
    schoolId?: unknown;
    status?: unknown;
  };

  const updates: {
    role?: string;
    schoolId?: string | null;
    status?: string;
    updatedAt?: Date;
  } = {};

  if (body.role !== undefined) {
    if (!isRole(body.role)) {
      return NextResponse.json(
        { error: "Peranan tidak sah." },
        { status: 400 },
      );
    }
    if (id === user.id && body.role !== "superadmin") {
      return NextResponse.json(
        { error: "Anda tidak boleh mengubah peranan anda sendiri." },
        { status: 403 },
      );
    }
    updates.role = body.role;
  }

  if (body.schoolId !== undefined) {
    if (body.schoolId === null) {
      updates.schoolId = null;
    } else if (typeof body.schoolId === "string" && body.schoolId) {
      const [school] = await db
        .select({ id: schools.id })
        .from(schools)
        .where(eq(schools.id, body.schoolId));
      if (!school) {
        return NextResponse.json(
          { error: "Sekolah tidak ditemui." },
          { status: 400 },
        );
      }
      updates.schoolId = body.schoolId;
    } else {
      return NextResponse.json(
        { error: "Sekolah tidak sah." },
        { status: 400 },
      );
    }
  }

  if (body.status !== undefined) {
    if (!isUserStatus(body.status)) {
      return NextResponse.json({ error: "Status tidak sah." }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Tiada perubahan dihantar." },
      { status: 400 },
    );
  }

  updates.updatedAt = new Date();
  await db.update(users).set(updates).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
