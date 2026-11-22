import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { spaceSources, spaces, sources } from "@/lib/db/schema";
import { vectorQuery } from "@/lib/vectors";

/**
 * The textbook library: metadata + passages live in the vector database (a
 * copy of the ingested national textbook collection); space attachments live
 * in the app database. Everything here is server-side.
 */

export type Textbook = {
  id: number;
  title: string;
  subject: string;
  level: string;
  levelOrder: number;
  school: string | null;
  pages: number | null;
  embedded: boolean;
  spaces: number;
  coverUrl: string;
  fileUrl: string;
};

export { levelLabel, levelOrderFor } from "./levels";
import { levelOrderFor } from "./levels";

export const normalizeSubject = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

type BookRow = {
  id: number;
  title: string;
  subject: string;
  level: string;
  level_order: number;
  school: string | null;
  page_count: number | null;
  file_name: string | null;
  chunks: string;
};

export const listTextbooks = async (): Promise<Textbook[]> => {
  const { rows } = await vectorQuery<BookRow>(
    `select b.id, b.title, b.subject, b.level, b.level_order, b.school,
            b.page_count, b.file_name,
            (select count(*) from chunks c where c.book_id = b.id)::text as chunks
     from books b
     order by b.level_order, b.subject, b.title`,
  );
  const usage = await db
    .select({ refId: spaceSources.refId })
    .from(spaceSources)
    .where(eq(spaceSources.kind, "textbook"));
  const usageCount = new Map<string, number>();
  for (const row of usage) {
    usageCount.set(row.refId, (usageCount.get(row.refId) ?? 0) + 1);
  }
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    level: row.level,
    levelOrder: row.level_order,
    school: row.school,
    pages: row.page_count,
    embedded: Number(row.chunks) > 0,
    spaces: usageCount.get(String(row.id)) ?? 0,
    coverUrl: `/api/textbooks/${row.id}/cover`,
    fileUrl: `/api/textbooks/${row.id}/file`,
  }));
};

export const getBook = async (
  id: number,
): Promise<{
  id: number;
  title: string;
  fileName: string | null;
  subject: string;
  level: string;
} | null> => {
  const { rows } = await vectorQuery<{
    id: number;
    title: string;
    file_name: string | null;
    subject: string;
    level: string;
  }>(`select id, title, file_name, subject, level from books where id = $1`, [
    id,
  ]);
  const row = rows[0];
  return row
    ? {
        id: row.id,
        title: row.title,
        fileName: row.file_name,
        subject: row.subject,
        level: row.level,
      }
    : null;
};

/** Attach every book of one subject at a level to a space (idempotent). */
export const attachTextbookSubject = async (
  spaceId: string,
  levelOrder: number,
  subject: string,
): Promise<number> => {
  const { rows } = await vectorQuery<{ id: number }>(
    `select id from books where level_order = $1 and subject = $2`,
    [levelOrder, subject],
  );
  if (!rows.length) return 0;
  const existing = await db
    .select({ refId: spaceSources.refId })
    .from(spaceSources)
    .where(
      and(eq(spaceSources.spaceId, spaceId), eq(spaceSources.kind, "textbook")),
    );
  const have = new Set(existing.map((row) => row.refId));
  const fresh = rows.filter((row) => !have.has(String(row.id)));
  if (!fresh.length) return 0;
  await db.insert(spaceSources).values(
    fresh.map((row) => ({
      id: `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      spaceId,
      kind: "textbook",
      refId: String(row.id),
    })),
  );
  return fresh.length;
};

/** The subject of a level that best matches a space name (plain variant first). */
export const matchSubject = async (
  levelOrder: number,
  name: string,
): Promise<string | null> => {
  const { rows } = await vectorQuery<{ subject: string }>(
    `select distinct subject from books where level_order = $1`,
    [levelOrder],
  );
  const wanted = normalizeSubject(name);
  if (!wanted) return null;
  let best: { subject: string; score: number } | null = null;
  for (const row of rows) {
    const plain = normalizeSubject(row.subject);
    if (!plain) continue;
    let score = 0;
    if (plain === wanted) {
      score = 3;
    } else if (wanted.includes(plain) || plain.includes(wanted)) {
      score = 2;
    } else {
      const a = new Set(plain.split(" "));
      const b = new Set(wanted.split(" "));
      const overlap = [...a].filter((token) => b.has(token)).length;
      if (overlap) score = 1 + overlap / Math.max(a.size, b.size);
    }
    // Prefer the plain/SK variant over (English)/(SJKC)/... editions.
    if (score > 0 && !row.subject.includes("(")) score += 0.5;
    if (score > 0 && (!best || score > best.score)) {
      best = { subject: row.subject, score };
    }
  }
  return best && best.score >= 1 ? best.subject : null;
};

/** Embed a query the same way the ingest did: 4096 dims -> first 2000, renormalised. */
export const embedQuery = async (text: string): Promise<number[] | null> => {
  const base = process.env.NEXTPLUS_ROUTER_URL;
  const key = process.env.NEXTPLUS_ROUTER_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/v1/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL ?? "qwen3-vl-embedding-8b",
        input: [text],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { embedding?: number[] }[] };
    const vector = data.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.length < 2000) return null;
    const sliced = vector.slice(0, 2000);
    const norm = Math.sqrt(sliced.reduce((sum, x) => sum + x * x, 0)) || 1;
    return sliced.map((x) => x / norm);
  } catch {
    return null;
  }
};

export type SpaceChunk = {
  content: string;
  chapter: string | null;
  page_start: number | null;
  page_end: number | null;
  title: string;
  subject: string;
  level: string;
};

/** The most relevant textbook passages for a query, from the space's books. */
export const searchSpaceChunks = async (
  spaceId: string,
  query: string,
  limit = 6,
): Promise<SpaceChunk[]> => {
  const rows = await db
    .select({ kind: spaceSources.kind, refId: spaceSources.refId })
    .from(spaceSources)
    .where(eq(spaceSources.spaceId, spaceId));
  const bookIds = rows
    .filter((row) => row.kind === "textbook")
    .map((row) => Number(row.refId))
    .filter((id) => Number.isFinite(id));
  if (!bookIds.length) return [];
  const vector = await embedQuery(query);
  if (!vector) return [];
  const result = await vectorQuery<SpaceChunk>(
    `select c.content, c.chapter, c.page_start, c.page_end, b.title, b.subject, b.level
     from chunks c join books b on b.id = c.book_id
     where c.book_id = any($1::bigint[])
     order by c.embedding_s <=> $2::vector
     limit $3`,
    [bookIds, `[${vector.join(",")}]`, limit],
  );
  return result.rows;
};

/** Reference preamble injected into a chat that runs inside a space. */
export const buildSpaceContext = async (
  spaceId: string,
  query: string,
): Promise<string | null> => {
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId));
  if (!space) return null;
  const chunks = await searchSpaceChunks(spaceId, query);
  if (!chunks.length) return null;
  const lines = [
    "[Sumber rujukan buku teks]",
    `The user is working in the space "${space.name}" (${space.level}). Use the following textbook passages as the primary reference for this request — base facts, examples and terminology on them, and mention the chapter/page when you use a passage. If the passages do not cover the request, say so briefly and answer from general knowledge.`,
    "",
  ];
  chunks.forEach((chunk, index) => {
    const where = [
      chunk.subject,
      chunk.chapter,
      chunk.page_start
        ? `ms ${chunk.page_start}${
            chunk.page_end && chunk.page_end !== chunk.page_start
              ? `-${chunk.page_end}`
              : ""
          }`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    lines.push(`${index + 1}. (${where}) ${chunk.content.slice(0, 1800)}`);
  });
  return lines.join("\n");
};

/** Metadata for the books attached to a space (used by the space UI). */
export const booksForSpace = async (
  spaceId: string,
): Promise<Map<number, { title: string; subject: string; level: string }>> => {
  const rows = await db
    .select({ refId: spaceSources.refId })
    .from(spaceSources)
    .where(
      and(eq(spaceSources.spaceId, spaceId), eq(spaceSources.kind, "textbook")),
    );
  const ids = rows
    .map((row) => Number(row.refId))
    .filter((id) => Number.isFinite(id));
  const meta = new Map<
    number,
    { title: string; subject: string; level: string }
  >();
  if (!ids.length) return meta;
  const { rows: books } = await vectorQuery<{
    id: number;
    title: string;
    subject: string;
    level: string;
  }>(
    `select id, title, subject, level from books where id = any($1::bigint[])`,
    [ids],
  );
  for (const book of books) {
    meta.set(Number(book.id), {
      title: book.title,
      subject: book.subject,
      level: book.level,
    });
  }
  return meta;
};

/** Uploads attached to a space, keyed by source id. */
export const uploadsForSpace = async (
  spaceId: string,
): Promise<Map<string, { title: string; ext: string }>> => {
  const rows = await db
    .select({ refId: spaceSources.refId })
    .from(spaceSources)
    .where(
      and(eq(spaceSources.spaceId, spaceId), eq(spaceSources.kind, "upload")),
    );
  const ids = rows.map((row) => row.refId);
  const meta = new Map<string, { title: string; ext: string }>();
  if (!ids.length) return meta;
  const uploads = await db
    .select({ id: sources.id, title: sources.title, ext: sources.ext })
    .from(sources)
    .where(inArray(sources.id, ids));
  for (const upload of uploads) {
    meta.set(upload.id, { title: upload.title, ext: upload.ext });
  }
  return meta;
};
