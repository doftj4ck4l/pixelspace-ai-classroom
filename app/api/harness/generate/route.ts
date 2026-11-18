import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { GenerationKind } from "@/components/assistant-ui/harness";

export const maxDuration = 60;

const gateway = createOpenAI({
  baseURL: `${(process.env.AI_CHAT_BASE_URL ?? "https://model.arasintegrasi.ai").replace(/\/+$/, "")}/v1`,
  apiKey: process.env.AI_CHAT_API_KEY,
});

const MODEL = process.env.AI_CHAT_MODEL ?? "Qwen/Qwen3.8-27B";

const STEPS: Record<GenerationKind, string[]> = {
  slides: [
    "Understanding the topic",
    "Researching facts",
    "Planning the outline",
    "Drafting slides",
  ],
  flashcards: [
    "Understanding the topic",
    "Researching facts",
    "Selecting key concepts",
    "Writing cards",
  ],
};

const languageName = (language: string) =>
  language === "bm"
    ? "Bahasa Malaysia"
    : language === "en"
      ? "English"
      : "English and Bahasa Malaysia (bilingual)";

const buildPrompt = (kind: GenerationKind, topic: string, language: string) => {
  const lang = languageName(language);
  if (kind === "flashcards") {
    return [
      `You are creating a flashcard deck for Malaysian secondary school students.`,
      `Topic: ${topic}`,
      `Language: ${lang}`,
      `Write 10 to 14 flashcards. Each card has a short question or term (front) and a concise answer or definition (back), one to three sentences at most.`,
      `Cover the key concepts in a logical learning order, from fundamentals to application.`,
      `Respond with ONLY strict JSON, no markdown fences, no commentary:`,
      `{"cards":[{"front":"...","back":"..."}]}`,
    ].join("\n");
  }
  return [
    `You are creating a slide deck for Malaysian secondary school students.`,
    `Topic: ${topic}`,
    `Language: ${lang}`,
    `Write 8 to 12 slides. Each slide has a short title and one subtitle line that summarises the slide content (one sentence, no bullet lists).`,
    `The first slide introduces the topic, the last slide summarises key takeaways.`,
    `Respond with ONLY strict JSON, no markdown fences, no commentary:`,
    `{"slides":[{"title":"...","subtitle":"..."}]}`,
  ].join("\n");
};

const extractJson = (raw: string): unknown => {
  const cleaned = raw
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
};

const slug = (topic: string) =>
  topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "untitled";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    kind?: string;
    topic?: string;
    language?: string;
    files?: string[];
  };

  const kind: GenerationKind =
    body.kind === "flashcards" ? "flashcards" : "slides";
  const topic = (body.topic ?? "").trim() || "Untitled";
  const language = body.language ?? "both";
  const files = Array.isArray(body.files) ? body.files : [];

  const encoder = new TextEncoder();
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        const steps = STEPS[kind];
        for (const label of steps) {
          await delay(500 + Math.random() * 600);
          send({ type: "step", label });
        }

        const fileNote =
          files.length > 0
            ? `\nThe teacher also attached these files as context: ${files.join(", ")}.`
            : "";

        const { text } = await generateText({
          model: gateway.chat(MODEL),
          prompt: buildPrompt(kind, topic, language) + fileNote,
        });

        const parsed = extractJson(text) as Record<string, unknown> | null;

        if (kind === "flashcards") {
          const rawCards =
            (parsed?.cards as { front?: string; back?: string }[] | undefined) ??
            [];
          const cards = rawCards
            .filter((c) => c.front && c.back)
            .slice(0, 20)
            .map((c) => ({ front: String(c.front), back: String(c.back) }));
          if (cards.length === 0) {
            send({ type: "error", message: "The model returned no usable cards. Try again." });
            return;
          }
          send({ type: "step", label: `Writing ${slug(topic)}-cards.json` });
          await delay(600);
          send({
            type: "done",
            content: { kind: "flashcards", cards },
            sources: [
              {
                title: `${topic} — overview`,
                url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
              },
            ],
            artifacts: [{ name: `${slug(topic)}-cards.json` }],
          });
        } else {
          const rawSlides =
            (parsed?.slides as
              | { title?: string; subtitle?: string }[]
              | undefined) ?? [];
          const slides = rawSlides
            .filter((s) => s.title)
            .slice(0, 14)
            .map((s) => ({
              title: String(s.title),
              subtitle: String(s.subtitle ?? ""),
            }));
          if (slides.length === 0) {
            send({ type: "error", message: "The model returned no usable slides. Try again." });
            return;
          }
          send({ type: "step", label: `Writing ${slug(topic)}.pptx` });
          await delay(700);
          send({
            type: "done",
            content: { kind: "slides", slides },
            sources: [
              {
                title: `${topic} — overview`,
                url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
              },
            ],
            artifacts: [{ name: `${slug(topic)}.pptx` }],
          });
        }
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "Generation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
