"use client";

import { useCallback, useEffect, useState, type FC } from "react";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileTextIcon,
  Loader2Icon,
  Maximize2Icon,
  MinusIcon,
  PlusIcon,
  PresentationIcon,
  RefreshCwIcon,
  XIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArtifactAiPanel } from "@/components/assistant-ui/artifact-ai-panel";

/**
 * Exact slide deck preview: pages rendered from the actual .pptx by the
 * harness's LibreOffice pipeline (server-side, cached), plus the AI edit
 * panel that re-shares the file with changes applied.
 */
export const SlidePreview: FC<{
  artifactId: string;
  title: string;
  downloads: { name: string; url: string }[];
  onClose: () => void;
  /** Hide the AI edit panel when the viewer does not own the artifact. */
  editable?: boolean;
}> = ({ artifactId, title, downloads, onClose, editable = true }) => {
  const [pages, setPages] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [presenting, setPresenting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [rendering, setRendering] = useState(false);

  const load = useCallback(() => {
    setRendering(true);
    fetch(`/api/pi/artifacts/${artifactId}/slides`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pages?: number; version?: string } | null) => {
        if (!data?.pages) {
          setFailed(true);
          return;
        }
        setFailed(false);
        setPages(data.pages);
        setVersion((value) => value + 1);
        setPage((current) => Math.min(current, data.pages ?? current));
      })
      .catch(() => setFailed(true))
      .finally(() => setRendering(false));
  }, [artifactId]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPresenting(false);
      if (event.key === "ArrowRight")
        setPage((p) => Math.min(p + 1, pages ?? p));
      if (event.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, pages]);

  const pageUrl = (n: number) =>
    `/api/pi/artifacts/${artifactId}/slides/${n}?v=${version}`;

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm font-medium">
          Could not render this deck for preview.
        </p>
        <p className="text-muted-foreground max-w-md text-sm">
          The original file is still available — download it below and open it
          in PowerPoint or Keynote.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {downloads.map((file) => (
            <a
              key={file.url}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="border-border/60 hover:bg-muted flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors"
            >
              <DownloadIcon className="size-4" />
              {file.name}
            </a>
          ))}
          <Button
            variant="outline"
            className="h-9 gap-2 rounded-full px-4"
            onClick={load}
          >
            <RefreshCwIcon className="size-4" />
            Retry
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-full px-4"
            onClick={onClose}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  const loading = pages === null;

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      {/* Header */}
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
          <PresentationIcon className="size-4 shrink-0 text-yellow-500" />
          <span className="truncate text-sm font-semibold" title={title}>
            {title}
          </span>
          {pages !== null && (
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {page} / {pages}
            </span>
          )}
        </span>

        <div className="hidden items-center gap-1 sm:flex">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setZoom((z) => Math.max(z - 25, 50))}
            aria-label="Zoom out"
          >
            <MinusIcon className="size-4" />
          </Button>
          <span className="text-muted-foreground w-10 text-center text-xs tabular-nums">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setZoom((z) => Math.min(z + 25, 200))}
            aria-label="Zoom in"
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          className="h-8 gap-1.5 rounded-full px-3 text-xs"
          onClick={() => setPresenting(true)}
          disabled={loading}
        >
          <Maximize2Icon className="size-3.5" />
          <span className="hidden sm:inline">Present</span>
        </Button>

        {downloads.map((file) => (
          <a
            key={file.url}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="border-border/60 hover:bg-muted hidden h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors sm:flex"
          >
            {/\.pdf$/i.test(file.name) ? (
              <FileTextIcon className="size-3.5" />
            ) : (
              <DownloadIcon className="size-3.5" />
            )}
            {file.name.split(".").pop()?.toUpperCase()}
          </a>
        ))}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Thumbnails */}
        <aside className="border-border/60 hidden w-44 shrink-0 flex-col overflow-y-auto border-r p-3 md:flex">
          <p className="text-muted-foreground mb-2 text-[11px] font-medium">
            {pages ?? "…"} slides
          </p>
          <div className="grid gap-2">
            {pages !== null &&
              Array.from({ length: pages }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPage(index + 1)}
                  className={cn(
                    "overflow-hidden rounded-lg border text-left transition-colors",
                    page === index + 1
                      ? "border-teal-500/70 ring-2 ring-teal-500/30"
                      : "border-border/60 hover:border-foreground/30",
                  )}
                  aria-label={`Slide ${index + 1}`}
                >
                  <span className="block aspect-video w-full overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pageUrl(index + 1)}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </span>
                  <span className="text-muted-foreground block px-1.5 py-1 text-[10px] tabular-nums">
                    {index + 1}
                  </span>
                </button>
              ))}
          </div>
        </aside>

        {/* Stage */}
        <div className="bg-muted/30 flex min-w-0 flex-1 flex-col overflow-auto">
          <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
            {loading || rendering ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  {rendering && !loading
                    ? "Re-rendering slides…"
                    : "Rendering slides from the PowerPoint file…"}
                </p>
                <p className="text-muted-foreground/70 text-xs">
                  First preview takes a few seconds; it is instant after that.
                </p>
              </div>
            ) : (
              <div
                style={{ transform: `scale(${zoom / 100})` }}
                className="w-full max-w-4xl transition-transform"
              >
                <div className="aspect-video w-full overflow-hidden rounded-sm bg-white shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pageUrl(page)}
                    alt={`Slide ${page}`}
                    className="size-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pb-4">
            <button
              type="button"
              aria-label="Previous slide"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="border-border/60 bg-card hover:bg-muted flex size-9 items-center justify-center rounded-full border transition-colors disabled:opacity-30"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <span className="text-muted-foreground text-xs tabular-nums">
              {page} / {pages ?? "…"}
            </span>
            <button
              type="button"
              aria-label="Next slide"
              disabled={pages !== null && page >= pages}
              onClick={() => setPage((p) => Math.min(p + 1, pages ?? p))}
              className="border-border/60 bg-card hover:bg-muted flex size-9 items-center justify-center rounded-full border transition-colors disabled:opacity-30"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Present mode */}
      {presenting && pages !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex flex-1 items-center justify-center p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pageUrl(page)}
              alt={`Slide ${page}`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="flex items-center justify-center gap-4 pb-6 text-white">
            <button
              type="button"
              aria-label="Previous slide"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <span className="text-sm tabular-nums">
              {page} / {pages}
            </span>
            <button
              type="button"
              aria-label="Next slide"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(p + 1, pages))}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRightIcon className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Exit present mode"
              onClick={() => setPresenting(false)}
              className="ml-4 flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            >
              <XIcon className="size-5" />
            </button>
          </div>
        </div>
      )}

      {editable ? (
        <ArtifactAiPanel
          artifactId={artifactId}
          kind="slides"
          open={aiOpen}
          onOpenChange={setAiOpen}
          focusedIndex={page - 1}
          onDeckUpdated={load}
        />
      ) : null}
    </div>
  );
};
