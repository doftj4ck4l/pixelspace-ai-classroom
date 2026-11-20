import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { artifactRegistry } from "@/lib/pi/artifacts";
import { generateImage } from "@/lib/nextplus/router";
import { readGeneratedMeta, saveGeneratedImage } from "@/lib/generated/store";

export const maxDuration = 120;

const LANGUAGE_HINT: Record<string, string> = {
  bm: "All text in the infographic must be in Bahasa Malaysia.",
  en: "All text in the infographic must be in English.",
  both: "Use Bahasa Malaysia with common English terms where natural.",
};

const styleFor = (topic: string) =>
  [
    `Create a clean, modern educational infographic about: ${topic}.`,
    "Flat vector illustration style, generous white space, a coherent colour palette, clear section headers, simple icons, short readable labels, well-organised layout — designed for a school student.",
    "Do not include watermarks, logos or signatures. Text must be legible and spelled correctly.",
  ].join(" ");

/**
 * Infographic generation via the Nextplus image model.
 * Create: { topic, language? } — Edit: { artifactId, instruction }.
 */
export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as {
    topic?: unknown;
    language?: unknown;
    artifactId?: unknown;
    instruction?: unknown;
  };

  try {
    if (typeof body.artifactId === "string" && body.artifactId) {
      // Edit an existing infographic: original prompt + the change request.
      const artifact = await artifactRegistry.get(user.id, body.artifactId);
      if (!artifact || artifact.type !== "infographics" || !artifact.path) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const instruction =
        typeof body.instruction === "string" ? body.instruction.trim() : "";
      if (!instruction) {
        return NextResponse.json(
          { error: "instruction is required" },
          { status: 400 },
        );
      }
      const previous = readGeneratedMeta(artifact.path);
      const base =
        previous?.prompt ??
        `Create a clean, modern educational infographic titled "${artifact.title}".`;
      const prompt = `${base} Apply this change and keep everything else the same: ${instruction}.`;
      const { bytes } = await generateImage(prompt);
      const id = saveGeneratedImage(bytes, { prompt, kind: "infographics" });
      await artifactRegistry.updateFile(user.id, body.artifactId, {
        url: `/api/generated/${id}`,
        path: id,
      });
      return NextResponse.json({ artifactId: body.artifactId });
    }

    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }
    const language =
      typeof body.language === "string" && LANGUAGE_HINT[body.language]
        ? LANGUAGE_HINT[body.language]
        : LANGUAGE_HINT.bm;
    const prompt = `${styleFor(topic)} ${language}`;
    const { bytes } = await generateImage(prompt);
    const id = saveGeneratedImage(bytes, { prompt, kind: "infographics" });
    const title = topic.length > 60 ? `${topic.slice(0, 60)}…` : topic;
    const artifact = await artifactRegistry.add(user.id, {
      threadId: "",
      title: `${title} — Infografik`,
      path: id,
      url: `/api/generated/${id}`,
    });
    if (!artifact) {
      return NextResponse.json(
        { error: "could not save the infographic" },
        { status: 500 },
      );
    }
    return NextResponse.json({ artifactId: artifact.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation failed" },
      { status: 502 },
    );
  }
}
