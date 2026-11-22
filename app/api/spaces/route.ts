import { NextResponse } from "next/server";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, spaceMembers, spaces, users } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";
import {
  attachTextbookSubject,
  levelOrderFor,
  matchSubject,
} from "@/lib/textbooks/library";

const ACCENTS = ["teal", "blue", "amber", "violet", "rose", "emerald"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const newCode = () =>
  Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");

/** Subjects: teachers see their own; students see the ones they joined. */
export async function GET() {
  const { user, response } = await requireRoleApi("teacher", "student");
  if (!user) return response;

  if (user.role === "teacher") {
    const rows = await db
      .select()
      .from(spaces)
      .where(eq(spaces.userId, user.id))
      .orderBy(desc(spaces.createdAt));
    const counts = rows.length
      ? await db
          .select({
            spaceId: spaceMembers.spaceId,
            count: sql<number>`count(*)`,
          })
          .from(spaceMembers)
          .where(
            inArray(
              spaceMembers.spaceId,
              rows.map((row) => row.id),
            ),
          )
          .groupBy(spaceMembers.spaceId)
      : [];
    const countBySpace = new Map(
      counts.map((row) => [row.spaceId, Number(row.count) || 0]),
    );
    const schoolId = (user as { schoolId?: string | null }).schoolId ?? null;
    const [school] = schoolId
      ? await db
          .select({ name: schools.name, type: schools.type })
          .from(schools)
          .where(eq(schools.id, schoolId))
      : [];
    return NextResponse.json(
      {
        school: school ?? null,
        spaces: rows.map((space) => ({
          id: space.id,
          name: space.name,
          level: space.level,
          description: space.description ?? "",
          accent: space.accent,
          code: space.code,
          members: countBySpace.get(space.id) ?? 0,
          teacher: user.name ?? "Guru",
          createdAt: space.createdAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = await db
    .select({
      space: spaces,
      teacherName: users.name,
      displayName: users.displayName,
    })
    .from(spaceMembers)
    .innerJoin(spaces, eq(spaces.id, spaceMembers.spaceId))
    .leftJoin(users, eq(users.id, spaces.userId))
    .where(eq(spaceMembers.userId, user.id))
    .orderBy(desc(spaceMembers.createdAt));
  return NextResponse.json(
    {
      spaces: rows.map(({ space, teacherName, displayName }) => ({
        id: space.id,
        name: space.name,
        level: space.level,
        description: space.description ?? "",
        accent: space.accent,
        teacher: displayName ?? teacherName ?? "Guru",
        createdAt: space.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Add a subject with a fresh join code (teachers only). */
export async function POST(req: Request) {
  const { user, response } = await requireRoleApi("teacher");
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    level?: unknown;
    description?: unknown;
    accent?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Nama subjek diperlukan." },
      { status: 400 },
    );
  }
  const level =
    typeof body.level === "string" && body.level.trim()
      ? body.level.trim()
      : "Umum";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 300)
      : "";
  const accent =
    typeof body.accent === "string" && ACCENTS.includes(body.accent)
      ? body.accent
      : "teal";

  // Retry on the (astronomically unlikely) code collision.
  let code = newCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const [existing] = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(eq(spaces.code, code));
    if (!existing) break;
    code = newCode();
  }

  const id = `spc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(spaces).values({
    id,
    userId: user.id,
    schoolId: (user as { schoolId?: string | null }).schoolId ?? null,
    name: name.slice(0, 120),
    level,
    ...(description ? { description } : {}),
    accent,
    code,
  });

  // Ground the new space in its textbook: match the name against the library
  // at this level and attach the whole subject (best-effort).
  try {
    const levelOrder = levelOrderFor(level);
    if (levelOrder !== null) {
      const subject = await matchSubject(levelOrder, name);
      if (subject) await attachTextbookSubject(id, levelOrder, subject);
    }
  } catch {
    // the space exists either way; sources can be attached later
  }

  return NextResponse.json({ id, code });
}
