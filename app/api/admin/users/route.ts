import { NextResponse } from "next/server";
import { and, count, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { isRole, requireRoleApi } from "@/lib/roles";

const CREATE_ROLES = ["kpm", "teacher", "superadmin"] as const;

const isCreateRole = (value: unknown): value is (typeof CREATE_ROLES)[number] =>
  typeof value === "string" &&
  (CREATE_ROLES as readonly string[]).includes(value);

const userSelection = {
  id: users.id,
  name: users.name,
  displayName: users.displayName,
  email: users.email,
  username: users.username,
  role: users.role,
  schoolId: users.schoolId,
  schoolName: schools.name,
  status: users.status,
  emailVerified: users.emailVerified,
  yearLabel: users.yearLabel,
  createdAt: users.createdAt,
};

export async function GET(req: Request) {
  const { user, response } = await requireRoleApi("superadmin");
  if (!user) return response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const role = searchParams.get("role") ?? "";
  const schoolId = searchParams.get("schoolId") ?? "";
  const limitRaw = Number(searchParams.get("limit") ?? 50);
  const offsetRaw = Number(searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100)
    : 50;
  const offset = Number.isFinite(offsetRaw)
    ? Math.max(Math.trunc(offsetRaw), 0)
    : 0;

  const conditions: SQL[] = [];
  if (q) {
    const pattern = `%${q}%`;
    const search = or(
      ilike(users.email, pattern),
      ilike(users.name, pattern),
      ilike(users.username, pattern),
    );
    if (search) conditions.push(search);
  }
  if (isRole(role)) conditions.push(eq(users.role, role));
  if (schoolId === "none") conditions.push(isNull(users.schoolId));
  else if (schoolId) conditions.push(eq(users.schoolId, schoolId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select(userSelection)
      .from(users)
      .leftJoin(schools, eq(users.schoolId, schools.id))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(users).where(where),
  ]);

  return NextResponse.json({
    users: rows,
    total: totals[0]?.value ?? 0,
    limit,
    offset,
  });
}

export async function POST(req: Request) {
  const { user, response } = await requireRoleApi("superadmin");
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
    username?: unknown;
    role?: unknown;
  };

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username =
    typeof body.username === "string" && body.username.trim()
      ? body.username.trim().toLowerCase()
      : undefined;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mel tidak sah." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Kata laluan mesti sekurang-kurangnya 8 aksara." },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json({ error: "Nama diperlukan." }, { status: 400 });
  }
  if (!isCreateRole(body.role)) {
    return NextResponse.json(
      { error: "Peranan tidak dibenarkan." },
      { status: 400 },
    );
  }
  if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Nama pengguna tidak sah." },
      { status: 400 },
    );
  }

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existingEmail) {
    return NextResponse.json(
      { error: "E-mel ini telah didaftarkan." },
      { status: 409 },
    );
  }
  if (username) {
    const [existingUsername] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username));
    if (existingUsername) {
      return NextResponse.json(
        { error: "Nama pengguna ini telah digunakan." },
        { status: 409 },
      );
    }
  }

  try {
    await auth.api.signUpEmail({
      body: { email, password, name, username },
    });
  } catch {
    return NextResponse.json(
      { error: "Pendaftaran akaun gagal. Semak butiran dan cuba lagi." },
      { status: 400 },
    );
  }

  await db
    .update(users)
    .set({
      role: body.role,
      emailVerified: true,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(users.email, email));

  const [created] = await db
    .select(userSelection)
    .from(users)
    .leftJoin(schools, eq(users.schoolId, schools.id))
    .where(eq(users.email, email));
  if (!created) {
    return NextResponse.json(
      { error: "Akaun tidak dapat dimuatkan selepas dicipta." },
      { status: 500 },
    );
  }

  return NextResponse.json({ user: created }, { status: 201 });
}
