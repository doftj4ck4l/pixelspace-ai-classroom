"use client";

import { useCallback, useEffect, useState, type FC } from "react";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileTextIcon,
  Loader2Icon,
  MinusIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArtifactAiPanel } from "@/components/assistant-ui/artifact-ai-panel";

/**
 * Exact report preview: pages rendered from the actual PDF/DOCX file by the
 * harness's LibreOffice pipeline (server-side, cached), plus the AI edit
 * panel that re-shares the file with changes applied.
 */
export const DocumentPreview: FC<{
  artifactId: string;
  title: string;
  downloads: { name: string; url: string }[];
  onClose: () => void;
}> = ({ artifactId, title, downloads, onClose }) => {
  const [pages, setPages] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [failed, setFailed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [rendering, setRendering] = useState(false);

  const load = useCallback(() => {
    setRendering(true);
    fetch(`/api/pi/artifacts/${artifactId}/pages`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pages?: number } | null) => {
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

  const pageUrl = (n: number) =>
    `/api/pi/artifacts/${artifactId}/pages/${n}?v=${version}`;

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm font-medium">
          Could not render this report for preview.
        </p>
        <p className="text-muted-foreground max-w-md text-sm">
          The original file is still available — download it below.
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
          <FileTextIcon className="size-4 shrink-0 text-purple-500" />
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

        {downloads.map((file) => (
          <a
            key={file.url}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="border-border/60 hover:bg-muted hidden h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors sm:flex"
          >
            <DownloadIcon className="size-3.5" />
            {file.name.split(".").pop()?.toUpperCase()}
          </a>
        ))}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="border-border/60 hidden w-40 shrink-0 flex-col overflow-y-auto border-r p-3 lg:flex">
          <p className="text-muted-foreground mb-2 text-[11px] font-medium">
            {pages ?? "…"} pages
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
                      ? "border-purple-500/70 ring-2 ring-purple-500/30"
                      : "border-border/60 hover:border-foreground/30",
                  )}
                  aria-label={`Page ${index + 1}`}
                >
                  <span className="block aspect-[3/4] w-full overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pageUrl(index + 1)}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover object-top"
                    />
                  </span>
                  <span className="text-muted-foreground block px-1.5 py-1 text-[10px] tabular-nums">
                    {index + 1}
                  </span>
                </button>
              ))}
          </div>
        </aside>

        <div className="bg-muted/30 flex min-w-0 flex-1 flex-col overflow-auto">
          <div className="flex flex-1 items-start justify-center p-4 sm:p-8">
            {loading || rendering ? (
              <div className="flex flex-col items-center gap-3 self-center text-center">
                <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  {rendering && !loading
                    ? "Re-rendering pages…"
                    : "Rendering the report…"}
                </p>
              </div>
            ) : (
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                }}
                className="w-full max-w-3xl transition-transform"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pageUrl(page)}
                  alt={`Page ${page}`}
                  className="w-full rounded-sm bg-white shadow-md"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pb-4">
            <button
              type="button"
              aria-label="Previous page"
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
              aria-label="Next page"
              disabled={pages !== null && page >= pages}
              onClick={() => setPage((p) => Math.min(p + 1, pages ?? p))}
              className="border-border/60 bg-card hover:bg-muted flex size-9 items-center justify-center rounded-full border transition-colors disabled:opacity-30"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <ArtifactAiPanel
        artifactId={artifactId}
        kind="reports"
        open={aiOpen}
        onOpenChange={setAiOpen}
        onDeckUpdated={load}
      />
    </div>
  );
};
