"use client";

import { useEffect, useMemo, useRef, useState, type FC } from "react";
import {
  DraftIcon,
  DownloadIcon,
  FileTextIcon,
  ImageIcon,
  LibraryBooksIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PictureAsPdfIcon,
  PlusIcon,
  PlayIcon,
  PresentationIcon,
  SearchIcon,
  SmartDisplayIcon,
  TableIcon,
  Trash2Icon,
  UploadFileIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type SourceKind =
  | "pdf"
  | "doc"
  | "slides"
  | "sheets"
  | "images"
  | "youtube"
  | "other";

type SourceRow = {
  id: string;
  title: string;
  ext: string;
  mime: string;
  size: number;
  kind: SourceKind;
  createdAt: string;
  url: string;
  thumb?: string;
};

const KIND_THEME: Record<
  SourceKind,
  { cover: string; color: string; Icon: typeof DraftIcon; label: string }
> = {
  pdf: {
    cover:
      "bg-gradient-to-br from-red-300/50 via-rose-200/40 to-pink-100/30 dark:from-red-900/60 dark:via-rose-950/50 dark:to-pink-950/40",
    color: "text-red-500",
    Icon: PictureAsPdfIcon,
    label: "PDF",
  },
  doc: {
    cover:
      "bg-gradient-to-br from-purple-300/50 via-violet-200/40 to-indigo-100/30 dark:from-purple-900/60 dark:via-violet-950/50 dark:to-indigo-950/40",
    color: "text-purple-500",
    Icon: FileTextIcon,
    label: "Dokumen",
  },
  slides: {
    cover:
      "bg-gradient-to-br from-amber-300/50 via-orange-200/40 to-yellow-100/30 dark:from-amber-900/60 dark:via-orange-950/50 dark:to-yellow-950/40",
    color: "text-amber-500",
    Icon: PresentationIcon,
    label: "Slaid",
  },
  sheets: {
    cover:
      "bg-gradient-to-br from-green-300/50 via-emerald-200/40 to-lime-100/30 dark:from-green-900/60 dark:via-emerald-950/50 dark:to-lime-950/40",
    color: "text-green-600",
    Icon: TableIcon,
    label: "Hamparan",
  },
  images: {
    cover:
      "bg-gradient-to-br from-pink-300/50 via-fuchsia-200/40 to-purple-100/30 dark:from-pink-900/60 dark:via-fuchsia-950/50 dark:to-purple-950/40",
    color: "text-pink-500",
    Icon: ImageIcon,
    label: "Imej",
  },
  youtube: {
    cover:
      "bg-gradient-to-br from-red-300/50 via-rose-200/40 to-red-100/30 dark:from-red-900/60 dark:via-rose-950/50 dark:to-red-950/40",
    color: "text-red-600",
    Icon: SmartDisplayIcon,
    label: "YouTube",
  },
  other: {
    cover:
      "bg-gradient-to-br from-slate-300/50 via-slate-200/40 to-slate-100/30 dark:from-slate-800/60 dark:via-slate-900/50 dark:to-slate-950/40",
    color: "text-slate-500",
    Icon: DraftIcon,
    label: "Lain-lain",
  },
};

const TABS: {
  id: "all" | SourceKind;
  labelKey:
    | "sources.tab.all"
    | "sources.tab.pdf"
    | "sources.tab.doc"
    | "sources.tab.slides"
    | "sources.tab.sheets"
    | "sources.tab.images"
    | "sources.tab.youtube";
  Icon: typeof DraftIcon;
}[] = [
  { id: "all", labelKey: "sources.tab.all", Icon: LibraryBooksIcon },
  { id: "pdf", labelKey: "sources.tab.pdf", Icon: PictureAsPdfIcon },
  { id: "doc", labelKey: "sources.tab.doc", Icon: FileTextIcon },
  { id: "slides", labelKey: "sources.tab.slides", Icon: PresentationIcon },
  { id: "sheets", labelKey: "sources.tab.sheets", Icon: TableIcon },
  { id: "images", labelKey: "sources.tab.images", Icon: ImageIcon },
  { id: "youtube", labelKey: "sources.tab.youtube", Icon: SmartDisplayIcon },
];

const ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.gif,.svg,.txt,.md";

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const SourcesPage: FC = () => {
  const t = useT();
  const [rows, setRows] = useState<SourceRow[] | null>(null);
  const [tab, setTab] = useState<"all" | SourceKind>("all");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SourceRow | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoSaving, setVideoSaving] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetch("/api/sources", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sources?: SourceRow[] } | null) =>
        setRows(data?.sources ?? []),
      )
      .catch(() => setRows([]));
  };

  useEffect(load, []);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      for (const file of Array.from(files)) form.append("files", file);
      const res = await fetch("/api/sources", { method: "POST", body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Muat naik gagal. Cuba lagi.");
      }
      load();
    } catch {
      setError("Muat naik gagal. Cuba lagi.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (row: SourceRow) => {
    setRows((prev) => (prev ?? []).filter((item) => item.id !== row.id));
    await fetch(`/api/sources/${row.id}`, { method: "DELETE" }).catch(() => {});
  };

  const addVideo = async () => {
    if (!videoUrl.trim() || videoSaving) return;
    setVideoSaving(true);
    setVideoError(null);
    try {
      const res = await fetch("/api/sources/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl, title: videoTitle }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setVideoError(data?.error ?? "Gagal menambah video.");
        return;
      }
      setVideoOpen(false);
      setVideoUrl("");
      setVideoTitle("");
      setTab("youtube");
      load();
    } catch {
      setVideoError("Gagal menambah video.");
    } finally {
      setVideoSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((row) => {
      if (tab !== "all" && row.kind !== tab) return false;
      if (q && !row.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, tab, query]);

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-300">
              <LibraryBooksIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {t("sources.title")}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Sumber pengajaran anda — muat naik PDF, dokumen, slaid, hamparan
                dan imej untuk digunakan dengan AI.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 max-sm:w-full">
            <div className="relative max-sm:w-full">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("sources.searchPlaceholder")}
                aria-label="Search"
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 w-56 rounded-full border pr-3 pl-9 text-sm outline-none focus-visible:ring-2 max-sm:w-full md:w-64"
              />
            </div>
            {tab === "youtube" ? (
              <Button
                onClick={() => setVideoOpen(true)}
                className="h-9 gap-2 rounded-full px-4 text-sm"
              >
                <SmartDisplayIcon className="size-4" />
                Tambah video
              </Button>
            ) : (
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="h-9 gap-2 rounded-full px-4 text-sm"
              >
                {uploading ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <UploadFileIcon className="size-4" />
                )}
                {uploading ? t("sources.uploading") : t("sources.upload")}
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => void upload(event.target.files)}
        />

        {error && (
          <p className="border-destructive/30 bg-destructive/10 text-destructive mt-4 rounded-xl border px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="scrollbar-subtle -mx-1 flex max-w-full items-center gap-1.5 overflow-x-auto px-1 pb-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors sm:px-4",
                  tab === item.id
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <item.Icon className="size-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t(item.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {rows === null ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="bg-muted/30 h-64 animate-pulse rounded-3xl"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-border/60 mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
            <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
              <LibraryBooksIcon className="text-muted-foreground size-5" />
            </span>
            <p className="text-sm font-medium">
              {query ? "Tiada sumber sepadan" : "Belum ada sumber"}
            </p>
            <p className="text-muted-foreground max-w-md text-sm">
              {query ? "Cuba kata kunci lain." : t("sources.subtitle")}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((row) => {
              const theme = KIND_THEME[row.kind];
              return (
                <div
                  key={row.id}
                  onClick={() => window.open(row.url, "_blank")}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-3xl border border-white/60 p-2.5 transition-shadow hover:shadow-lg dark:border-white/10",
                    theme.cover,
                  )}
                >
                  <div className="relative z-10 flex items-center gap-1.5">
                    <span className="text-foreground flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium backdrop-blur dark:bg-black/30">
                      <theme.Icon className={cn("size-3.5", theme.color)} />
                      {row.ext.toUpperCase()}
                    </span>
                    <div
                      onClick={(event) => event.stopPropagation()}
                      className="ml-auto flex items-center justify-center rounded-full bg-white/70 opacity-0 backdrop-blur transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 dark:bg-black/30 [&_button]:size-6"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label="Pilihan sumber"
                          className="text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => window.open(row.url, "_blank")}
                          >
                            <DownloadIcon className="size-4" />
                            Muat turun
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setPendingDelete(row)}
                            className="text-destructive"
                          >
                            <Trash2Icon className="size-4" />
                            Padam
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="relative flex h-28 items-center justify-center overflow-hidden sm:h-32">
                    {row.kind === "youtube" && row.thumb ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.thumb}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
                            <PlayIcon className="size-6" />
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        <div
                          aria-hidden="true"
                          className="absolute -top-6 -left-6 size-24 rounded-full bg-white/40 blur-2xl dark:bg-white/10"
                        />
                        <theme.Icon
                          className={cn(
                            "relative size-16 opacity-90",
                            theme.color,
                          )}
                        />
                      </>
                    )}
                  </div>

                  <div className="relative z-10 rounded-2xl bg-white/75 p-3 backdrop-blur-md dark:bg-black/35">
                    <p
                      className="truncate text-sm font-semibold"
                      title={row.title}
                    >
                      {row.title}
                    </p>
                    <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
                      <theme.Icon className="size-3.5" />
                      {theme.label}
                      {row.kind === "youtube"
                        ? " · "
                        : ` · ${formatSize(row.size)} · `}
                      {formatDate(row.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() =>
                tab === "youtube"
                  ? setVideoOpen(true)
                  : fileRef.current?.click()
              }
              className="border-border/60 hover:bg-muted/40 flex min-h-[248px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center transition-colors"
            >
              <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
                <PlusIcon className="size-5" />
              </span>
              <span className="text-sm font-semibold">
                {tab === "youtube" ? t("sources.addVideo") : t("sources.add")}
              </span>
              <span className="text-muted-foreground max-w-44 text-xs">
                {tab === "youtube"
                  ? "Tampal pautan YouTube untuk dijadikan sumber pengajaran"
                  : "Muat naik PDF, DOCX, XLSX, PPTX, imej dan lagi (maks 25 MB)"}
              </span>
            </button>
          </div>
        )}
      </div>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah video YouTube</DialogTitle>
            <DialogDescription>
              Tampal pautan video untuk dijadikan sumber pengajaran.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("sources.videoUrl")}</span>
              <input
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">
                Tajuk <span className="text-muted-foreground">(pilihan)</span>
              </span>
              <input
                value={videoTitle}
                onChange={(event) => setVideoTitle(event.target.value)}
                placeholder={t("sources.youtubeAuto")}
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            {videoError && (
              <p className="text-destructive text-sm">{videoError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => void addVideo()}
              disabled={videoSaving || !videoUrl.trim()}
              className="gap-2"
            >
              {videoSaving && <Loader2Icon className="size-4 animate-spin" />}
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Padam sumber?</DialogTitle>
            <DialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; akan dipadam secara kekal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Batal
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                if (pendingDelete) void remove(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Padam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
