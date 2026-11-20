#!/usr/bin/env node
/**
 * Patches the pi harness (pixelspacev3) with the `render_ui` flashcards and
 * quizzes components, so the agent can design study decks and interactive
 * quizzes as first-class tool calls.
 *
 * The offline bundle ships no api source, but the api image runs the
 * TypeScript directly — so this script extracts the three model-facing files
 * from the base image, patches them, and builds a derived image:
 *
 *   FROM pixelspace-api:<base>   + the three patched files
 *   -> pixelspace-api:genui-patch
 *
 * then points PIXELSPACE_API_IMAGE at it and recreates the api container.
 * Idempotent — safe to re-run (e.g. after a harness upgrade, to re-apply the
 * patch on the new base image).
 *
 * Run on the harness host:
 *   node apply-flashcards-patch.mjs [harness-root]
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const root = process.argv[2] ?? path.join(homedir(), "pixelspace-0.11.2");
const BASE_IMAGE = process.env.PIXELSPACE_BASE_IMAGE ?? "pixelspace-api:0.11.2";
const PATCHED_IMAGE = "pixelspace-api:genui-patch";
const WORK = path.join(homedir(), "pixelspace-harness-patch");

const sh = (cmd) => execSync(cmd, { stdio: "pipe" }).toString().trim();

// ---------------------------------------------------------------------------
// 1. Extract the three files from the clean base image
// ---------------------------------------------------------------------------
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

const FILES = [
  ["src/services/agent/ui-catalog.ts", "ui-catalog.ts"],
  ["src/catalog/tools.ts", "tools.ts"],
  ["src/services/agent/gen-ui-prompt.ts", "gen-ui-prompt.ts"],
];

const tmp = `patch-extract-${Date.now()}`;
sh(`docker create --name ${tmp} ${BASE_IMAGE}`);
try {
  for (const [inImage, local] of FILES) {
    sh(`docker cp ${tmp}:/app/apps/api/${inImage} ${path.join(WORK, local)}`);
  }
} finally {
  sh(`docker rm ${tmp}`);
}
console.log("extracted from", BASE_IMAGE);

// ---------------------------------------------------------------------------
// 2. Patch the copies
// ---------------------------------------------------------------------------
const read = (file) => readFileSync(path.join(WORK, file), "utf8");
const write = (file, content) => writeFileSync(path.join(WORK, file), content);

const VALIDATOR = `const FLASHCARD_TYPES = ['term', 'question', 'cloze', 'formula'] as const
const FLASHCARD_ACCENTS = ['teal', 'blue', 'amber', 'violet', 'rose', 'emerald'] as const

/** A study deck: 6-40 cards of { front, back } with optional design hints. */
function validateFlashcards(p: Record<string, unknown>): UiValidation {
  const errors: string[] = []
  if (p.title !== undefined && typeof p.title !== 'string') {
    errors.push('flashcards.title must be a string')
  }
  if (p.subject !== undefined && typeof p.subject !== 'string') {
    errors.push('flashcards.subject must be a string')
  }
  if (p.accent !== undefined && (typeof p.accent !== 'string' || !FLASHCARD_ACCENTS.includes(p.accent as never))) {
    errors.push(\`flashcards.accent must be one of: \${FLASHCARD_ACCENTS.join(', ')}\`)
  }
  const cards = p.cards
  if (!Array.isArray(cards) || cards.length === 0) {
    errors.push('flashcards.cards must be a non-empty array of { front, back } objects')
    return done(errors)
  }
  if (cards.length > 40) errors.push('flashcards.cards supports at most 40 cards')
  cards.slice(0, 40).forEach((card, i) => {
    if (!isRecord(card)) {
      errors.push(\`flashcards.cards[\${i}] must be an object\`)
      return
    }
    if (typeof card.front !== 'string' || !card.front.trim()) {
      errors.push(\`flashcards.cards[\${i}].front is required\`)
    } else if (card.front.length > 140) {
      errors.push(\`flashcards.cards[\${i}].front must be 140 characters or fewer\`)
    }
    if (typeof card.back !== 'string' || !card.back.trim()) {
      errors.push(\`flashcards.cards[\${i}].back is required\`)
    } else if (card.back.length > 400) {
      errors.push(\`flashcards.cards[\${i}].back must be 400 characters or fewer\`)
    }
    if (card.hint !== undefined && (typeof card.hint !== 'string' || card.hint.length > 200)) {
      errors.push(\`flashcards.cards[\${i}].hint must be a string of 200 characters or fewer\`)
    }
    if (card.type !== undefined && (typeof card.type !== 'string' || !FLASHCARD_TYPES.includes(card.type as never))) {
      errors.push(\`flashcards.cards[\${i}].type must be one of: \${FLASHCARD_TYPES.join(', ')}\`)
    }
    if (
      card.tags !== undefined &&
      (!Array.isArray(card.tags) ||
        card.tags.length > 3 ||
        card.tags.some((t) => typeof t !== 'string' || t.length > 24))
    ) {
      errors.push(\`flashcards.cards[\${i}].tags must be up to 3 short strings\`)
    }
  })
  return done(errors)
}

`;

const QUIZ_VALIDATOR = `const QUIZ_TYPES = ['multiple-choice', 'open-ended', 'true-false', 'fill-blank'] as const
const QUIZ_ACCENTS = ['teal', 'blue', 'amber', 'violet', 'rose', 'emerald'] as const

/** A quiz: 1-60 questions of four types. Generation defaults to 4-20. */
function validateQuizzes(p: Record<string, unknown>): UiValidation {
  const errors: string[] = []
  if (p.title !== undefined && typeof p.title !== 'string') {
    errors.push('quizzes.title must be a string')
  }
  if (p.subject !== undefined && typeof p.subject !== 'string') {
    errors.push('quizzes.subject must be a string')
  }
  if (p.accent !== undefined && (typeof p.accent !== 'string' || !QUIZ_ACCENTS.includes(p.accent as never))) {
    errors.push(\`quizzes.accent must be one of: \${QUIZ_ACCENTS.join(', ')}\`)
  }
  const questions = p.questions
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push('quizzes.questions must be a non-empty array')
    return done(errors)
  }
  if (questions.length > 60) errors.push('quizzes.questions supports at most 60 questions')
  questions.slice(0, 60).forEach((q, i) => {
    if (!isRecord(q)) {
      errors.push(\`quizzes.questions[\${i}] must be an object\`)
      return
    }
    if (typeof q.question !== 'string' || !q.question.trim()) {
      errors.push(\`quizzes.questions[\${i}].question is required\`)
    } else if (q.question.length > 300) {
      errors.push(\`quizzes.questions[\${i}].question must be 300 characters or fewer\`)
    }
    if (typeof q.type !== 'string' || !QUIZ_TYPES.includes(q.type as never)) {
      errors.push(\`quizzes.questions[\${i}].type must be one of: \${QUIZ_TYPES.join(', ')}\`)
      return
    }
    if (q.explanation !== undefined && (typeof q.explanation !== 'string' || q.explanation.length > 300)) {
      errors.push(\`quizzes.questions[\${i}].explanation must be a string of 300 characters or fewer\`)
    }
    if (
      q.tags !== undefined &&
      (!Array.isArray(q.tags) ||
        q.tags.length > 3 ||
        q.tags.some((t) => typeof t !== 'string' || t.length > 24))
    ) {
      errors.push(\`quizzes.questions[\${i}].tags must be up to 3 short strings\`)
    }
    if (q.type === 'multiple-choice') {
      const options = q.options
      if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
        errors.push(\`quizzes.questions[\${i}].options must be 2-6 strings\`)
      } else if (options.some((o) => typeof o !== 'string' || !o.trim() || o.length > 120)) {
        errors.push(\`quizzes.questions[\${i}].options must be non-empty strings of 120 characters or fewer\`)
      } else if (
        typeof q.answerIndex !== 'number' ||
        !Number.isInteger(q.answerIndex) ||
        q.answerIndex < 0 ||
        q.answerIndex >= options.length
      ) {
        errors.push(\`quizzes.questions[\${i}].answerIndex must point at one of its options\`)
      }
    } else if (q.type === 'open-ended') {
      if (typeof q.modelAnswer !== 'string' || !q.modelAnswer.trim()) {
        errors.push(\`quizzes.questions[\${i}].modelAnswer is required\`)
      } else if (q.modelAnswer.length > 600) {
        errors.push(\`quizzes.questions[\${i}].modelAnswer must be 600 characters or fewer\`)
      }
      if (
        q.keywords !== undefined &&
        (!Array.isArray(q.keywords) ||
          q.keywords.length > 5 ||
          q.keywords.some((k) => typeof k !== 'string' || !k.trim() || k.length > 40))
      ) {
        errors.push(\`quizzes.questions[\${i}].keywords must be up to 5 short strings\`)
      }
    } else if (q.type === 'true-false') {
      if (typeof q.answer !== 'boolean') {
        errors.push(\`quizzes.questions[\${i}].answer must be true or false\`)
      }
    } else if (q.type === 'fill-blank') {
      if (typeof q.answer !== 'string' || !q.answer.trim()) {
        errors.push(\`quizzes.questions[\${i}].answer is required\`)
      } else if (q.answer.length > 120) {
        errors.push(\`quizzes.questions[\${i}].answer must be 120 characters or fewer\`)
      }
    }
  })
  return done(errors)
}

`;

const MINDMAP_VALIDATOR = `const MINDMAP_ACCENTS = ['teal', 'blue', 'amber', 'violet', 'rose', 'emerald'] as const

/** An interactive learning map: 8-30 nodes (cap 60) with challenges. */
function validateMindmaps(p: Record<string, unknown>): UiValidation {
  const errors: string[] = []
  if (p.title !== undefined && typeof p.title !== 'string') {
    errors.push('mindmaps.title must be a string')
  }
  if (p.subject !== undefined && typeof p.subject !== 'string') {
    errors.push('mindmaps.subject must be a string')
  }
  if (p.accent !== undefined && (typeof p.accent !== 'string' || !MINDMAP_ACCENTS.includes(p.accent as never))) {
    errors.push(\`mindmaps.accent must be one of: \${MINDMAP_ACCENTS.join(', ')}\`)
  }
  const nodes = p.nodes
  if (!Array.isArray(nodes) || nodes.length === 0) {
    errors.push('mindmaps.nodes must be a non-empty array')
    return done(errors)
  }
  if (nodes.length > 60) errors.push('mindmaps.nodes supports at most 60 nodes')
  const ids = new Set<string>()
  nodes.slice(0, 60).forEach((n, i) => {
    if (!isRecord(n)) {
      errors.push(\`mindmaps.nodes[\${i}] must be an object\`)
      return
    }
    if (typeof n.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(n.id)) {
      errors.push(\`mindmaps.nodes[\${i}].id must be a short slug (a-z, 0-9, dashes)\`)
    } else if (ids.has(n.id)) {
      errors.push(\`mindmaps.nodes[\${i}].id "\${n.id}" is duplicated\`)
    } else {
      ids.add(n.id)
    }
    if (typeof n.label !== 'string' || !n.label.trim()) {
      errors.push(\`mindmaps.nodes[\${i}].label is required\`)
    } else if (n.label.length > 60) {
      errors.push(\`mindmaps.nodes[\${i}].label must be 60 characters or fewer\`)
    }
    if (n.emoji !== undefined && typeof n.emoji !== 'string') {
      errors.push(\`mindmaps.nodes[\${i}].emoji must be a string\`)
    }
    if (n.parent !== undefined && typeof n.parent !== 'string') {
      errors.push(\`mindmaps.nodes[\${i}].parent must be a node id string\`)
    }
    if (n.summary !== undefined && (typeof n.summary !== 'string' || n.summary.length > 300)) {
      errors.push(\`mindmaps.nodes[\${i}].summary must be 300 characters or fewer\`)
    }
    if (n.details !== undefined && (typeof n.details !== 'string' || n.details.length > 1200)) {
      errors.push(\`mindmaps.nodes[\${i}].details must be 1200 characters or fewer\`)
    }
    if (n.kind !== undefined && (typeof n.kind !== 'string' || !['concept', 'example', 'formula', 'question'].includes(n.kind))) {
      errors.push(\`mindmaps.nodes[\${i}].kind must be concept, example, formula or question\`)
    }
    if (n.source !== undefined && (typeof n.source !== 'string' || n.source.length > 120)) {
      errors.push(\`mindmaps.nodes[\${i}].source must be a string of 120 characters or fewer\`)
    }
    if (n.aiAdded !== undefined && typeof n.aiAdded !== 'boolean') {
      errors.push(\`mindmaps.nodes[\${i}].aiAdded must be a boolean\`)
    }
    if (n.challenges !== undefined) {
      if (!Array.isArray(n.challenges) || n.challenges.length > 2) {
        errors.push(\`mindmaps.nodes[\${i}].challenges must be up to 2 challenges\`)
      } else {
        n.challenges.forEach((c: unknown, ci: number) => {
          if (!isRecord(c)) {
            errors.push(\`mindmaps.nodes[\${i}].challenges[\${ci}] must be an object\`)
            return
          }
          if (typeof c.question !== 'string' || !c.question.trim()) {
            errors.push(\`mindmaps.nodes[\${i}].challenges[\${ci}].question is required\`)
          }
          if (typeof c.type !== 'string' || !['multiple-choice', 'true-false', 'fill-blank', 'open-ended'].includes(c.type)) {
            errors.push(\`mindmaps.nodes[\${i}].challenges[\${ci}].type must be one of: multiple-choice, true-false, fill-blank, open-ended\`)
            return
          }
          if (c.type === 'multiple-choice') {
            const options = c.options
            if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
              errors.push(\`mindmaps.nodes[\${i}].challenges[\${ci}].options must be 2-6 strings\`)
            } else if (
              typeof c.answerIndex !== 'number' ||
              !Number.isInteger(c.answerIndex) ||
              c.answerIndex < 0 ||
              c.answerIndex >= options.length
            ) {
              errors.push(\`mindmaps.nodes[\${i}].challenges[\${ci}].answerIndex must point at one of its options\`)
            }
          } else if (c.type === 'true-false') {
            if (typeof c.answer !== 'boolean') {
              errors.push(\`mindmaps.nodes[\${i}].challenges[\${ci}].answer must be true or false\`)
            }
          } else if (c.type === 'fill-blank') {
            if (typeof c.accepted !== 'string' || !c.accepted.trim()) {
              errors.push(\`mindmaps.nodes[\${i}].challenges[\${ci}].accepted is required\`)
            }
          } else if (typeof c.modelAnswer !== 'string' || !c.modelAnswer.trim()) {
            errors.push(\`mindmaps.nodes[\${i}].challenges[\${ci}].modelAnswer is required\`)
          }
        })
      }
    }
  })
  nodes.slice(0, 60).forEach((n, i) => {
    if (isRecord(n) && typeof n.parent === 'string' && n.parent && !ids.has(n.parent)) {
      errors.push(\`mindmaps.nodes[\${i}].parent "\${n.parent}" does not match any node id\`)
    }
  })
  const edges = p.edges
  if (edges !== undefined) {
    if (!Array.isArray(edges) || edges.length > 80) {
      errors.push('mindmaps.edges must be up to 80 { from, to, label? } objects')
    } else {
      edges.forEach((e: unknown, i: number) => {
        if (!isRecord(e) || typeof e.from !== 'string' || typeof e.to !== 'string') {
          errors.push(\`mindmaps.edges[\${i}] must have from and to node ids\`)
        } else if (!ids.has(e.from) || !ids.has(e.to)) {
          errors.push(\`mindmaps.edges[\${i}] references an unknown node\`)
        }
      })
    }
  }
  return done(errors)
}

`;

{
  let s = read("ui-catalog.ts");
  if (!s.includes("validateFlashcards")) {
    const caseAnchor = "    case 'card':\n      return validateCard(props)";
    if (!s.includes(caseAnchor))
      throw new Error("ui-catalog: card case anchor missing");
    s = s.replace(
      caseAnchor,
      `${caseAnchor}\n    case 'flashcards':\n      return validateFlashcards(props)`,
    );

    const listAnchor = "use one of: chart, table, stat, card`)";
    if (!s.includes(listAnchor))
      throw new Error("ui-catalog: component list anchor missing");
    s = s.replace(
      listAnchor,
      "use one of: chart, table, stat, card, flashcards`)",
    );

    const fnAnchor = "// A colour is written into an SVG `fill`";
    if (!s.includes(fnAnchor))
      throw new Error("ui-catalog: function anchor missing");
    s = s.replace(fnAnchor, `${VALIDATOR}${fnAnchor}`);

    write("ui-catalog.ts", s);
    console.log("patched: ui-catalog.ts (flashcards)");
  } else {
    console.log("already patched: ui-catalog.ts (flashcards)");
  }

  s = read("ui-catalog.ts");
  if (!s.includes("validateQuizzes")) {
    const caseAnchor =
      "    case 'flashcards':\n      return validateFlashcards(props)";
    if (!s.includes(caseAnchor))
      throw new Error("ui-catalog: flashcards case anchor missing");
    s = s.replace(
      caseAnchor,
      `${caseAnchor}\n    case 'quizzes':\n      return validateQuizzes(props)`,
    );

    const listAnchor = "use one of: chart, table, stat, card, flashcards`)";
    if (!s.includes(listAnchor))
      throw new Error("ui-catalog: component list anchor missing (quizzes)");
    s = s.replace(
      listAnchor,
      "use one of: chart, table, stat, card, flashcards, quizzes`)",
    );

    const fnAnchor = "// A colour is written into an SVG `fill`";
    if (!s.includes(fnAnchor))
      throw new Error("ui-catalog: function anchor missing (quizzes)");
    s = s.replace(fnAnchor, `${QUIZ_VALIDATOR}${fnAnchor}`);

    write("ui-catalog.ts", s);
    console.log("patched: ui-catalog.ts (quizzes)");
  } else {
    console.log("already patched: ui-catalog.ts (quizzes)");
  }

  s = read("ui-catalog.ts");
  if (!s.includes("validateMindmaps")) {
    const caseAnchor =
      "    case 'quizzes':\n      return validateQuizzes(props)";
    if (!s.includes(caseAnchor))
      throw new Error("ui-catalog: quizzes case anchor missing");
    s = s.replace(
      caseAnchor,
      `${caseAnchor}\n    case 'mindmaps':\n      return validateMindmaps(props)`,
    );

    const listAnchor =
      "use one of: chart, table, stat, card, flashcards, quizzes`)";
    if (!s.includes(listAnchor))
      throw new Error("ui-catalog: component list anchor missing (mindmaps)");
    s = s.replace(
      listAnchor,
      "use one of: chart, table, stat, card, flashcards, quizzes, mindmaps`)",
    );

    const fnAnchor = "// A colour is written into an SVG `fill`";
    if (!s.includes(fnAnchor))
      throw new Error("ui-catalog: function anchor missing (mindmaps)");
    s = s.replace(fnAnchor, `${MINDMAP_VALIDATOR}${fnAnchor}`);

    write("ui-catalog.ts", s);
    console.log("patched: ui-catalog.ts (mindmaps)");
  } else {
    console.log("already patched: ui-catalog.ts (mindmaps)");
  }
}

{
  let s = read("tools.ts");
  if (!s.includes("flashcards:")) {
    const introAnchor =
      '"Render a rich UI component inline in your answer to the user: a chart, a sortable table, a KPI stat tile, or a titled card. " +';
    if (!s.includes(introAnchor))
      throw new Error("tools.ts: intro anchor missing");
    s = s.replace(
      introAnchor,
      '"Render a rich UI component inline in your answer to the user: a chart, a sortable table, a KPI stat tile, a titled card, a study flashcard deck, an interactive quiz, or an interactive learning map. " +',
    );

    const cardAnchor =
      "\"- card: title?, body? (markdown), fields? (array of { label, value }), accent? ('default'|'primary'|'success'|'warning'|'destructive')\",";
    if (!s.includes(cardAnchor))
      throw new Error("tools.ts: card line anchor missing");
    s = s.replace(
      cardAnchor,
      `"- card: title?, body? (markdown), fields? (array of { label, value }), accent? ('default'|'primary'|'success'|'warning'|'destructive') \\n" +\n      "- flashcards: title?, subject?, language?, accent? ('teal'|'blue'|'amber'|'violet'|'rose'|'emerald'), cards (6 to 40 of { front, back, hint?, tags? (up to 3), type? ('term'|'question'|'cloze'|'formula') }) — a study deck for memorisation \\n" +\n      "- quizzes: title?, subject?, language?, accent? ('teal'|'blue'|'amber'|'violet'|'rose'|'emerald'), questions (4 to 20 of { question, type: 'multiple-choice' (options 2-6 + answerIndex) | 'open-ended' (modelAnswer, keywords? up to 5) | 'true-false' (answer: boolean) | 'fill-blank' (answer; '/' separates accepted alternatives), explanation?, tags? (up to 3) }) — an interactive quiz that mixes objective and open-ended questions \\n" +\n      "- mindmaps: title?, subject?, language?, accent? ('teal'|'blue'|'amber'|'violet'|'rose'|'emerald'), nodes (8 to 30 of { id (stable slug), label, emoji?, parent? (tree edge), summary? (<=300 chars), details? (<=1200 chars), kind? ('concept'|'example'|'formula'|'question'), source? (grounding ref), aiAdded?, challenges? (up to 2 of the quiz question shapes) }), edges? (up to 80 cross-links { from, to, label? }) — an interactive learning map grounded in the user's sources",`,
    );

    write("tools.ts", s);
    console.log("patched: tools.ts");
  } else {
    console.log("already patched: tools.ts");
  }
}

{
  let s = read("gen-ui-prompt.ts");
  if (!s.includes("kad imbas")) {
    const anchor =
      "You may call it several times in one answer for several components.";
    if (!s.includes(anchor)) throw new Error("gen-ui-prompt: anchor missing");
    s = s.replace(
      anchor,
      `${anchor}
A study deck is a flashcards block: when the user asks for flashcards, kad imbas, or study cards, research the topic first and build one with enough cards to cover it — never answer a flashcard request with a plain list.
A quiz is a quizzes block: when the user asks for a quiz, kuiz, soalan latihan, or practice questions, research the topic first and build one with render_ui quizzes. Mix question types (multiple-choice, true-false, fill-blank, open-ended) unless the user asks for one type. When editing an existing quiz, convert question types on request (e.g. "change q1 to open-ended") — never answer a quiz request with a plain list.
A learning map is a mindmaps block: when the user asks for a mind map, peta minda, peta pembelajaran, or learning map, research the topic first and build one with render_ui mindmaps. Ground every node in the user's source material when files are attached, add a source reference per node (e.g. "Bab 5 · ms 42"), and mark nodes that go beyond the sources with aiAdded: true. Give most nodes a summary, add challenges (up to 2) to key concept nodes, and use cross-link edges for relationships that are not parent/child. When editing an existing map, keep the ids of unchanged nodes EXACTLY the same. Never answer a mind-map request with a plain list.`,
    );
    write("gen-ui-prompt.ts", s);
    console.log("patched: gen-ui-prompt.ts");
  } else {
    console.log("already patched: gen-ui-prompt.ts");
  }
}

// ---------------------------------------------------------------------------
// 3. Build the derived image
// ---------------------------------------------------------------------------
writeFileSync(
  path.join(WORK, "Dockerfile"),
  `FROM ${BASE_IMAGE}
COPY ui-catalog.ts /app/apps/api/src/services/agent/ui-catalog.ts
COPY tools.ts /app/apps/api/src/catalog/tools.ts
COPY gen-ui-prompt.ts /app/apps/api/src/services/agent/gen-ui-prompt.ts
`,
);
sh(`docker build -q -t ${PATCHED_IMAGE} ${WORK}`);
console.log("built", PATCHED_IMAGE);

// ---------------------------------------------------------------------------
// 4. Point compose at the patched image and recreate the api
// ---------------------------------------------------------------------------
const envFile = path.join(root, ".env");
if (!existsSync(envFile)) throw new Error(`missing ${envFile}`);
let env = readFileSync(envFile, "utf8");
if (/^PIXELSPACE_API_IMAGE=/m.test(env)) {
  env = env.replace(
    /^PIXELSPACE_API_IMAGE=.*$/m,
    `PIXELSPACE_API_IMAGE="${PATCHED_IMAGE}"`,
  );
} else {
  env += `\nPIXELSPACE_API_IMAGE="${PATCHED_IMAGE}"\n`;
}
writeFileSync(envFile, env);
console.log("compose now uses", PATCHED_IMAGE);

sh(`cd ${root} && docker compose up -d api`);
console.log("api container recreated");
