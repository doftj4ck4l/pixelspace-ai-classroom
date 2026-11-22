import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { listTextbooks } from "@/lib/textbooks/library";

/** The textbook library — any signed-in account may browse it. */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const textbooks = await listTextbooks();
  return NextResponse.json(
    { textbooks },
    { headers: { "Cache-Control": "no-store" } },
  );
}
