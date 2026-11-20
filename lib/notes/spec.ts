/**
 * Shared study-notes spec types + validation.
 *
 * Mirrors the harness validator (apply-flashcards-patch.mjs, notes block).
 * Section ids are stable slugs — checklist progress keys off them.
 */

export type NotesChecklistItem = { text: string };

export type NotesSection = {
  id: string;
  heading: string;
  body?: string;
  bullets?: string[];
  checklist?: NotesChecklistItem[];
};

export type NotesSpec = {
  title?: string;
  subject?: string;
  language?: string;
  accent?: string;
  sections: NotesSection[];
};

export const NOTES_SECTION_MAX = 30;
export const NOTES_ACCENTS = [
  "teal",
  "blue",
  "amber",
  "violet",
  "rose",
  "emerald",
] as const;

export type NotesValidation =
  | { ok: true; spec: NotesSpec }
  | { ok: false; error: string };

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Validates a generated or AI-edited notes spec (1-30 sections). */
export const validateNotesSpec = (input: unknown): NotesValidation => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Spec must be an object." };
  }
  const raw = input as Record<string, unknown>;
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];
  if (sectionsRaw.length === 0) {
    return { ok: false, error: "Notes need at least one section." };
  }
  if (sectionsRaw.length > NOTES_SECTION_MAX) {
    return {
      ok: false,
      error: `Notes support at most ${NOTES_SECTION_MAX} sections.`,
    };
  }

  const accent = str(raw.accent);
  if (accent && !(NOTES_ACCENTS as readonly string[]).includes(accent)) {
    return {
      ok: false,
      error: `accent must be one of: ${NOTES_ACCENTS.join(", ")}`,
    };
  }

  const sections: NotesSection[] = [];
  const ids = new Set<string>();
  for (const [index, entry] of sectionsRaw.entries()) {
    const at = `Section ${index + 1}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: `${at} must be an object.` };
    }
    const section = entry as Record<string, unknown>;
    const id = str(section.id);
    const heading = str(section.heading);
    if (!id) return { ok: false, error: `${at} needs an id.` };
    if (!/^[a-z0-9-]{1,40}$/.test(id)) {
      return {
        ok: false,
        error: `${at} id must be a short slug (a-z, 0-9, dashes).`,
      };
    }
    if (ids.has(id))
      return { ok: false, error: `${at} id "${id}" is duplicated.` };
    ids.add(id);
    if (!heading) return { ok: false, error: `${at} needs a heading.` };
    if (heading.length > 80) {
      return { ok: false, error: `${at} heading exceeds 80 characters.` };
    }
    const body = str(section.body);
    if (body.length > 1500) {
      return { ok: false, error: `${at} body exceeds 1500 characters.` };
    }
    const bullets = Array.isArray(section.bullets)
      ? section.bullets.map((bullet) => str(bullet)).filter(Boolean)
      : [];
    if (bullets.length > 8) {
      return { ok: false, error: `${at} supports up to 8 bullets.` };
    }
    if (bullets.some((bullet) => bullet.length > 200)) {
      return {
        ok: false,
        error: `${at} bullets must be 200 characters or fewer.`,
      };
    }
    const checklistRaw = Array.isArray(section.checklist)
      ? section.checklist
      : [];
    if (checklistRaw.length > 10) {
      return { ok: false, error: `${at} supports up to 10 checklist items.` };
    }
    const checklist: NotesChecklistItem[] = [];
    for (const item of checklistRaw) {
      const text =
        typeof item === "string"
          ? str(item)
          : item && typeof item === "object" && !Array.isArray(item)
            ? str((item as { text?: unknown }).text)
            : "";
      if (!text)
        return { ok: false, error: `${at} checklist items need text.` };
      if (text.length > 120) {
        return {
          ok: false,
          error: `${at} checklist items must be 120 characters or fewer.`,
        };
      }
      checklist.push({ text });
    }
    sections.push({
      id,
      heading,
      ...(body ? { body } : {}),
      ...(bullets.length ? { bullets } : {}),
      ...(checklist.length ? { checklist } : {}),
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
      sections,
    },
  };
};
