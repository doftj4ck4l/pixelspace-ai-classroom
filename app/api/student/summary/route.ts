import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  artifacts,
  authEvents,
  deckProgress,
  mindmapProgress,
  notesProgress,
  quizProgress,
  sessions,
  threads,
} from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";

/** Malaysia time (UTC+8, no DST) so "today" matches the school day. */
const dayKey = (date: Date) =>
  new Date(date.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);

const DAY_MS = 86_400_000;

/** GET /api/student/summary — the signed-in student's progress snapshot. */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const [
    threadRows,
    artifactRows,
    deckRows,
    quizRows,
    mapRows,
    notesRows,
    loginRows,
    sessionRows,
  ] = await Promise.all([
    db
      .select({ lastMessageAt: threads.lastMessageAt })
      .from(threads)
      .where(eq(threads.userId, user.id)),
    db
      .select({ createdAt: artifacts.createdAt })
      .from(artifacts)
      .where(eq(artifacts.userId, user.id)),
    db
      .select({
        knownIndices: deckProgress.knownIndices,
        updatedAt: deckProgress.updatedAt,
      })
      .from(deckProgress)
      .where(eq(deckProgress.userId, user.id)),
    db
      .select({
        results: quizProgress.results,
        total: quizProgress.total,
        updatedAt: quizProgress.updatedAt,
      })
      .from(quizProgress)
      .where(eq(quizProgress.userId, user.id)),
    db
      .select({
        nodeState: mindmapProgress.nodeState,
        updatedAt: mindmapProgress.updatedAt,
      })
      .from(mindmapProgress)
      .where(eq(mindmapProgress.userId, user.id)),
    db
      .select({ done: notesProgress.done, updatedAt: notesProgress.updatedAt })
      .from(notesProgress)
      .where(eq(notesProgress.userId, user.id)),
    db
      .select({ createdAt: authEvents.createdAt })
      .from(authEvents)
      .where(
        and(eq(authEvents.userId, user.id), eq(authEvents.event, "login")),
      ),
    db
      .select({ createdAt: sessions.createdAt })
      .from(sessions)
      .where(eq(sessions.userId, user.id)),
  ]);

  const cardsMastered = deckRows.reduce(
    (sum, row) =>
      sum + (Array.isArray(row.knownIndices) ? row.knownIndices.length : 0),
    0,
  );

  const quizzesDone = quizRows.length;
  let quizzesAce = 0;
  for (const row of quizRows) {
    const results =
      row.results && typeof row.results === "object"
        ? (row.results as Record<string, string>)
        : {};
    const answered = Object.values(results).filter(
      (value) => value === "correct" || value === "wrong",
    ).length;
    const total = Number(row.total) || answered;
    const correct = Object.values(results).filter(
      (value) => value === "correct",
    ).length;
    if (total > 0 && correct / total >= 0.8) quizzesAce += 1;
  }

  const mapsMastered = mapRows.reduce((sum, row) => {
    const state =
      row.nodeState && typeof row.nodeState === "object"
        ? (row.nodeState as Record<string, { level?: number }>)
        : {};
    return (
      sum +
      Object.values(state).filter((node) => (node?.level ?? 0) >= 3).length
    );
  }, 0);

  const checklistDone = notesRows.reduce((sum, row) => {
    const done =
      row.done && typeof row.done === "object"
        ? (row.done as Record<string, number[]>)
        : {};
    return (
      sum +
      Object.values(done).reduce(
        (count, list) => count + (Array.isArray(list) ? list.length : 0),
        0,
      )
    );
  }, 0);

  const chats = threadRows.filter((row) => row.lastMessageAt).length;

  const days = new Set<string>();
  for (const row of threadRows)
    if (row.lastMessageAt) days.add(dayKey(row.lastMessageAt));
  for (const row of artifactRows) days.add(dayKey(row.createdAt));
  for (const row of deckRows) days.add(dayKey(row.updatedAt));
  for (const row of quizRows) days.add(dayKey(row.updatedAt));
  for (const row of mapRows) days.add(dayKey(row.updatedAt));
  for (const row of notesRows) days.add(dayKey(row.updatedAt));
  for (const row of loginRows) days.add(dayKey(row.createdAt));
  for (const row of sessionRows) days.add(dayKey(row.createdAt));

  const now = Date.now();
  const todayKey = dayKey(new Date(now));
  const yesterdayKey = dayKey(new Date(now - DAY_MS));
  const todayActive = days.has(todayKey);

  let streakDays = 0;
  if (todayActive || days.has(yesterdayKey)) {
    let cursor = todayActive ? now : now - DAY_MS;
    while (days.has(dayKey(new Date(cursor)))) {
      streakDays += 1;
      cursor -= DAY_MS;
    }
  }

  const xp =
    cardsMastered * 5 +
    quizzesDone * 15 +
    quizzesAce * 5 +
    mapsMastered * 10 +
    checklistDone * 2;
  const level = Math.floor(xp / 100) + 1;

  const achievements = [
    {
      id: "first-artifact",
      label: "Karya pertama",
      earned: artifactRows.length >= 1,
    },
    { id: "chats-10", label: "10 sembang", earned: chats >= 10 },
    { id: "cards-50", label: "50 kad dikuasai", earned: cardsMastered >= 50 },
    { id: "quizzes-5", label: "5 kuiz selesai", earned: quizzesDone >= 5 },
    { id: "quiz-ace", label: "Juara kuiz 80%+", earned: quizzesAce >= 1 },
    {
      id: "map-master",
      label: "5 nod peta dikuasai",
      earned: mapsMastered >= 5,
    },
    { id: "streak-7", label: "Rentetan 7 hari", earned: streakDays >= 7 },
  ];

  return NextResponse.json(
    {
      streakDays,
      xp,
      level,
      todayActive,
      cardsMastered,
      quizzesDone,
      mapsMastered,
      checklistDone,
      achievements,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
