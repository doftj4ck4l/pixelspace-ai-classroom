import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

export async function GET() {
  const { user, response } = await requireRoleApi("kpm", "superadmin");
  if (!user) return response;

  const rows = await db
    .select({
      id: schools.id,
      name: schools.name,
      state: schools.state,
      district: schools.district,
    })
    .from(schools)
    .where(eq(schools.isActive, true))
    .orderBy(schools.name);

  return NextResponse.json(
    { schools: rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}
