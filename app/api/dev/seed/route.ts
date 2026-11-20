import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

/**
 * One-shot seeding for staging: the four reference schools plus the admin,
 * KPM, demo teacher and demo student accounts. Idempotent. Guarded by
 * SEED_TOKEN (or only allowed while the user table is empty).
 */

const SEED_SCHOOLS = [
  {
    name: "SK Bukit Ramun",
    slug: "sk-bukit-ramun",
    type: "primary",
    state: "Johor",
    district: "Kulai",
  },
  {
    name: "SMS Johor",
    slug: "sms-johor",
    type: "secondary",
    state: "Johor",
    district: "Kota Tinggi",
  },
  {
    name: "SK Bukit Senta",
    slug: "sk-bukit-senta",
    type: "primary",
    state: "Johor",
    district: "Segamat",
  },
  {
    name: "SK Pekan Dua",
    slug: "sk-pekan-dua",
    type: "primary",
    state: "Johor",
    district: "Muar",
  },
] as const;

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export async function POST(req: Request) {
  const token = process.env.SEED_TOKEN;
  const provided = req.headers.get("x-seed-token");
  if (token ? provided !== token : true) {
    const existing = await db.select({ id: users.id }).from(users).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Schools (idempotent by slug).
  const schoolRows: { id: string; name: string }[] = [];
  for (const school of SEED_SCHOOLS) {
    const [existing] = await db
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .where(eq(schools.slug, school.slug));
    if (existing) {
      schoolRows.push(existing);
      continue;
    }
    const id = newId("sch");
    await db.insert(schools).values({ id, ...school });
    schoolRows.push({ id, name: school.name });
  }
  const primarySchool = schoolRows[0]!;

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234";
  const accounts = [
    {
      email: "admin@pixelspace.my",
      password: adminPassword,
      name: "Superadmin",
      username: "admin",
      role: "superadmin",
      schoolId: null as string | null,
      displayName: null as string | null,
      yearLabel: null as string | null,
    },
    {
      email: "kpm@pixelspace.my",
      password: adminPassword,
      name: "Pegawai KPM",
      username: "kpm",
      role: "kpm",
      schoolId: null,
      displayName: null,
      yearLabel: null,
    },
    {
      email: "guru@demo.pixelspace.my",
      password: "DemoGuru123",
      name: "Cikgu Demo",
      username: "gurudemo",
      role: "teacher",
      schoolId: primarySchool.id,
      displayName: "Cikgu Demo",
      yearLabel: null,
    },
    {
      email: "pelajar@demo.pixelspace.my",
      password: "DemoPelajar123",
      name: "Aiman Demo",
      username: "pelajardemo",
      role: "student",
      schoolId: primarySchool.id,
      displayName: "Aiman",
      yearLabel: "Tingkatan 2",
    },
  ];

  const created: string[] = [];
  for (const account of accounts) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, account.email));
    if (existing) continue;
    try {
      await auth.api.signUpEmail({
        body: {
          email: account.email,
          password: account.password,
          name: account.name,
          username: account.username,
        },
      });
    } catch {
      // fall through to the profile update; the row may still have been created
    }
    await db
      .update(users)
      .set({
        emailVerified: true,
        role: account.role,
        schoolId: account.schoolId,
        displayName: account.displayName,
        yearLabel: account.yearLabel,
        status: "active",
      })
      .where(eq(users.email, account.email));
    created.push(`${account.email} (${account.role})`);
  }

  // The project owner account keeps full access.
  await db
    .update(users)
    .set({ role: "superadmin", status: "active" })
    .where(eq(users.email, "benjamin@nextplus.com.my"));

  return NextResponse.json({
    schools: schoolRows.map((s) => s.name),
    created,
  });
}
