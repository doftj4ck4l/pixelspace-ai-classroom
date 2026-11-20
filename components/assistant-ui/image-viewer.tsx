"use client";

import { useCallback, useEffect, useRef, useState, type FC } from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
  ImageIcon,
  Loader2Icon,
  Maximize2Icon,
  SparklesIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Infographic viewer: zoom/pan image stage plus "Edit with AI", which
 * regenerates the image through the Nextplus image model (original prompt +
 * the change request) and replaces the artifact in place.
 */
export const ImageViewer: FC<{
  artifactId: string;
  title: string;
  url: string;
  downloads: { name: string; url: string }[];
  onClose: () => void;
}> = ({ artifactId, title, url, downloads, onClose }) => {
  const [version, setVersion] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const generate = async () => {
    const text = instruction.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId, instruction: text }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "generation failed");
      }
      setInstruction("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "generation failed");
    } finally {
      setBusy(false);
    }
  };

  const src = `${url}${url.includes("?") ? "&" : "?"}v=${version}`;

  useEffect(() => {
    setZoom(1);
    setNatural(null);
  }, [version]);

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      <header className="border-border/60 flex shrink-0 items-center gap-2 border-b px-3 py-2.5 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-full"
          onClick={onClose}
          aria-label="Back"
        >
          <ArrowLeftIcon className="size-5" />
        </Button>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <ImageIcon className="size-4 shrink-0 text-pink-500" />
          <span className="truncate text-sm font-semibold" title={title}>
            {title}
          </span>
          {natural && (
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {natural.w}×{natural.h}
            </span>
          )}
        </span>

        <div className="hidden items-center gap-1 sm:flex">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            aria-label="Zoom out"
          >
            <ZoomOutIcon className="size-4" />
          </Button>
          <span className="text-muted-foreground w-12 text-center text-xs tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            aria-label="Zoom in"
          >
            <ZoomInIcon className="size-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          className="h-8 gap-1.5 rounded-full px-3 text-xs"
          onClick={() => setFullscreen(true)}
        >
          <Maximize2Icon className="size-3.5" />
          <span className="hidden sm:inline">Full screen</span>
        </Button>

        {downloads.map((file) => (
          <a
            key={file.url}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            download
            className="border-border/60 hover:bg-muted hidden h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors sm:flex"
          >
            <DownloadIcon className="size-3.5" />
            {file.name.split(".").pop()?.toUpperCase()}
          </a>
        ))}
      </header>

      <div
        ref={scrollRef}
        className="bg-muted/30 flex min-h-0 flex-1 items-start justify-center overflow-auto p-4 sm:p-8"
      >
        <div
          style={{ width: natural ? `${natural.w * zoom}px` : "100%" }}
          className="max-w-none transition-[width]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title}
            onLoad={(event) =>
              setNatural({
                w: event.currentTarget.naturalWidth,
                h: event.currentTarget.naturalHeight,
              })
            }
            className="w-full rounded-xl border bg-white shadow-md dark:bg-neutral-900"
          />
        </div>
      </div>

      {/* Edit with AI (image model) */}
      {!aiOpen ? (
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="bg-foreground text-background fixed right-4 bottom-4 z-40 flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-lg transition-transform hover:scale-[1.03] sm:right-6 sm:bottom-6"
        >
          <SparklesIcon className="size-4" />
          Edit with AI
        </button>
      ) : (
        <div className="border-border/60 bg-background fixed right-3 bottom-3 z-40 w-[calc(100vw-1.5rem)] rounded-2xl border shadow-2xl sm:right-6 sm:bottom-6 sm:w-96">
          <div className="border-border/60 flex items-center gap-2 border-b px-3 py-2.5">
            <SparklesIcon className="size-4 text-pink-500" />
            <span className="flex-1 text-sm font-semibold">Edit with AI</span>
            <button
              type="button"
              aria-label="Tutup panel"
              onClick={() => setAiOpen(false)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-lg transition-colors"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="grid gap-2 p-3">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Describe the change — the image is regenerated with the same
              topic. e.g. &ldquo;warmer colours&rdquo;, &ldquo;add a section
              about condensation&rdquo;, &ldquo;translate the labels to
              English&rdquo;.
            </p>
            <div className="border-border/60 focus-within:ring-ring/40 flex items-end gap-2 rounded-xl border px-3 py-2 focus-within:ring-2">
              <textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void generate();
                  }
                }}
                rows={2}
                disabled={busy}
                placeholder="Ask to change this infographic..."
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                aria-label="Hantar"
                disabled={busy || !instruction.trim()}
                onClick={() => void generate()}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                  busy || !instruction.trim()
                    ? "bg-muted text-muted-foreground"
                    : "bg-foreground text-background hover:opacity-90",
                )}
              >
                {busy ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckIcon className="size-4" />
                )}
              </button>
            </div>
            {busy && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Loader2Icon className="size-3.5 animate-spin" />
                Generating a new version…
              </p>
            )}
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>
        </div>
      )}

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div className="flex flex-1 items-center justify-center overflow-auto p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={title}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="flex items-center justify-center gap-4 pb-6 text-white">
            <button
              type="button"
              aria-label="Exit full screen"
              onClick={() => setFullscreen(false)}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            >
              <XIcon className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
