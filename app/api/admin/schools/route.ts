import { NextResponse } from "next/server";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, users } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

const SCHOOL_TYPES = ["primary", "secondary"] as const;
type SchoolType = (typeof SCHOOL_TYPES)[number];

const isSchoolType = (value: unknown): value is SchoolType =>
  typeof value === "string" &&
  (SCHOOL_TYPES as readonly string[]).includes(value);

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

export async function GET() {
  const { user, response } = await requireRoleApi("superadmin");
  if (!user) return response;

  const rows = await db
    .select({
      id: schools.id,
      name: schools.name,
      slug: schools.slug,
      type: schools.type,
      state: schools.state,
      district: schools.district,
      isActive: schools.isActive,
      createdAt: schools.createdAt,
      userCount: count(users.id),
    })
    .from(schools)
    .leftJoin(users, eq(users.schoolId, schools.id))
    .groupBy(schools.id)
    .orderBy(asc(schools.name));

  return NextResponse.json({ schools: rows });
}

export async function POST(req: Request) {
  const { user, response } = await requireRoleApi("superadmin");
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    type?: unknown;
    state?: unknown;
    district?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Nama sekolah diperlukan." },
      { status: 400 },
    );
  }
  if (name.length > 200) {
    return NextResponse.json(
      { error: "Nama sekolah terlalu panjang." },
      { status: 400 },
    );
  }
  if (!isSchoolType(body.type)) {
    return NextResponse.json(
      { error: "Jenis sekolah tidak sah." },
      { status: 400 },
    );
  }
  const state =
    typeof body.state === "string" && body.state.trim()
      ? body.state.trim()
      : null;
  const district =
    typeof body.district === "string" && body.district.trim()
      ? body.district.trim()
      : null;

  const id = newId("sch");
  const slug = await uniqueSlug(name);
  const [created] = await db
    .insert(schools)
    .values({ id, name, slug, type: body.type, state, district })
    .returning();

  return NextResponse.json(
    { school: { ...created, userCount: 0 } },
    { status: 201 },
  );
}
