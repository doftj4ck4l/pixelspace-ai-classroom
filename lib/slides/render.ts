import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { PiArtifact } from "@/lib/pi/artifacts";
import { piFetch } from "@/lib/pi/client";

/**
 * Renders a shared .pptx to per-slide PNGs using the harness's own sandbox
 * image (LibreOffice + the same fonts the deck was generated with), so the
 * preview matches the file exactly. Results are cached per artifact version
 * under ~/.cache/paic2-slides.
 */

const run = promisify(execFile);
const RENDER_IMAGE = process.env.SLIDES_RENDER_IMAGE ?? "pixelspace-sandbox:1";
const CACHE_ROOT = path.join(homedir(), ".cache", "paic2-slides");

const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_");

export const slidesCacheDir = (artifactId: string, version: string) =>
  path.join(CACHE_ROOT, sanitize(artifactId), sanitize(version || "0"));

export const slidePageFile = (
  artifactId: string,
  version: string,
  page: number,
) => path.join(slidesCacheDir(artifactId, version), `page-${page}.png`);

const pageNumber = (name: string) =>
  Number(name.match(/page-(\d+)\.png$/)?.[1] ?? 0);

const locks = new Map<string, Promise<number>>();

const convert = async (
  artifactId: string,
  artifact: PiArtifact,
): Promise<number> => {
  if (typeof artifact.url !== "string") throw new Error("artifact has no file");
  const version = artifact.updatedAt ?? "0";
  const dir = slidesCacheDir(artifactId, version);
  const meta = path.join(dir, "meta.json");
  if (existsSync(meta)) {
    try {
      const parsed = JSON.parse(readFileSync(meta, "utf8")) as {
        pages?: number;
      };
      if (typeof parsed.pages === "number" && parsed.pages > 0) {
        return parsed.pages;
      }
    } catch {
      // fall through and re-render
    }
  }

  const existing = locks.get(artifactId);
  if (existing) return existing;

  const task = (async () => {
    const tmp = path.join(
      tmpdir(),
      `paic2-slide-${sanitize(artifactId)}-${Date.now()}`,
    );
    mkdirSync(tmp, { recursive: true });
    try {
      const url = new URL(artifact.url as string, "http://localhost");
      const res = await piFetch(`${url.pathname}${url.search}`);
      if (!res.ok) throw new Error(`file fetch failed (${res.status})`);
      const ext = (path.extname(url.pathname) || ".pptx").toLowerCase();
      const source = path.join(tmp, `deck${ext}`);
      writeFileSync(source, Buffer.from(await res.arrayBuffer()));

      let pdfPath: string;
      if (ext === ".pdf") {
        pdfPath = source;
      } else {
        await run(
          "docker",
          [
            "run",
            "--rm",
            "-v",
            `${tmp}:/data`,
            RENDER_IMAGE,
            "soffice",
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            "/data",
            `/data/deck${ext}`,
          ],
          { timeout: 180_000 },
        );
        pdfPath = path.join(tmp, "deck.pdf");
        if (!existsSync(pdfPath)) throw new Error("conversion produced no pdf");
      }

      await run(
        "pdftoppm",
        ["-png", "-r", "150", pdfPath, path.join(tmp, "page")],
        { timeout: 180_000 },
      );

      const pngs = readdirSync(tmp)
        .filter((name) => /^page-\d+\.png$/.test(name))
        .sort((a, b) => pageNumber(a) - pageNumber(b));
      if (pngs.length === 0) throw new Error("no pages rendered");

      // Replace the previous cached version of this artifact.
      const artifactRoot = path.join(CACHE_ROOT, sanitize(artifactId));
      try {
        for (const entry of readdirSync(artifactRoot)) {
          if (path.join(artifactRoot, entry) !== dir) {
            rmSync(path.join(artifactRoot, entry), {
              recursive: true,
              force: true,
            });
          }
        }
      } catch {
        // the root may not exist yet
      }
      mkdirSync(dir, { recursive: true });
      for (const png of pngs) {
        writeFileSync(path.join(dir, png), readFileSync(path.join(tmp, png)));
      }
      writeFileSync(meta, JSON.stringify({ pages: pngs.length }));
      return pngs.length;
    } finally {
      rmSync(tmp, { recursive: true, force: true });
      locks.delete(artifactId);
    }
  })();

  locks.set(artifactId, task);
  return task;
};

/** Ensures rendered pages exist for this artifact version; returns the count. */
export const ensureSlidePages = convert;
