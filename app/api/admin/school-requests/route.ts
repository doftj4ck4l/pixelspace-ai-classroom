import { NextResponse } from "next/server";
import { and, count, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { schoolRequests } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;

const isRequestStatus = (
  value: string | null,
): value is (typeof REQUEST_STATUSES)[number] =>
  value !== null && (REQUEST_STATUSES as readonly string[]).includes(value);

export async function GET(req: Request) {
  const { user, response } = await requireRoleApi("superadmin");
  if (!user) return response;

  const status = new URL(req.url).searchParams.get("status");
  const conditions: SQL[] = [];
  if (isRequestStatus(status)) {
    conditions.push(eq(schoolRequests.status, status));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, pending] = await Promise.all([
    db
      .select()
      .from(schoolRequests)
      .where(where)
      .orderBy(desc(schoolRequests.createdAt)),
    db
      .select({ value: count() })
      .from(schoolRequests)
      .where(eq(schoolRequests.status, "pending")),
  ]);

  return NextResponse.json({
    requests: rows,
    pendingCount: pending[0]?.value ?? 0,
  });
}
