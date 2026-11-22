import { createOpenAI } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";
import {
  type JSONSchema7,
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { and, eq } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { spaceMembers, spaces } from "@/lib/db/schema";
import { artifactRegistry, type PiArtifact } from "@/lib/pi/artifacts";
import { piConfigured, piFetch } from "@/lib/pi/client";
import { registry } from "@/lib/pi/registry";
import { threadRuns } from "@/lib/pi/runs";
import { remapDeckProgress } from "@/lib/flashcards/progress";
import { validateDeckSpec, type FlashcardSpec } from "@/lib/flashcards/spec";
import { remapQuizProgress } from "@/lib/quizzes/progress";
import { validateQuizSpec, type QuizSpec } from "@/lib/quizzes/spec";
import { remapMindMapProgress } from "@/lib/mindmaps/remap";
import { validateMindMapSpec, type MindMapSpec } from "@/lib/mindmaps/spec";
import { remapNotesProgress } from "@/lib/notes/progress";
import { buildSpaceContext } from "@/lib/textbooks/library";
import { validateNotesSpec, type NotesSpec } from "@/lib/notes/spec";

export const maxDuration = 300;

const gateway = createOpenAI({
  baseURL: `${(process.env.AI_CHAT_BASE_URL ?? "https://model.arasintegrasi.ai").replace(/\/+$/, "")}/v1`,
  apiKey: process.env.AI_CHAT_API_KEY,
});

type ChatBody = {
  messages: UIMessage[];
  system?: string;
  tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  /** The chat transport sends the initialized thread's remoteId as `id`. */
  id?: string;
  /** Kept for compatibility with callers that pass the thread explicitly. */
  threadId?: string;
  /** When set, this turn edits that deck/quiz/map artifact instead of creating one. */
  artifactEditTargetId?: string;
  /** The card/question the user is looking at, for targeted edits. */
  focusedIndex?: number;
  /** When set, this turn answers a question about a node of that map (no edit). */
  artifactAskTargetId?: string;
  artifactAskNodeId?: string;
  /** When set, this turn runs inside a space (grounded in its sources). */
  spaceId?: string;
};

const messageText = (message: UIMessage) =>
  message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();

/**
 * The new user turn is the text of the last message, and only when the last
 * message IS a user message. A request whose last message is an assistant or
 * tool continuation has no new turn to run — running it anyway makes the
 * agent answer an empty message and loop.
 */
const newUserText = (messages: UIMessage[]) => {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return null;
  return messageText(last);
};

/** pi records the transcript but does not replay it — send the full history each turn. */
const toPiMessages = (messages: UIMessage[]) =>
  messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .map((message) => ({
      role: message.role,
      content: message.parts
        .filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join("\n")
        .trim(),
    }))
    .filter((message) => message.content.length > 0);

type PiEvent = { type?: string; [key: string]: unknown };

/**
 * Register a generative-UI deck or quiz the agent designed (render_ui) as a
 * Spaces artifact. The spec rides in the tool call's arguments; the result only
 * confirms the harness validated it.
 */
const captureRenderUiSpec = async (
  userId: string,
  threadId: string,
  runKey: string,
  args: Record<string, unknown> | undefined,
) => {
  const component = args?.component;
  if (
    component !== "flashcards" &&
    component !== "quizzes" &&
    component !== "mindmaps" &&
    component !== "notes"
  ) {
    return;
  }
  let props = args?.props;
  if (typeof props === "string") {
    try {
      props = JSON.parse(props);
    } catch {
      return;
    }
  }
  if (!props || typeof props !== "object" || Array.isArray(props)) return;
  const spec = props as {
    title?: unknown;
    cards?: unknown;
    questions?: unknown;
    nodes?: unknown;
    sections?: unknown;
  };
  const list =
    component === "flashcards"
      ? spec.cards
      : component === "quizzes"
        ? spec.questions
        : component === "mindmaps"
          ? spec.nodes
          : spec.sections;
  if (!Array.isArray(list) || list.length === 0) return;
  // Store the normalized spec (arrays joined, fields trimmed) so the app's
  // renderers and graders always see the same shape the validators accept.
  const normalized =
    component === "flashcards"
      ? validateDeckSpec(props)
      : component === "quizzes"
        ? validateQuizSpec(props)
        : component === "mindmaps"
          ? validateMindMapSpec(props)
          : validateNotesSpec(props);
  if (!normalized.ok) return;
  const fallbackTitle =
    component === "flashcards"
      ? "Kad Imbas"
      : component === "quizzes"
        ? "Kuiz"
        : component === "mindmaps"
          ? "Peta Pembelajaran"
          : "Nota";
  await artifactRegistry.addSpec(userId, {
    threadId,
    title:
      typeof normalized.spec.title === "string" && normalized.spec.title.trim()
        ? normalized.spec.title.trim()
        : fallbackTitle,
    type: component,
    spec: normalized.spec,
    // One artifact per run+component: retries within the same turn replace
    // the spec instead of piling up duplicate cards.
    dedupeKey: `render_ui:${threadId}:${runKey}:${component}`,
  });
};

/**
 * The edit-session preamble: pins the harness to the existing artifact and
 * demands the complete updated spec back, so the app can replace it wholesale.
 */
const buildArtifactEditContext = (
  artifact: PiArtifact,
  focusedIndex?: number,
) => {
  if (artifact.type === "notes" && artifact.kind === "spec") {
    const spec = artifact.spec as NotesSpec | undefined;
    const sections = spec?.sections ?? [];
    const lines = [
      "[Artifact edit session]",
      "You are editing EXISTING structured study notes. Do NOT create new notes.",
      `Notes: ${artifact.title} (id ${artifact.id})`,
      `Current spec JSON: ${JSON.stringify(artifact.spec)}`,
      "Section schema: { id (stable slug, KEEP IDS OF UNCHANGED SECTIONS EXACTLY), heading (<=80 chars), body? (markdown-lite, <=1500 chars), bullets? (up to 8 strings), checklist? (up to 10 items: string or { text }) }.",
    ];
    if (typeof focusedIndex === "number" && Number.isInteger(focusedIndex)) {
      const section = sections[focusedIndex];
      lines.push(
        section
          ? `The user is currently reading section "${section.heading}" (id ${section.id}, #${focusedIndex + 1} of ${sections.length}). If they say "this section", "this one", or refer to the section on screen, they mean section id "${section.id}".`
          : `The user is currently looking at section #${focusedIndex + 1}.`,
      );
    }
    lines.push(
      'When done, call render_ui with component "notes" containing the COMPLETE updated notes — every section, with only the requested changes applied. Keep unmentioned sections byte-identical (same ids).',
      "For small edits do NOT run web searches — apply the change directly and return quickly.",
      "If the request does not say what to change, ask one short clarifying question with the ask_user tool (never a plain-text question, which would end the run without an edit).",
    );
    return lines.join("\n");
  }

  if (artifact.type === "mindmaps" && artifact.kind === "spec") {
    const spec = artifact.spec as MindMapSpec | undefined;
    const nodes = spec?.nodes ?? [];
    const lines = [
      "[Artifact edit session]",
      "You are editing an EXISTING learning map (interactive knowledge graph). Do NOT create a new map.",
      `Map: ${artifact.title} (id ${artifact.id})`,
      `Current spec JSON: ${JSON.stringify(artifact.spec)}`,
      "Node schema: { id (stable slug, KEEP IDS OF UNCHANGED NODES EXACTLY), label, emoji?, parent? (tree edge), summary? (<=300 chars), details? (<=1200), kind? (concept|example|formula|question), source?, aiAdded?, challenges? (up to 2 of multiple-choice {options, answerIndex} | true-false {answer:boolean} | fill-blank {accepted} | open-ended {modelAnswer, keywords?}) } plus optional cross-link edges [{from,to,label?}].",
    ];
    if (typeof focusedIndex === "number" && Number.isInteger(focusedIndex)) {
      const node = nodes[focusedIndex];
      lines.push(
        node
          ? `The user is currently viewing node "${node.label}" (id ${node.id}, #${focusedIndex + 1} of ${nodes.length}). If they say "this node", "this one", or refer to the node on screen, they mean node id "${node.id}".`
          : `The user is currently looking at node #${focusedIndex + 1}.`,
      );
    }
    lines.push(
      'When done, call render_ui with component "mindmaps" containing the COMPLETE updated map — every node, with only the requested changes applied. Keep unmentioned nodes byte-identical (same ids, same content).',
      "For small edits do NOT run web searches — apply the change directly and return quickly.",
      "If the request does not say what to change, ask one short clarifying question with the ask_user tool (never a plain-text question, which would end the run without an edit).",
    );
    return lines.join("\n");
  }

  if (
    artifact.kind === "file" &&
    (artifact.type === "slides" ||
      artifact.type === "reports" ||
      artifact.type === "infographics")
  ) {
    const label =
      artifact.type === "slides"
        ? "slide deck"
        : artifact.type === "reports"
          ? "report document"
          : "infographic image";
    const lines = [
      "[Artifact edit session]",
      `You are editing an EXISTING ${label} file. Do NOT create a new one.`,
      `Title: ${artifact.title} (id ${artifact.id})`,
      `File: ${artifact.path ?? "the shared file in your workspace"}`,
    ];
    if (typeof focusedIndex === "number" && Number.isInteger(focusedIndex)) {
      lines.push(`The user is currently viewing slide #${focusedIndex + 1}.`);
    }
    lines.push(
      artifact.type === "infographics"
        ? "Apply the requested changes by regenerating the image (python + pillow/matplotlib are available), then share_file the updated image with the SAME filename so the app replaces the existing file."
        : "Apply the requested changes to the ACTUAL file — edit it in place (LibreOffice is available) or regenerate it, then verify it renders and share_file the updated file with the SAME filename so the app replaces the existing one.",
      "For small edits do NOT run web searches — apply the change directly and return quickly.",
      "If the request does not say what to change, ask one short clarifying question with the ask_user tool (never a plain-text question, which would end the run without an edit).",
    );
    return lines.join("\n");
  }

  const isQuiz = artifact.type === "quizzes";
  const lines = [
    "[Artifact edit session]",
    isQuiz
      ? "You are editing an EXISTING quiz. Do NOT create a new quiz."
      : "You are editing an EXISTING flashcard deck. Do NOT create a new deck.",
    `${isQuiz ? "Quiz" : "Deck"}: ${artifact.title} (id ${artifact.id})`,
    `Current spec JSON: ${JSON.stringify(artifact.spec)}`,
  ];

  if (isQuiz) {
    lines.push(
      'Question types: "multiple-choice" (options 2-6 + answerIndex), "open-ended" (modelAnswer + optional keywords), "true-false" (boolean answer), "fill-blank" (answer; "/" separates accepted alternatives). Convert between types whenever the user asks (e.g. "change q1 to open ended").',
    );
  }

  if (typeof focusedIndex === "number" && Number.isInteger(focusedIndex)) {
    if (isQuiz) {
      const questions =
        (artifact.spec as QuizSpec | undefined)?.questions ?? [];
      const question = questions[focusedIndex];
      lines.push(
        question
          ? `The user is currently viewing question #${focusedIndex + 1} of ${questions.length} (${question.type}): "${question.question}". If they say "this question", "this one", or refer to the question on screen, they mean question #${focusedIndex + 1}.`
          : `The user is currently looking at question #${focusedIndex + 1}.`,
      );
    } else {
      const cards = (artifact.spec as FlashcardSpec | undefined)?.cards ?? [];
      const card = cards[focusedIndex];
      lines.push(
        card
          ? `The user is currently viewing card #${focusedIndex + 1} of ${cards.length}: front "${card.front}" — back "${card.back}". If they say "this card", "this page", "this one", or refer to the card on screen, they mean card #${focusedIndex + 1}.`
          : `The user is currently looking at card #${focusedIndex + 1}.`,
      );
    }
  }

  lines.push(
    isQuiz
      ? 'When done, call render_ui with component "quizzes" containing the COMPLETE updated quiz — every question, with only the requested changes applied. Keep unmentioned questions byte-identical.'
      : 'When done, call render_ui with component "flashcards" containing the COMPLETE updated deck — every card, with only the requested changes applied. Keep unmentioned cards byte-identical.',
    "For small edits (renaming, tweaking one or two items), do NOT run web searches — apply the change directly and return quickly.",
    "If the request does not say what to change, ask one short clarifying question with the ask_user tool (never a plain-text question, which would end the run without an edit).",
  );
  return lines.join("\n");
};

/**
 * Learning-map node Q&A: the user asks about a node, the agent answers as a
 * tutor. No thread, no capture — the answer stays in the node panel.
 */
const buildMindMapAskContext = (artifact: PiArtifact, nodeId?: string) => {
  if (artifact.type === "notes") {
    const notesSpec = artifact.spec as NotesSpec | undefined;
    const section = nodeId
      ? notesSpec?.sections.find((s) => s.id === nodeId)
      : undefined;
    const lines = [
      "[Study notes Q&A]",
      `The user is reading structured study notes: ${artifact.title} (id ${artifact.id}).`,
      `Notes JSON: ${JSON.stringify(artifact.spec)}`,
    ];
    if (section) {
      lines.push(
        `They are asking about the section "${section.heading}" (id ${section.id})${section.body ? ` — body: ${section.body}` : ""}.`,
      );
    }
    lines.push(
      "Answer their question as a helpful tutor for a school student, in the language they use (Bahasa Malaysia unless they write in English). Keep it concise (2-6 sentences) unless they ask for more depth. If they ask for practice, give one short question with its answer.",
      "Do NOT modify the notes, do NOT call render_ui, and do NOT use tools unless the question truly requires a lookup — just answer as text.",
    );
    return lines.join("\n");
  }

  const spec = artifact.spec as MindMapSpec | undefined;
  const node = nodeId ? spec?.nodes.find((n) => n.id === nodeId) : undefined;
  const lines = [
    "[Learning map Q&A]",
    `The user is exploring a learning map: ${artifact.title} (id ${artifact.id}).`,
    `Map JSON: ${JSON.stringify(artifact.spec)}`,
  ];
  if (node) {
    lines.push(
      `They are asking about the node "${node.label}" (id ${node.id})${node.summary ? ` — summary: ${node.summary}` : ""}${node.details ? ` — details: ${node.details}` : ""}${node.source ? ` — source: ${node.source}` : ""}.`,
    );
  }
  lines.push(
    "Answer their question as a helpful tutor for a school student, in the language they use (Bahasa Malaysia unless they write in English). Keep it concise (2-6 sentences) unless they ask for more depth. If they ask for practice, give one short question with its answer.",
    "Do NOT modify the map, do NOT call render_ui, and do NOT use tools unless the question truly requires a lookup — just answer as text.",
  );
  return lines.join("\n");
};

/** Persist an AI-edited deck or quiz over its artifact, remapping progress. */
const applyArtifactEdit = async (
  userId: string,
  artifactId: string,
  args: Record<string, unknown> | undefined,
) => {
  const component = args?.component;
  if (
    component !== "flashcards" &&
    component !== "quizzes" &&
    component !== "mindmaps" &&
    component !== "notes"
  ) {
    return;
  }
  let props = args?.props;
  if (typeof props === "string") {
    try {
      props = JSON.parse(props);
    } catch {
      return;
    }
  }
  const artifact = await artifactRegistry.get(userId, artifactId);
  if (!artifact || artifact.kind !== "spec" || artifact.type !== component) {
    return;
  }

  if (component === "mindmaps") {
    const result = validateMindMapSpec(props);
    if (!result.ok) return;
    const oldSpec = artifact.spec as MindMapSpec | undefined;
    await artifactRegistry.updateSpec(
      userId,
      artifactId,
      result.spec,
      result.spec.title ?? artifact.title,
    );
    await remapMindMapProgress(
      userId,
      artifactId,
      oldSpec?.nodes ?? [],
      result.spec.nodes,
    );
    return;
  }

  if (component === "notes") {
    const result = validateNotesSpec(props);
    if (!result.ok) return;
    await artifactRegistry.updateSpec(
      userId,
      artifactId,
      result.spec,
      result.spec.title ?? artifact.title,
    );
    await remapNotesProgress(userId, artifactId, result.spec.sections);
    return;
  }

  if (component === "flashcards") {
    const result = validateDeckSpec(props);
    if (!result.ok) return;
    const oldSpec = artifact.spec as FlashcardSpec | undefined;
    await artifactRegistry.updateSpec(
      userId,
      artifactId,
      result.spec,
      result.spec.title ?? artifact.title,
    );
    await remapDeckProgress(
      userId,
      artifactId,
      oldSpec?.cards ?? [],
      result.spec.cards,
    );
  } else {
    const result = validateQuizSpec(props);
    if (!result.ok) return;
    const oldSpec = artifact.spec as QuizSpec | undefined;
    await artifactRegistry.updateSpec(
      userId,
      artifactId,
      result.spec,
      result.spec.title ?? artifact.title,
    );
    await remapQuizProgress(
      userId,
      artifactId,
      oldSpec?.questions ?? [],
      result.spec.questions,
    );
  }
};

const WORKSPACE_FILE_URL = /\/api\/workspace\/files\/[^\s)"'<>`]+/g;
const IMAGE_URL = /\/api\/images\/[A-Za-z0-9._-]+/g;
const trimTail = (url: string) => url.replace(/[.,;:!?]+$/, "");

/**
 * Register the files a `share_file` call handed to the user, so they surface
 * as cards in Spaces. Only explicitly shared files — never a workspace listing,
 * which would fill the gallery with scratch files.
 */
const baseNameOf = (name: string) => name.replace(/\.[^.]+$/, "").trim();

const captureSharedArtifacts = async (
  userId: string,
  threadId: string,
  content: string,
  slideEditTargetId?: string,
) => {
  const seen = new Set<string>();

  // A slide-edit run re-shares the updated deck (and its PDF sibling) under
  // the same file names. Those replace the existing artifact files instead of
  // piling up duplicate cards.
  let editableArtifacts: PiArtifact[] | null = null;
  if (slideEditTargetId) {
    const target = await artifactRegistry.get(userId, slideEditTargetId);
    if (target) {
      const all = await artifactRegistry.list(userId);
      const base = baseNameOf(target.title);
      editableArtifacts = all.filter(
        (artifact) =>
          artifact.kind === "file" && baseNameOf(artifact.title) === base,
      );
    }
  }

  for (const match of content.matchAll(WORKSPACE_FILE_URL)) {
    const url = trimTail(match[0]);
    if (seen.has(url)) continue;
    seen.add(url);
    const withoutQuery = url.split("?")[0] ?? url;
    let filePath = withoutQuery.replace("/api/workspace/files/", "");
    try {
      filePath = decodeURIComponent(filePath);
    } catch {
      // keep the encoded form
    }
    const title = filePath.split("/").pop() || filePath;

    const replace = editableArtifacts?.find(
      (artifact) => baseNameOf(artifact.title) === baseNameOf(title),
    );
    if (replace) {
      await artifactRegistry.updateFile(userId, replace.id, {
        url,
        path: filePath,
      });
      continue;
    }

    await artifactRegistry.add(userId, {
      threadId,
      title,
      path: filePath,
      url,
    });
  }

  for (const match of content.matchAll(IMAGE_URL)) {
    const url = trimTail(match[0]);
    if (seen.has(url)) continue;
    seen.add(url);
    const imageId = url.replace("/api/images/", "");
    await artifactRegistry.add(userId, {
      threadId,
      title: `image-${imageId.slice(0, 8)}.png`,
      path: imageId,
      url,
    });
  }
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Relay one turn through the pi harness. Returns null to fall back to the gateway. */
const piChat = async (
  req: Request,
  body: ChatBody,
  userId: string,
): Promise<Response | null> => {
  if (!piConfigured()) return null;
  const userText = newUserText(body.messages);
  if (userText === null || userText.length === 0) return null;

  // Stable within one turn: groups retries of the same render_ui component.
  const runKey =
    body.messages[body.messages.length - 1]?.id ?? String(Date.now());

  const artifactEditTargetId =
    typeof body.artifactEditTargetId === "string"
      ? body.artifactEditTargetId
      : undefined;
  let deckEditContext: string | null = null;
  let threadId = body.id ?? body.threadId;

  const artifactAskTargetId =
    typeof body.artifactAskTargetId === "string"
      ? body.artifactAskTargetId
      : undefined;

  if (!artifactEditTargetId && artifactAskTargetId) {
    const artifact = await artifactRegistry.get(userId, artifactAskTargetId);
    if (
      artifact &&
      artifact.kind === "spec" &&
      (artifact.type === "mindmaps" || artifact.type === "notes")
    ) {
      deckEditContext = buildMindMapAskContext(
        artifact,
        body.artifactAskNodeId,
      );
      // Session-only: no thread, so nothing lands in the sidebar or history.
      threadId = undefined;
    }
  }

  if (artifactEditTargetId) {
    const artifact = await artifactRegistry.get(userId, artifactEditTargetId);
    const editable =
      artifact &&
      ((artifact.kind === "spec" &&
        (artifact.type === "flashcards" ||
          artifact.type === "quizzes" ||
          artifact.type === "mindmaps" ||
          artifact.type === "notes")) ||
        (artifact.kind === "file" &&
          (artifact.type === "slides" ||
            artifact.type === "reports" ||
            artifact.type === "infographics") &&
          typeof artifact.url === "string"));
    if (!editable) {
      return null;
    }
    deckEditContext = buildArtifactEditContext(artifact, body.focusedIndex);
    // Edits belong to the thread where the deck was created, so the sidebar
    // keeps one session per deck. Only decks without an original thread get
    // a dedicated edit session.
    const originalThread = artifact.threadId
      ? await registry.get(userId, artifact.threadId)
      : undefined;
    const deckThreadId = originalThread
      ? artifact.threadId
      : `deck-edit-${artifactEditTargetId}`;
    if (!originalThread) {
      await registry.upsertForDeck(
        userId,
        deckThreadId,
        artifactEditTargetId,
        `Edit: ${artifact.title}`,
      );
    }
    threadId = deckThreadId;
  }

  const thread = threadId ? await registry.get(userId, threadId) : undefined;

  // "@space-name" in the message resolves to one of the user's spaces: it
  // grounds the turn in that space and ties the thread (and everything
  // created in it) to the space.
  let mentionSpace: { id: string; name: string } | null = null;
  if (!body.spaceId && userText.includes("@")) {
    const owned = await db
      .select({ id: spaces.id, name: spaces.name })
      .from(spaces)
      .where(eq(spaces.userId, userId));
    const joined = await db
      .select({ id: spaces.id, name: spaces.name })
      .from(spaceMembers)
      .innerJoin(spaces, eq(spaceMembers.spaceId, spaces.id))
      .where(eq(spaceMembers.userId, userId));
    const lower = userText.toLowerCase();
    for (const candidate of [...owned, ...joined]) {
      const needle = `@${candidate.name.toLowerCase()}`;
      if (
        lower.includes(needle) &&
        (!mentionSpace || candidate.name.length > mentionSpace.name.length)
      ) {
        mentionSpace = candidate;
      }
    }
  }
  const effectiveSpaceId =
    (typeof body.spaceId === "string" && body.spaceId) ||
    mentionSpace?.id ||
    undefined;

  // A chat inside a space remembers its space (first turn wins), so the
  // space's Hub tab can list the artifacts created for it.
  if (threadId && thread && !thread.spaceId && effectiveSpaceId) {
    const [target] = await db
      .select({ id: spaces.id, userId: spaces.userId })
      .from(spaces)
      .where(eq(spaces.id, effectiveSpaceId));
    if (target) {
      const allowed =
        target.userId === userId ||
        Boolean(
          (
            await db
              .select({ id: spaceMembers.id })
              .from(spaceMembers)
              .where(
                and(
                  eq(spaceMembers.spaceId, target.id),
                  eq(spaceMembers.userId, userId),
                ),
              )
          )[0],
        );
      if (allowed) await registry.setSpace(userId, threadId, effectiveSpaceId);
    }
  }

  // A real thread's run is registered before the upstream call so the stop
  // route can find it immediately. Session-only Q&A runs (no thread) stay
  // tied to the request signal and die with the panel that asked.
  const run = threadId ? threadRuns.register(threadId) : undefined;
  if (threadId) {
    await registry.update(userId, threadId, {
      runStatus: "running",
      lastMessageAt: new Date().toISOString(),
    });
  }

  const piMessages = toPiMessages(body.messages);
  let turnContext: string | null = deckEditContext;
  if (!turnContext && effectiveSpaceId) {
    // A chat inside a space: ground the turn in the space's textbook sources.
    turnContext = await buildSpaceContext(effectiveSpaceId, userText);
  }
  if (turnContext || mentionSpace) {
    const lastUser = [...piMessages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      let content = lastUser.content;
      if (mentionSpace) {
        content = content
          .replace(new RegExp(`@${escapeRegExp(mentionSpace.name)}`, "gi"), " ")
          .replace(/\s{2,}/g, " ")
          .trim();
      }
      lastUser.content = turnContext
        ? `${turnContext}\n\nUser request: ${content}`
        : content;
    }
  }

  let upstream: Response;
  try {
    upstream = await piFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        harnessId: process.env.PI_HARNESS ?? "pi",
        ...(process.env.PI_MODEL ? { modelId: process.env.PI_MODEL } : {}),
        // The full agent harness: sandbox tools (file/shell), web search, and
        // document generation — never the lightweight chat-only path.
        mode: "work",
        ...(thread?.conversationId
          ? { conversationId: thread.conversationId }
          : {}),
        messages: piMessages,
      }),
      // Detached runs die only through the stop route (or the harness), never
      // because the browser navigated away or reloaded.
      signal: run ? run.controller.signal : req.signal,
    });
  } catch {
    if (threadId && run) {
      threadRuns.unregister(threadId, run);
      await registry.update(userId, threadId, { runStatus: "idle" });
    }
    return null;
  }
  if (!upstream.ok || !upstream.body) {
    if (threadId && run) {
      threadRuns.unregister(threadId, run);
      await registry.update(userId, threadId, { runStatus: "idle" });
    }
    return null;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Detached from the request: after the client disconnects (reload,
      // closed tab) the loop keeps draining the harness stream so captures,
      // the title and the thread status all settle. Writes to a dead stream
      // must never throw or stop the drain.
      let clientGone = req.signal.aborted;
      const onClientGone = () => {
        clientGone = true;
      };
      if (!clientGone) {
        req.signal.addEventListener("abort", onClientGone, { once: true });
      }
      const emit = (chunk: Parameters<typeof writer.write>[0]) => {
        if (clientGone) return;
        try {
          writer.write(chunk);
        } catch {
          clientGone = true;
        }
      };

      emit({ type: "start" });
      emit({ type: "start-step" });

      let textId: string | null = null;
      let textSeq = 0;
      let buffer = "";
      let failure: string | null = null;
      const pendingToolIds = new Map<string, string[]>();
      const openToolIds = new Set<string>();
      const completedToolIds = new Set<string>();
      const renderUiArgs = new Map<string, Record<string, unknown>>();
      let lastToolId: string | null = null;

      const closeText = () => {
        if (textId) {
          emit({ type: "text-end", id: textId });
          textId = null;
        }
      };

      try {
        for (;;) {
          let read: ReadableStreamReadResult<Uint8Array>;
          try {
            read = await reader.read();
          } catch (error) {
            // The stop route aborted this relay: end the drain quietly. The
            // settle below records the run as stopped.
            if (run && run.controller.signal.aborted) break;
            throw error;
          }
          const { done, value } = read;
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            let event: PiEvent;
            try {
              event = JSON.parse(line.slice(6)) as PiEvent;
            } catch {
              continue;
            }

            if (event.type === "text" && typeof event.delta === "string") {
              if (!textId) {
                textId = String(textSeq++);
                emit({ type: "text-start", id: textId });
              }
              emit({
                type: "text-delta",
                id: textId,
                delta: event.delta,
              });
            } else if (
              event.type === "tool_call" &&
              typeof event.id === "string" &&
              typeof event.name === "string"
            ) {
              // Close the current text segment so the transcript interleaves
              // like pixelspacev3's: text segment, tool group, next segment.
              closeText();
              lastToolId = event.id;
              openToolIds.add(event.id);
              if (
                event.name === "render_ui" &&
                event.args &&
                typeof event.args === "object"
              ) {
                renderUiArgs.set(
                  event.id,
                  event.args as Record<string, unknown>,
                );
              }
              const queued = pendingToolIds.get(event.name) ?? [];
              queued.push(event.id);
              pendingToolIds.set(event.name, queued);
              emit({
                type: "tool-input-start",
                toolCallId: event.id,
                toolName: event.name,
                dynamic: true,
              });
              emit({
                type: "tool-input-available",
                toolCallId: event.id,
                toolName: event.name,
                input: event.args ?? {},
                dynamic: true,
              });
            } else if (
              event.type === "tool_result" &&
              typeof event.name === "string"
            ) {
              const queued = pendingToolIds.get(event.name) ?? [];
              const toolCallId =
                typeof event.id === "string"
                  ? event.id
                  : (queued.shift() ?? lastToolId);
              if (toolCallId) {
                completedToolIds.add(toolCallId);
                if (
                  event.name === "share_file" &&
                  event.ok !== false &&
                  typeof event.content === "string" &&
                  threadId
                ) {
                  await captureSharedArtifacts(
                    userId,
                    threadId,
                    event.content,
                    artifactEditTargetId,
                  );
                }
                if (
                  event.name === "render_ui" &&
                  event.ok !== false &&
                  threadId
                ) {
                  const args = renderUiArgs.get(toolCallId);
                  renderUiArgs.delete(toolCallId);
                  if (artifactEditTargetId) {
                    await applyArtifactEdit(userId, artifactEditTargetId, args);
                  } else {
                    await captureRenderUiSpec(userId, threadId, runKey, args);
                  }
                }
                if (event.ok === false) {
                  emit({
                    type: "tool-output-error",
                    toolCallId,
                    errorText: String(event.content ?? "Tool call failed"),
                    dynamic: true,
                  });
                } else {
                  const content =
                    typeof event.content === "string"
                      ? event.content.slice(0, 4000)
                      : event.content;
                  emit({
                    type: "tool-output-available",
                    toolCallId,
                    output: { content, ms: event.ms, calls: event.calls },
                    dynamic: true,
                  });
                }
              }
            } else if (
              event.type === "ask_user" &&
              typeof event.id === "string"
            ) {
              // The agent has paused the run waiting for a human. The question
              // id is live-only, so it has to ride a data part to the client.
              emit({
                type: "data-ask-user",
                data: {
                  questionId: event.id,
                  question:
                    typeof event.question === "string" ? event.question : "",
                  options: Array.isArray(event.options)
                    ? event.options.map((option) => String(option))
                    : [],
                  kind: event.kind === "approval" ? "approval" : "question",
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any);
            } else if (
              event.type === "context" &&
              event.compacted &&
              typeof event.compacted === "object"
            ) {
              // The harness compacted older turns to fit the window. Surface
              // it as a data part so the thread can show a small divider.
              const compacted = event.compacted as {
                fromTokens?: number;
                toTokens?: number;
              };
              emit({
                type: "data-context-compacted",
                data: {
                  fromTokens: compacted.fromTokens ?? 0,
                  toTokens: compacted.toTokens ?? 0,
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any);
            } else if (
              event.type === "conversation" &&
              typeof event.id === "string" &&
              threadId
            ) {
              threadRuns.setConversationId(threadId, event.id);
              await registry.update(userId, threadId, {
                conversationId: event.id,
              });
            } else if (
              event.type === "title" &&
              typeof event.title === "string" &&
              threadId &&
              !artifactEditTargetId
            ) {
              // Deck-edit turns never rename the thread: it keeps the name the
              // deck was created under.
              await registry.update(userId, threadId, { title: event.title });
            } else if (
              event.type === "error" &&
              typeof event.message === "string"
            ) {
              failure = event.message;
            }
          }
        }
      } finally {
        // A tool call the client sees without an output is a dangling tool call
        // — the runtime treats it as pending forever and can auto-continue the
        // run. Close every one we opened but never completed.
        for (const toolCallId of openToolIds) {
          if (!completedToolIds.has(toolCallId)) {
            emit({
              type: "tool-output-error",
              toolCallId,
              errorText: "The tool did not return a result.",
              dynamic: true,
            });
          }
        }
        closeText();
      }

      try {
        // Settle the thread: stopped when the stop route aborted this relay,
        // error when the harness reported one, done otherwise.
        const settled: "stopped" | "error" | "done" = run?.controller.signal
          .aborted
          ? "stopped"
          : failure
            ? "error"
            : "done";
        if (threadId) {
          await registry.update(userId, threadId, {
            runStatus: settled,
            ...(settled !== "error"
              ? { lastMessageAt: new Date().toISOString() }
              : {}),
          });
        }

        if (failure) throw new Error(failure);

        emit({ type: "finish-step" });
        emit({ type: "finish" });
      } finally {
        if (threadId && run) threadRuns.unregister(threadId, run);
      }
    },
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });

  return createUIMessageStreamResponse({ stream });
};

export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const body = (await req.json()) as ChatBody;

  const viaPi = await piChat(req, body, user.id);
  if (viaPi) return viaPi;

  if (newUserText(body.messages) === null) {
    // No new user turn (tool continuation without client tools): finish cleanly.
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: "start" });
        writer.write({ type: "start-step" });
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const aiSDKTools = { ...frontendTools(body.tools ?? {}) };
  const result = streamText({
    abortSignal: req.signal,
    model: gateway.chat(process.env.AI_CHAT_MODEL ?? "Qwen/Qwen3.8-27B"),
    messages: await convertToModelMessages(body.messages, {
      tools: aiSDKTools,
    }),
    system: body.system,
    tools: aiSDKTools,
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
}
