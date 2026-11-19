import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizProgress } from "@/lib/db/schema";
import type { QuizQuestion } from "@/lib/quizzes/spec";

export type QuizResult = "correct" | "wrong";

/**
 * Rebuild per-question results after the quiz changed.
 *
 * Questions are matched by (type, question) text. A question that kept its
 * content keeps its result at its new position; edited, new, or deleted
 * questions lose it.
 */
export const remapQuizResults = (
  oldQuestions: QuizQuestion[],
  newQuestions: QuizQuestion[],
  results: Record<string, QuizResult>,
): Record<string, QuizResult> => {
  const used = new Set<number>();
  const next: Record<string, QuizResult> = {};
  newQuestions.forEach((question, index) => {
    const at = oldQuestions.findIndex(
      (old, oldIndex) =>
        !used.has(oldIndex) &&
        old.type === question.type &&
        old.question === question.question,
    );
    if (at >= 0) {
      used.add(at);
      const result = results[String(at)];
      if (result === "correct" || result === "wrong") {
        next[String(index)] = result;
      }
    }
  });
  return next;
};

/** Persist the remapped results for a quiz, if the user has any progress. */
export const remapQuizProgress = async (
  userId: string,
  quizId: string,
  oldQuestions: QuizQuestion[],
  newQuestions: QuizQuestion[],
): Promise<void> => {
  const [row] = await db
    .select()
    .from(quizProgress)
    .where(
      and(eq(quizProgress.userId, userId), eq(quizProgress.quizId, quizId)),
    );
  if (!row) return;
  const results =
    row.results &&
    typeof row.results === "object" &&
    !Array.isArray(row.results)
      ? (row.results as Record<string, QuizResult>)
      : {};
  const next = remapQuizResults(oldQuestions, newQuestions, results);
  await db
    .update(quizProgress)
    .set({
      results: next,
      total: String(newQuestions.length),
      updatedAt: new Date(),
    })
    .where(
      and(eq(quizProgress.userId, userId), eq(quizProgress.quizId, quizId)),
    );
};
