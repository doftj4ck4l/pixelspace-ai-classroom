import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notesProgress } from "@/lib/db/schema";
import type { NotesSection } from "@/lib/notes/spec";

/** Checked checklist indices per section id. */
export type NotesDoneState = Record<string, number[]>;

/** Persist the remapped checklist state for notes, if any progress exists. */
export const remapNotesProgress = async (
  userId: string,
  notesId: string,
  newSections: NotesSection[],
): Promise<void> => {
  const [row] = await db
    .select()
    .from(notesProgress)
    .where(
      and(eq(notesProgress.userId, userId), eq(notesProgress.notesId, notesId)),
    );
  if (!row) return;
  const state =
    row.done && typeof row.done === "object" && !Array.isArray(row.done)
      ? (row.done as NotesDoneState)
      : {};
  const next: NotesDoneState = {};
  for (const section of newSections) {
    const checked = state[section.id];
    if (!Array.isArray(checked)) continue;
    const length = section.checklist?.length ?? 0;
    const kept = checked.filter(
      (index) => Number.isInteger(index) && index >= 0 && index < length,
    );
    if (kept.length) next[section.id] = kept;
  }
  await db
    .update(notesProgress)
    .set({ done: next, updatedAt: new Date() })
    .where(
      and(eq(notesProgress.userId, userId), eq(notesProgress.notesId, notesId)),
    );
};
