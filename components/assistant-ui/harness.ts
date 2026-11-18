"use client";

export type FlashcardItem = { front: string; back: string };

export type SlideOutlineItem = { title: string; subtitle: string };

export type GeneratedContent =
  | { kind: "flashcards"; cards: FlashcardItem[] }
  | { kind: "slides"; slides: SlideOutlineItem[] };

export type GenerationSource = { title: string; url: string };
export type GenerationArtifact = { name: string };

export type GenerationKind = "slides" | "flashcards";

export type GenerationInput = {
  kind: GenerationKind;
  topic: string;
  language: "en" | "bm" | "both";
  files: string[];
};

export type GenerationEvent =
  | { type: "step"; label: string }
  | {
      type: "done";
      content: GeneratedContent;
      sources: GenerationSource[];
      artifacts: GenerationArtifact[];
    }
  | { type: "error"; message: string };

export async function streamGeneration(
  input: GenerationInput,
  onEvent: (event: GenerationEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/harness/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok || !res.body) {
    onEvent({
      type: "error",
      message: `Generation failed (${res.status})`,
    });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(6)) as GenerationEvent);
      } catch {
        // ignore malformed frames
      }
    }
  }
}
