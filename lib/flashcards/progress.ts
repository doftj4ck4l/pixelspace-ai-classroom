import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deckProgress } from "@/lib/db/schema";
import type { FlashcardItem } from "@/lib/flashcards/spec";

/**
 * Rebuild a deck's "dikuasai" index list after the cards changed.
 *
 * Cards are matched to their previous selves by (front, back) text. A card
 * that kept its content keeps its mastery at its new position; edited, new,
 * or deleted cards lose it — they should be re-learned.
 */
export const remapKnownIndices = (
  oldCards: FlashcardItem[],
  newCards: FlashcardItem[],
  knownIndices: number[],
): number[] => {
  const known = new Set(knownIndices);
  const used = new Set<number>();
  const next: number[] = [];
  newCards.forEach((card, index) => {
    const at = oldCards.findIndex(
      (old, oldIndex) =>
        !used.has(oldIndex) &&
        old.front === card.front &&
        old.back === card.back,
    );
    if (at >= 0) {
      used.add(at);
      if (known.has(at)) next.push(index);
    }
  });
  return next;
};

/** Persist the remapped mastery for a deck, if the user has any progress. */
export const remapDeckProgress = async (
  userId: string,
  deckId: string,
  oldCards: FlashcardItem[],
  newCards: FlashcardItem[],
): Promise<void> => {
  const [row] = await db
    .select()
    .from(deckProgress)
    .where(
      and(eq(deckProgress.userId, userId), eq(deckProgress.deckId, deckId)),
    );
  if (!row) return;
  const known = Array.isArray(row.knownIndices)
    ? (row.knownIndices as number[])
    : [];
  const next = remapKnownIndices(oldCards, newCards, known);
  await db
    .update(deckProgress)
    .set({
      knownIndices: next,
      total: String(newCards.length),
      updatedAt: new Date(),
    })
    .where(
      and(eq(deckProgress.userId, userId), eq(deckProgress.deckId, deckId)),
    );
};
