#!/usr/bin/env node
/**
 * Patches the pi harness (pixelspacev3) with the `render_ui` flashcards
 * component, so the agent can design study decks as a first-class tool call.
 *
 * The offline bundle ships no api source, but the api image runs the
 * TypeScript directly — so this script extracts the three model-facing files
 * from the base image, patches them, and builds a derived image:
 *
 *   FROM pixelspace-api:<base>   + the three patched files
 *   -> pixelspace-api:flashcards-patch
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
const PATCHED_IMAGE = "pixelspace-api:flashcards-patch";
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

{
  let s = read("ui-catalog.ts");
  if (!s.includes("validateFlashcards")) {
    const caseAnchor = "    case 'card':\n      return validateCard(props)";
    if (!s.includes(caseAnchor)) throw new Error("ui-catalog: card case anchor missing");
    s = s.replace(
      caseAnchor,
      `${caseAnchor}\n    case 'flashcards':\n      return validateFlashcards(props)`,
    );

    const listAnchor = "use one of: chart, table, stat, card`)";
    if (!s.includes(listAnchor)) throw new Error("ui-catalog: component list anchor missing");
    s = s.replace(listAnchor, "use one of: chart, table, stat, card, flashcards`)");

    const fnAnchor = "// A colour is written into an SVG `fill`";
    if (!s.includes(fnAnchor)) throw new Error("ui-catalog: function anchor missing");
    s = s.replace(fnAnchor, `${VALIDATOR}${fnAnchor}`);

    write("ui-catalog.ts", s);
    console.log("patched: ui-catalog.ts");
  } else {
    console.log("already patched: ui-catalog.ts");
  }
}

{
  let s = read("tools.ts");
  if (!s.includes("flashcards:")) {
    const introAnchor =
      '"Render a rich UI component inline in your answer to the user: a chart, a sortable table, a KPI stat tile, or a titled card. " +';
    if (!s.includes(introAnchor)) throw new Error("tools.ts: intro anchor missing");
    s = s.replace(
      introAnchor,
      '"Render a rich UI component inline in your answer to the user: a chart, a sortable table, a KPI stat tile, a titled card, or a study flashcard deck. " +',
    );

    const cardAnchor =
      "\"- card: title?, body? (markdown), fields? (array of { label, value }), accent? ('default'|'primary'|'success'|'warning'|'destructive')\",";
    if (!s.includes(cardAnchor)) throw new Error("tools.ts: card line anchor missing");
    s = s.replace(
      cardAnchor,
      `"- card: title?, body? (markdown), fields? (array of { label, value }), accent? ('default'|'primary'|'success'|'warning'|'destructive') \\n" +\n      "- flashcards: title?, subject?, language?, accent? ('teal'|'blue'|'amber'|'violet'|'rose'|'emerald'), cards (6 to 40 of { front, back, hint?, tags? (up to 3), type? ('term'|'question'|'cloze'|'formula') }) — a study deck for memorisation",`,
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
    const anchor = "You may call it several times in one answer for several components.";
    if (!s.includes(anchor)) throw new Error("gen-ui-prompt: anchor missing");
    s = s.replace(
      anchor,
      `${anchor}
A study deck is a flashcards block: when the user asks for flashcards, kad imbas, or study cards, research the topic first and build one with enough cards to cover it — never answer a flashcard request with a plain list.`,
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
