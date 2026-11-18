import { NextResponse } from "next/server";
import { unzipSync } from "fflate";
import { artifactRegistry } from "@/lib/pi/artifacts";
import { piConfigured, piFetch } from "@/lib/pi/client";

/**
 * Extract a slide outline from a shared .pptx so it can open in our slide
 * editor. A pptx is a zip of XML; each slide's paragraphs are read in order —
 * the first becomes the title, the rest the subtitle line.
 */

const slideNumber = (name: string) =>
  Number(name.match(/slide(\d+)\.xml$/)?.[1] ?? 0);

const decodeEntities = (value: string) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const extractParagraphs = (xml: string): string[] => {
  const paragraphs: string[] = [];
  for (const paragraph of xml.split(/<a:p[ >]/).slice(1)) {
    const runs = [...paragraph.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map(
      (match) => match[1] ?? "",
    );
    const text = decodeEntities(runs.join("")).replace(/\s+/g, " ").trim();
    if (text) paragraphs.push(text);
  }
  return paragraphs;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const artifact = await artifactRegistry.get(id);
  if (!artifact || artifact.type !== "slides" || !piConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const url = new URL(artifact.url, "http://localhost");
    const res = await piFetch(`${url.pathname}${url.search}`);
    if (!res.ok) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    const files = unzipSync(bytes);
    const names = Object.keys(files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => slideNumber(a) - slideNumber(b));

    const slides: { title: string; subtitle: string }[] = [];
    for (const name of names) {
      const xml = new TextDecoder().decode(files[name]);
      const paragraphs = extractParagraphs(xml);
      if (paragraphs.length === 0) continue;
      const [title, ...rest] = paragraphs;
      slides.push({ title, subtitle: rest.join(" · ") });
      if (slides.length >= 40) break;
    }

    return NextResponse.json({ slides });
  } catch {
    return NextResponse.json({ slides: [] });
  }
}
