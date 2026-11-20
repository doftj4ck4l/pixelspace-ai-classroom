/**
 * Shared learning-map spec types + validation.
 *
 * Mirrors the harness validator (apply-flashcards-patch.mjs, mindmaps block).
 * Generation defaults to 8-30 nodes; the cap is 60 so maps can grow via AI
 * edits. Node ids are stable slugs — progress keys off them.
 */

export type MindMapChallenge = {
  type: "multiple-choice" | "true-false" | "fill-blank" | "open-ended";
  question: string;
  /** multiple-choice */
  options?: string[];
  answerIndex?: number;
  /** true-false */
  answer?: boolean;
  /** fill-blank ( `/` separates alternatives ) */
  accepted?: string;
  /** open-ended self-check */
  modelAnswer?: string;
  keywords?: string[];
  explanation?: string;
};

export type MindMapNode = {
  id: string;
  label: string;
  emoji?: string;
  parent?: string;
  summary?: string;
  details?: string;
  kind?: "concept" | "example" | "formula" | "question";
  source?: string;
  aiAdded?: boolean;
  challenges?: MindMapChallenge[];
};

export type MindMapEdge = { from: string; to: string; label?: string };

export type MindMapSpec = {
  title?: string;
  subject?: string;
  language?: string;
  accent?: string;
  nodes: MindMapNode[];
  edges?: MindMapEdge[];
};

export const MINDMAP_NODE_MAX = 60;
export const MINDMAP_ACCENTS = [
  "teal",
  "blue",
  "amber",
  "violet",
  "rose",
  "emerald",
] as const;

export type MindMapValidation =
  | { ok: true; spec: MindMapSpec }
  | { ok: false; error: string };

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const validateChallenge = (
  raw: unknown,
  at: string,
): { ok: true; challenge: MindMapChallenge } | { ok: false; error: string } => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: `${at} must be an object.` };
  }
  const c = raw as Record<string, unknown>;
  const type = str(c.type);
  const question = str(c.question);
  if (!question) return { ok: false, error: `${at} needs question text.` };
  if (question.length > 300) {
    return { ok: false, error: `${at} question exceeds 300 characters.` };
  }
  const explanation = str(c.explanation);
  if (explanation.length > 300) {
    return { ok: false, error: `${at} explanation exceeds 300 characters.` };
  }
  const base = { question, ...(explanation ? { explanation } : {}) };

  if (type === "multiple-choice") {
    const options = Array.isArray(c.options)
      ? c.options.map((o) => str(o)).filter(Boolean)
      : [];
    if (options.length < 2 || options.length > 6) {
      return { ok: false, error: `${at} needs 2-6 options.` };
    }
    if (options.some((o) => o.length > 120)) {
      return {
        ok: false,
        error: `${at} options must be 120 characters or fewer.`,
      };
    }
    const answerIndex = c.answerIndex;
    if (
      typeof answerIndex !== "number" ||
      !Number.isInteger(answerIndex) ||
      answerIndex < 0 ||
      answerIndex >= options.length
    ) {
      return {
        ok: false,
        error: `${at} answerIndex must point at one of its options.`,
      };
    }
    return {
      ok: true,
      challenge: { ...base, type: "multiple-choice", options, answerIndex },
    };
  }
  if (type === "true-false") {
    if (typeof c.answer !== "boolean") {
      return { ok: false, error: `${at} answer must be true or false.` };
    }
    return {
      ok: true,
      challenge: { ...base, type: "true-false", answer: c.answer },
    };
  }
  if (type === "fill-blank") {
    const accepted = str(c.accepted) || str(c.answer);
    if (!accepted)
      return { ok: false, error: `${at} needs an accepted answer.` };
    if (accepted.length > 120) {
      return { ok: false, error: `${at} answer exceeds 120 characters.` };
    }
    return { ok: true, challenge: { ...base, type: "fill-blank", accepted } };
  }
  if (type === "open-ended") {
    const modelAnswer = str(c.modelAnswer);
    if (!modelAnswer) return { ok: false, error: `${at} needs a modelAnswer.` };
    if (modelAnswer.length > 600) {
      return { ok: false, error: `${at} modelAnswer exceeds 600 characters.` };
    }
    const keywords = Array.isArray(c.keywords)
      ? c.keywords.map((k) => str(k)).filter(Boolean)
      : [];
    if (keywords.length > 5) {
      return { ok: false, error: `${at} supports up to 5 keywords.` };
    }
    return {
      ok: true,
      challenge: {
        ...base,
        type: "open-ended",
        modelAnswer,
        ...(keywords.length ? { keywords } : {}),
      },
    };
  }
  return {
    ok: false,
    error: `${at} type must be one of: multiple-choice, true-false, fill-blank, open-ended`,
  };
};

/** Validates a generated or AI-edited learning map (1-60 nodes). */
export const validateMindMapSpec = (input: unknown): MindMapValidation => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Spec must be an object." };
  }
  const raw = input as Record<string, unknown>;
  const nodesRaw = Array.isArray(raw.nodes) ? raw.nodes : [];
  if (nodesRaw.length === 0) {
    return { ok: false, error: "A learning map needs at least one node." };
  }
  if (nodesRaw.length > MINDMAP_NODE_MAX) {
    return {
      ok: false,
      error: `A learning map supports at most ${MINDMAP_NODE_MAX} nodes.`,
    };
  }

  const accent = str(raw.accent);
  if (accent && !(MINDMAP_ACCENTS as readonly string[]).includes(accent)) {
    return {
      ok: false,
      error: `accent must be one of: ${MINDMAP_ACCENTS.join(", ")}`,
    };
  }

  const nodes: MindMapNode[] = [];
  const ids = new Set<string>();
  for (const [index, entry] of nodesRaw.entries()) {
    const at = `Node ${index + 1}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: `${at} must be an object.` };
    }
    const n = entry as Record<string, unknown>;
    const id = str(n.id);
    const label = str(n.label);
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
    if (!label) return { ok: false, error: `${at} needs a label.` };
    if (label.length > 60)
      return { ok: false, error: `${at} label exceeds 60 characters.` };
    const emoji = str(n.emoji);
    const parent = str(n.parent);
    const summary = str(n.summary);
    if (summary.length > 300) {
      return { ok: false, error: `${at} summary exceeds 300 characters.` };
    }
    const details = str(n.details);
    if (details.length > 1200) {
      return { ok: false, error: `${at} details exceeds 1200 characters.` };
    }
    const kind = str(n.kind);
    if (kind && !["concept", "example", "formula", "question"].includes(kind)) {
      return {
        ok: false,
        error: `${at} kind must be concept, example, formula or question.`,
      };
    }
    const source = str(n.source);
    if (source.length > 120) {
      return { ok: false, error: `${at} source exceeds 120 characters.` };
    }
    const challengesRaw = Array.isArray(n.challenges) ? n.challenges : [];
    if (challengesRaw.length > 2) {
      return { ok: false, error: `${at} supports at most 2 challenges.` };
    }
    const challenges: MindMapChallenge[] = [];
    for (const [ci, challenge] of challengesRaw.entries()) {
      const result = validateChallenge(challenge, `${at} challenge ${ci + 1}`);
      if (!result.ok) return result;
      challenges.push(result.challenge);
    }
    nodes.push({
      id,
      label,
      ...(emoji ? { emoji } : {}),
      ...(parent ? { parent } : {}),
      ...(summary ? { summary } : {}),
      ...(details ? { details } : {}),
      ...(kind ? { kind: kind as MindMapNode["kind"] } : {}),
      ...(source ? { source } : {}),
      ...(n.aiAdded === true ? { aiAdded: true } : {}),
      ...(challenges.length ? { challenges } : {}),
    });
  }

  // Parents must exist (root nodes have none).
  for (const node of nodes) {
    if (node.parent && !ids.has(node.parent)) {
      return {
        ok: false,
        error: `Node "${node.id}" has an unknown parent "${node.parent}".`,
      };
    }
  }

  const edgesRaw = Array.isArray(raw.edges) ? raw.edges : [];
  if (edgesRaw.length > 80) {
    return {
      ok: false,
      error: "A learning map supports at most 80 cross-links.",
    };
  }
  const edges: MindMapEdge[] = [];
  for (const entry of edgesRaw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    const from = str(e.from);
    const to = str(e.to);
    if (!ids.has(from) || !ids.has(to) || from === to) continue;
    const label = str(e.label);
    edges.push({ from, to, ...(label ? { label } : {}) });
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
      nodes,
      ...(edges.length ? { edges } : {}),
    },
  };
};
