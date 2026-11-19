/**
 * Shared flashcard spec types + validation.
 *
 * Mirrors the harness validator (apply-flashcards-patch.mjs) so anything the
 * app accepts renders correctly. Generation enforces 6-40 cards; manual edits
 * allow 1-40 so a user can trim a deck down.
 */

export type FlashcardItem = {
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  type?: "term" | "question" | "cloze" | "formula";
};

export type FlashcardSpec = {
  title?: string;
  subject?: string;
  language?: string;
  accent?: string;
  cards: FlashcardItem[];
};

export const FLASHCARD_ACCENTS = [
  "teal",
  "blue",
  "amber",
  "violet",
  "rose",
  "emerald",
] as const;

export const FLASHCARD_TYPES = [
  "term",
  "question",
  "cloze",
  "formula",
] as const;

const FRONT_MAX = 140;
const BACK_MAX = 400;
const HINT_MAX = 200;

export type DeckSpecValidation =
  | { ok: true; spec: FlashcardSpec }
  | { ok: false; error: string };

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Validates a manually-edited or AI-edited deck spec (1-40 cards). */
export const validateDeckSpec = (input: unknown): DeckSpecValidation => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Spec must be an object." };
  }
  const raw = input as Record<string, unknown>;
  const cardsRaw = Array.isArray(raw.cards) ? raw.cards : [];
  if (cardsRaw.length === 0) {
    return { ok: false, error: "A deck needs at least one card." };
  }
  if (cardsRaw.length > 40) {
    return { ok: false, error: "A deck supports at most 40 cards." };
  }

  const accent = str(raw.accent);
  if (accent && !(FLASHCARD_ACCENTS as readonly string[]).includes(accent)) {
    return {
      ok: false,
      error: `accent must be one of: ${FLASHCARD_ACCENTS.join(", ")}`,
    };
  }

  const cards: FlashcardItem[] = [];
  for (const [index, entry] of cardsRaw.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: `Card ${index + 1} must be an object.` };
    }
    const card = entry as Record<string, unknown>;
    const front = str(card.front);
    const back = str(card.back);
    if (!front) return { ok: false, error: `Card ${index + 1} needs a front.` };
    if (front.length > FRONT_MAX) {
      return {
        ok: false,
        error: `Card ${index + 1} front exceeds ${FRONT_MAX} characters.`,
      };
    }
    if (!back) return { ok: false, error: `Card ${index + 1} needs a back.` };
    if (back.length > BACK_MAX) {
      return {
        ok: false,
        error: `Card ${index + 1} back exceeds ${BACK_MAX} characters.`,
      };
    }
    const hint = str(card.hint);
    if (hint.length > HINT_MAX) {
      return {
        ok: false,
        error: `Card ${index + 1} hint exceeds ${HINT_MAX} characters.`,
      };
    }
    const tags = Array.isArray(card.tags)
      ? card.tags.map((tag) => str(tag)).filter(Boolean)
      : [];
    if (tags.length > 3) {
      return { ok: false, error: `Card ${index + 1} supports up to 3 tags.` };
    }
    const type = str(card.type);
    if (type && !(FLASHCARD_TYPES as readonly string[]).includes(type)) {
      return {
        ok: false,
        error: `Card ${index + 1} type must be one of: ${FLASHCARD_TYPES.join(", ")}`,
      };
    }
    cards.push({
      front,
      back,
      ...(hint ? { hint } : {}),
      ...(tags.length ? { tags } : {}),
      ...(type ? { type: type as FlashcardItem["type"] } : {}),
    });
  }

  const title = str(raw.title);
  const subject = str(raw.subject);
  const language = str(raw.language);
  return {
    ok: true,
    spec: {
      ...(title ? { title } : {}),
      ...(subject ? { subject } : {}),
      ...(language ? { language } : {}),
      ...(accent ? { accent } : {}),
      cards,
    },
  };
};
