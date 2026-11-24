"use client";

import { useEffect, useMemo, useRef, useState, type FC } from "react";
import {
  AddIcon,
  BookOpenIcon,
  CheckIcon,
  LayersIcon,
  ChevronDownIcon,
  FileTextIcon,
  LayoutGridIcon,
  LinkIcon,
  ListIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlayIcon,
  PresentationIcon,
  SearchIcon,
  SmartDisplayIcon,
  Trash2Icon,
  UploadFileIcon,
} from "@/components/icons";
import { Database as StorageIcon } from "lucide-react";
import { SpaceArtwork } from "./space-artwork";
import s from "./space-study.module.css";
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
import { useI18n } from "@/lib/i18n";
import { FilterSelect } from "@/components/ui/filter-select";
import { levelLabel } from "@/lib/textbooks/levels";
import { cn } from "@/lib/utils";

/**
 * The space's sources browser: category chips with counts, a storage meter,
 * add-source menu (file / YouTube / link) and cover cards. Owner manages;
 * members browse read-only and can still open everything.
 */

type SourceRow = {
  id: string;
  kind: "textbook" | "upload";
  refId: string;
  title: string;
  subject?: string | null;
  level?: string | null;
  ext?: string | null;
};

type Upload = {
  id: string;
  title: string;
  ext: string;
  kind: string;
  size: number;
  url: string;
  thumb?: string;
};

type Textbook = {
  id: number;
  title: string;
  subject: string;
  level: string;
  levelOrder: number;
  coverUrl: string;
  fileUrl: string;
};

type Category =
  | "all"
  | "textbook"
  | "slides"
  | "note"
  | "video"
  | "link"
  | "other";

type Card = {
  key: string;
  category: Exclude<Category, "all">;
  title: string;
  meta: string;
  href: string | null;
  cover: string | null;
  thumb: string | null;
  refIds: string[];
};

const CATEGORY_STYLE: Record<
  Exclude<Category, "all">,
  { cover: string; chip: string }
> = {
  textbook: {
    cover:
      "bg-gradient-to-br from-[#bfeae0] via-[#d8f3ec] to-[#eefaf6] dark:from-[#0d3f3a] dark:via-[#0f4f4a] dark:to-[#12312e]",
    chip: "bg-[#d8f3ec] text-[#0f6f63] dark:bg-[#12312e] dark:text-[#8fd9c8]",
  },
  slides: {
    cover:
      "bg-gradient-to-br from-[#e3d9fb] via-[#ece5fd] to-[#f6f1ff] dark:from-[#2c2347] dark:via-[#332a52] dark:to-[#241d3b]",
    chip: "bg-[#ece5fd] text-[#6b4fce] dark:bg-[#332a52] dark:text-[#c9b8f5]",
  },
  note: {
    cover: "bg-amber-50 dark:bg-amber-950",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
  },
  video: {
    cover:
      "bg-gradient-to-br from-[#fbdcdf] via-[#fde8ea] to-[#fef3f4] dark:from-[#4a2129] dark:via-[#572831] dark:to-[#3a1b22]",
    chip: "bg-[#fde8ea] text-[#c2405a] dark:bg-[#572831] dark:text-[#f2a3b1]",
  },
  link: {
    cover:
      "bg-gradient-to-br from-[#cdeef0] via-[#e0f6f7] to-[#f0fbfc] dark:from-[#0e3d42] dark:via-[#11484e] dark:to-[#0c3238]",
    chip: "bg-[#e0f6f7] text-[#177e89] dark:bg-[#11484e] dark:text-[#8fd9c8]",
  },
  other: {
    cover:
      "bg-gradient-to-br from-[#d6e4fb] via-[#e5eefc] to-[#f2f7fe] dark:from-[#1d3050] dark:via-[#22375c] dark:to-[#182741]",
    chip: "bg-[#e5eefc] text-[#3b6fd4] dark:bg-[#22375c] dark:text-[#a9c4f5]",
  },
};

const CategoryGlyph: FC<{ category: Exclude<Category, "all"> }> = ({
  category,
}) => {
  const common = "size-10 drop-shadow-sm";
  if (category === "textbook")
    return <BookOpenIcon className={cn(common, "text-[#1b8a7f]")} />;
  if (category === "slides")
    return <PresentationIcon className={cn(common, "text-[#6b4fce]")} />;
  if (category === "video")
    return <PlayIcon className={cn(common, "text-[#c2405a]")} />;
  if (category === "link")
    return <LinkIcon className={cn(common, "text-[#177e89]")} />;
  return <FileTextIcon className={cn(common, "text-[#3b6fd4]")} />;
};

const categoryForUpload = (ext: string): Exclude<Category, "all"> => {
  if (ext === "youtube") return "video";
  if (ext === "link") return "link";
  if (ext === "ppt" || ext === "pptx") return "slides";
  if (["pdf", "doc", "docx", "txt", "md", "rtf"].includes(ext.toLowerCase()))
    return "note";
  return "other";
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const SpaceSourcesPanel: FC<{
  spaceId: string;
  level: string;
  readOnly?: boolean;
}> = ({ spaceId, readOnly = false }) => {
  const { t } = useI18n();
  const [rows, setRows] = useState<SourceRow[] | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [books, setBooks] = useState<Textbook[]>([]);
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState("");
  const [bookLevel, setBookLevel] = useState(0);
  const [bookBusy, setBookBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const [spaceSources, allSources, allBooks] = await Promise.all([
        fetch(`/api/spaces/${spaceId}/sources`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
        fetch("/api/sources")
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
        fetch("/api/textbooks")
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ]);
      setRows(
        (spaceSources as { sources?: SourceRow[] } | null)?.sources ?? [],
      );
      setUploads((allSources as { sources?: Upload[] } | null)?.sources ?? []);
      setBooks(
        (allBooks as { textbooks?: Textbook[] } | null)?.textbooks ?? [],
      );
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  const bookById = useMemo(() => {
    const map = new Map<number, Textbook>();
    for (const book of books) map.set(Number(book.id), book);
    return map;
  }, [books]);

  const uploadById = useMemo(() => {
    const map = new Map<string, Upload>();
    for (const upload of uploads) map.set(upload.id, upload);
    return map;
  }, [uploads]);

  const cards = useMemo<Card[]>(() => {
    const out: Card[] = [];
    const groups = new Map<
      string,
      { refIds: string[]; firstBook?: Textbook }
    >();
    for (const row of rows ?? []) {
      if (row.kind !== "textbook") continue;
      const subject = row.subject ?? row.title;
      const group = groups.get(subject) ?? { refIds: [] };
      group.refIds.push(row.refId);
      if (!group.firstBook) {
        group.firstBook = bookById.get(Number(row.refId));
      }
      groups.set(subject, group);
    }
    for (const [subject, group] of groups) {
      out.push({
        key: `tb:${subject}`,
        category: "textbook",
        title: t("spaceDetail.textbookCard", { subject }),
        meta: t("spaceSources.chapters", { count: group.refIds.length }),
        href: group.firstBook?.fileUrl ?? null,
        cover: group.firstBook?.coverUrl ?? null,
        thumb: null,
        refIds: group.refIds,
      });
    }
    for (const row of rows ?? []) {
      if (row.kind !== "upload") continue;
      const upload = uploadById.get(row.refId);
      if (!upload) continue;
      const cardCategory = categoryForUpload(upload.ext);
      const meta =
        cardCategory === "video"
          ? "YouTube"
          : cardCategory === "link"
            ? domainOf(upload.url)
            : `${upload.ext.toUpperCase()} · ${formatSize(upload.size)}`;
      out.push({
        key: `up:${upload.id}`,
        category: cardCategory,
        title: upload.title,
        meta,
        href: upload.url,
        cover: null,
        thumb: upload.thumb ?? null,
        refIds: [upload.id],
      });
    }
    return out;
  }, [rows, bookById, uploadById, t]);

  const counts = useMemo(() => {
    const byCategory: Record<Category, number> = {
      all: cards.length,
      textbook: 0,
      slides: 0,
      note: 0,
      video: 0,
      link: 0,
      other: 0,
    };
    for (const card of cards) byCategory[card.category] += 1;
    return byCategory;
  }, [cards]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards
      .filter((card) => category === "all" || card.category === category)
      .filter((card) => !needle || card.title.toLowerCase().includes(needle));
  }, [cards, category, query]);

  const attachedBookIds = useMemo(
    () =>
      new Set(
        (rows ?? [])
          .filter((row) => row.kind === "textbook")
          .map((row) => row.refId),
      ),
    [rows],
  );

  const bookList = useMemo(() => {
    const needle = bookQuery.trim().toLowerCase();
    return books
      .filter((book) => bookLevel === 0 || book.levelOrder === bookLevel)
      .filter(
        (book) =>
          !needle ||
          book.title.toLowerCase().includes(needle) ||
          book.subject.toLowerCase().includes(needle),
      )
      .slice(0, 80);
  }, [books, bookLevel, bookQuery]);

  const attach = async (refIds: string[]) => {
    for (const refId of refIds) {
      await fetch(`/api/spaces/${spaceId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "upload", refId }),
      }).catch(() => {});
    }
    await load();
  };

  const addBook = async (bookId: string) => {
    setBookBusy(bookId);
    try {
      await fetch(`/api/spaces/${spaceId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "textbook", refId: bookId }),
      });
      await load();
    } finally {
      setBookBusy(null);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      for (const file of Array.from(files)) form.append("files", file);
      const res = await fetch("/api/sources", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as {
        ids?: string[];
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? t("sources.uploadFailed"));
      } else if (data?.ids?.length) {
        await attach(data.ids);
      }
    } catch {
      setError(t("sources.uploadFailed"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addVideo = async () => {
    if (!videoUrl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sources/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl, title: videoTitle }),
      });
      const data = (await res.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.id) {
        setError(data?.error ?? t("sources.videoFailed"));
        return;
      }
      await attach([data.id]);
      setVideoOpen(false);
      setVideoUrl("");
      setVideoTitle("");
    } finally {
      setBusy(false);
    }
  };

  const addLink = async () => {
    if (!linkUrl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sources/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl, title: linkTitle }),
      });
      const data = (await res.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.id) {
        setError(data?.error ?? t("spaceDetail.invalidUrl"));
        return;
      }
      await attach([data.id]);
      setLinkOpen(false);
      setLinkUrl("");
      setLinkTitle("");
    } finally {
      setBusy(false);
    }
  };

  const removeCard = async (card: Card) => {
    setBusy(true);
    await fetch(`/api/spaces/${spaceId}/sources`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refIds: card.refIds }),
    }).catch(() => {});
    await load();
    setBusy(false);
  };

  const categoryTabs: {
    id: Category;
    label: string;
    Icon: typeof FileTextIcon;
  }[] = [
    { id: "all", label: t("spaceDetail.cat.all"), Icon: LayoutGridIcon },
    {
      id: "textbook",
      label: t("spaceDetail.cat.textbook"),
      Icon: BookOpenIcon,
    },
    {
      id: "slides",
      label: t("spaceDetail.cat.slides"),
      Icon: PresentationIcon,
    },
    { id: "note", label: t("spaceDetail.cat.note"), Icon: FileTextIcon },
    { id: "video", label: t("spaceDetail.cat.video"), Icon: SmartDisplayIcon },
    { id: "link", label: t("spaceDetail.cat.link"), Icon: LinkIcon },
    { id: "other", label: t("spaceDetail.cat.other"), Icon: FileTextIcon },
  ];

  return (
    <section className={s.sources}>
      <div className={s.sourceHeader}>
        <div className={s.sourceHeading}>
          <span className={s.sectionIcon}>
            <LayersIcon />
          </span>
          <div>
            <h2>{t("sources.title")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("spaceDetail.sourcesSubtitle")}
            </p>
          </div>
        </div>
        <div className={s.sourceActions}>
          {!readOnly ? (
            <>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => void uploadFiles(event.target.files)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button className={s.addButton} disabled={busy} />}
                >
                  {busy ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <AddIcon className="size-4" />
                  )}
                  {t("spaceDetail.addSource")}
                  <ChevronDownIcon className="size-3.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() => fileRef.current?.click()}
                    className="gap-2"
                  >
                    <UploadFileIcon className="size-4" />
                    {t("spaceDetail.uploadFile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setBookOpen(true)}
                    className="gap-2"
                  >
                    <BookOpenIcon className="size-4" />
                    {t("spaceDetail.addTextbook")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setVideoOpen(true)}
                    className="gap-2"
                  >
                    <SmartDisplayIcon className="size-4" />
                    {t("spaceDetail.addVideo")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLinkOpen(true)}
                    className="gap-2"
                  >
                    <LinkIcon className="size-4" />
                    {t("spaceDetail.addLink")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className={s.toolbar}>
        <div className={s.filters}>
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              aria-pressed={category === tab.id}
              className={s.filter}
            >
              <tab.Icon className="size-3.5" />
              {tab.label}
              <span className={s.filterCount}>{counts[tab.id]}</span>
            </button>
          ))}
        </div>
        <div className={s.viewTools}>
          <label className={s.search}>
            <SearchIcon className="text-muted-foreground size-4 shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t("spaceDetail.search")}
              placeholder={t("spaceDetail.search")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <div className={s.viewSwitch}>
            <button
              type="button"
              aria-label={t("spaceDetail.grid")}
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
            >
              <LayoutGridIcon className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t("spaceDetail.list")}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              <ListIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {rows === null ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          {t("common.loading")}
        </div>
      ) : visible.length === 0 ? (
        <div className={s.empty}>
          {cards.length === 0
            ? t("spaceDetail.empty")
            : t("spaceDetail.emptyFilter")}
        </div>
      ) : view === "grid" ? (
        <div className={s.grid}>
          {visible.map((card) => {
            const Glyph =
              categoryTabs.find((tab) => tab.id === card.category)?.Icon ??
              FileTextIcon;
            return (
              <article
                key={card.key}
                className={s.card}
                data-category={card.category}
              >
                <div className={s.cardCover}>
                  <button
                    type="button"
                    className={s.coverLink}
                    aria-label={`${t("common.open")}: ${card.title}`}
                    disabled={!card.href}
                    onClick={() =>
                      card.href &&
                      window.open(card.href, "_blank", "noopener,noreferrer")
                    }
                  >
                    <SpaceArtwork kind={card.category} />
                  </button>
                  <div className={s.cardTop}>
                    <span className={s.categoryChip}>
                      <Glyph />
                      {t(`spaceDetail.cat.${card.category}` as const)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={t("spaceDetail.moreActions")}
                        className={s.cardMenu}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {card.href ? (
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(card.href ?? "", "_blank")
                            }
                          >
                            <LinkIcon className="size-4" />
                            {t("common.open")}
                          </DropdownMenuItem>
                        ) : null}
                        {!readOnly ? (
                          <>
                            {card.href ? <DropdownMenuSeparator /> : null}
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => void removeCard(card)}
                            >
                              <Trash2Icon className="size-4" />
                              {t("spaceDetail.remove")}
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className={s.cardBody}>
                  <button
                    type="button"
                    onClick={() =>
                      card.href && window.open(card.href, "_blank")
                    }
                    className={s.cardTitle}
                  >
                    {card.title}
                  </button>
                  <span className={s.cardMeta}>
                    <Glyph />
                    <span>{card.meta}</span>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-2xl border">
          <div className="divide-y">
            {visible.map((card) => {
              const style = CATEGORY_STYLE[card.category];
              return (
                <div
                  key={card.key}
                  className="hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5"
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      style.cover,
                    )}
                  >
                    <CategoryGlyph category={card.category} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() =>
                        card.href && window.open(card.href, "_blank")
                      }
                      className="block w-full truncate text-left text-sm font-medium hover:underline"
                    >
                      {card.title}
                    </button>
                    <p className="text-muted-foreground truncate text-xs">
                      {t(`spaceDetail.cat.${card.category}` as const)} ·{" "}
                      {card.meta}
                    </p>
                  </div>
                  {!readOnly ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("spaceDetail.remove")}
                      className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                      disabled={busy}
                      onClick={() => void removeCard(card)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("spaceDetail.addTextbook")}</DialogTitle>
            <DialogDescription>
              {t("spaceDetail.textbookBody")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <label className="border-border/60 bg-background focus-within:ring-ring/40 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 focus-within:ring-2">
              <SearchIcon className="text-muted-foreground size-4 shrink-0" />
              <input
                value={bookQuery}
                onChange={(event) => setBookQuery(event.target.value)}
                placeholder={t("spaceDetail.textbookSearch")}
                className="w-full min-w-0 bg-transparent text-sm outline-none"
              />
            </label>
            <FilterSelect
              value={String(bookLevel)}
              onValueChange={(value) => setBookLevel(Number(value))}
              ariaLabel="Tahap"
              options={[
                { value: "0", label: t("books.all") },
                ...Array.from({ length: 11 }, (_, index) => ({
                  value: String(index + 1),
                  label: levelLabel(index + 1),
                })),
              ]}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {bookList.map((book) => {
              const added = attachedBookIds.has(String(book.id));
              return (
                <div
                  key={book.id}
                  className="hover:bg-muted/40 flex items-center gap-3 rounded-xl px-2 py-2"
                >
                  <span className="bg-muted relative block h-14 w-11 shrink-0 overflow-hidden rounded-md border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={book.coverUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {book.subject} · {book.level}
                    </p>
                  </div>
                  {added ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckIcon className="size-4" />
                      {t("spaceDetail.textbookAdded")}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 rounded-full px-3 text-xs"
                      disabled={bookBusy === String(book.id)}
                      onClick={() => void addBook(String(book.id))}
                    >
                      {bookBusy === String(book.id) ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        t("spaceDetail.textbookAdd")
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
            {bookList.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                {t("spaceDetail.textbookEmpty")}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookOpen(false)}>
              {t("spaceDetail.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("spaceDetail.addVideo")}</DialogTitle>
            <DialogDescription>{t("sources.youtubeAuto")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("sources.videoUrl")}</span>
              <input
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">
                {t("spaces.name")}{" "}
                <span className="text-muted-foreground">
                  {t("spaces.optional")}
                </span>
              </span>
              <input
                value={videoTitle}
                onChange={(event) => setVideoTitle(event.target.value)}
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void addVideo()}
              disabled={busy || !videoUrl.trim()}
            >
              {t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("spaceDetail.addLink")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("spaceDetail.linkUrl")}</span>
              <input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://wordwall.net/…"
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">
                {t("spaceDetail.linkTitle")}{" "}
                <span className="text-muted-foreground">
                  {t("spaces.optional")}
                </span>
              </span>
              <input
                value={linkTitle}
                onChange={(event) => setLinkTitle(event.target.value)}
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void addLink()}
              disabled={busy || !linkUrl.trim()}
            >
              {t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
