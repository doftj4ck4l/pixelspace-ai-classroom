import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  artifacts,
  quizProgress,
  spaceMembers,
  spaces,
  threads,
  users,
} from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";

/**
 * Space insights for the owner: who is enrolled and how engaged they are.
 * Activity is counted from real records (chats, generated artifacts, quiz
 * attempts) plus the last time the student was active.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const [space] = await db
    .select()
    .from(spaces)
    .where(and(eq(spaces.id, id), eq(spaces.userId, user.id)));
  if (!space) return NextResponse.json({ error: "not found" }, { status: 404 });

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      displayName: users.displayName,
      email: users.email,
      yearLabel: users.yearLabel,
      className: users.className,
      joinedAt: spaceMembers.createdAt,
    })
    .from(spaceMembers)
    .innerJoin(users, eq(users.id, spaceMembers.userId))
    .where(eq(spaceMembers.spaceId, id))
    .orderBy(spaceMembers.createdAt);

  const userIds = members.map((member) => member.id);
  const chats = new Map<string, number>();
  const artifactsCount = new Map<string, number>();
  const quizzes = new Map<string, number>();
  const lastActive = new Map<string, Date | null>();

  if (userIds.length) {
    const chatRows = await db
      .select({
        userId: threads.userId,
        count: sql<number>`count(*)::int`,
        last: sql<Date | null>`max(${threads.lastMessageAt})`,
      })
      .from(threads)
      .where(inArray(threads.userId, userIds))
      .groupBy(threads.userId);
    for (const row of chatRows) {
      chats.set(row.userId, Number(row.count) || 0);
      lastActive.set(row.userId, row.last ? new Date(row.last) : null);
    }

    const artifactRows = await db
      .select({
        userId: artifacts.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(artifacts)
      .where(inArray(artifacts.userId, userIds))
      .groupBy(artifacts.userId);
    for (const row of artifactRows) {
      artifactsCount.set(row.userId, Number(row.count) || 0);
    }

    const quizRows = await db
      .select({
        userId: quizProgress.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(quizProgress)
      .where(inArray(quizProgress.userId, userIds))
      .groupBy(quizProgress.userId);
    for (const row of quizRows) {
      quizzes.set(row.userId, Number(row.count) || 0);
    }
  }

  const students = members.map((member) => ({
    id: member.id,
    name: member.displayName ?? member.name,
    email: member.email,
    yearLabel: member.yearLabel,
    className: member.className,
    joinedAt: member.joinedAt.toISOString(),
    chats: chats.get(member.id) ?? 0,
    artifacts: artifactsCount.get(member.id) ?? 0,
    quizzes: quizzes.get(member.id) ?? 0,
    lastActive: lastActive.get(member.id)?.toISOString() ?? null,
  }));

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeThisWeek = students.filter(
    (student) =>
      student.lastActive && new Date(student.lastActive).getTime() >= weekAgo,
  ).length;

  return NextResponse.json(
    {
      space: {
        id: space.id,
        name: space.name,
        level: space.level,
        code: space.code,
      },
      summary: {
        students: students.length,
        activeThisWeek,
        chats: students.reduce((sum, student) => sum + student.chats, 0),
        quizzes: students.reduce((sum, student) => sum + student.quizzes, 0),
      },
      students,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
