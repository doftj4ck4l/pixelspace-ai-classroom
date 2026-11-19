"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAui } from "@assistant-ui/react";
import {
  AlignLeftIcon,
  ChartColumnIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleHelpIcon,
  DownloadIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PinIcon,
  PinOffIcon,
  PlugIcon,
  PlusIcon,
  PodcastIcon,
  PresentationIcon,
  SearchIcon,
  SparklesIcon,
  StarIcon,
  UsersIcon,
  StickyNoteIcon,
  TableIcon,
  Trash2Icon,
  UploadIcon,
  WandSparklesIcon,
  WaypointsIcon,
  type LucideIcon,
} from "lucide-react";
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
import { useSidebarNav } from "@/components/assistant-ui/clone-thread-shell";
import {
  CreateDialog,
  type CreateDialogInput,
} from "@/components/assistant-ui/create-dialog";
import { FlashcardViewer } from "@/components/assistant-ui/flashcard-viewer";
import {
  accentTheme,
  coverEmoji,
  type FlashcardSpec,
} from "@/components/assistant-ui/flashcard-deck";
import {
  type GeneratedContent,
  type GenerationArtifact,
  type GenerationSource,
} from "@/components/assistant-ui/harness";
import {
  NewPresentationDialog,
  SlideEditor,
  TEMPLATES,
  blankSlide,
  type SlideData,
} from "@/components/assistant-ui/slide-editor";
import { SlidePreview } from "@/components/assistant-ui/slide-preview";
import { cn } from "@/lib/utils";

export type ModuleKind =
  | "flashcards"
  | "quizzes"
  | "mindmaps"
  | "slides"
  | "reports"
  | "infographics"
  | "podcasts"
  | "notes"
  | "transformations";

type DocType =
  | ModuleKind
  | "page"
  | "pdf"
  | "doc"
  | "site"
  | "image"
  | "folder"
  | "space";

type Doc = {
  id: string;
  title: string;
  type: DocType;
  pinned: boolean;
  favorite: boolean;
  slides?: SlideData[];
  content?: GeneratedContent;
  sources?: GenerationSource[];
  artifacts?: GenerationArtifact[];
  /** Present on read-only cards for files the agent shared in chat. */
  source?: "chat";
  url?: string;
  artifactId?: string;
  /** Set on local slide copies created from a shared pptx. */
  originArtifactId?: string;
  /** Present on generative-UI deck artifacts (render_ui flashcards). */
  spec?: FlashcardSpec;
  /** Companion files (same base name) offered inside the slide editor. */
  downloads?: { name: string; url: string }[];
};

type SharedArtifact = {
  id: string;
  title: string;
  type: string;
  kind?: "file" | "spec";
  url?: string;
  spec?: unknown;
  pinned?: boolean;
  favorite?: boolean;
};

type DeckProgress = { knownCount: number; total: number };

const baseName = (name: string) => name.replace(/\.[^.]+$/, "").toLowerCase();

const TYPE_STYLES: Record<DocType, { Icon: LucideIcon; color: string }> = {
  flashcards: { Icon: LayersIcon, color: "text-amber-500" },
  quizzes: { Icon: CircleHelpIcon, color: "text-teal-600" },
  mindmaps: { Icon: WaypointsIcon, color: "text-violet-500" },
  slides: { Icon: PresentationIcon, color: "text-yellow-500" },
  reports: { Icon: FileTextIcon, color: "text-purple-500" },
  infographics: { Icon: ChartColumnIcon, color: "text-pink-500" },
  podcasts: { Icon: PodcastIcon, color: "text-red-500" },
  notes: { Icon: StickyNoteIcon, color: "text-green-600" },
  transformations: { Icon: WandSparklesIcon, color: "text-blue-500" },
  page: { Icon: FileTextIcon, color: "text-foreground" },
  pdf: { Icon: FileTextIcon, color: "text-red-500" },
  doc: { Icon: FileTextIcon, color: "text-blue-500" },
  site: { Icon: LayoutGridIcon, color: "text-violet-500" },
  image: { Icon: ImageIcon, color: "text-pink-500" },
  folder: { Icon: FolderIcon, color: "text-muted-foreground" },
  space: { Icon: LayersIcon, color: "text-teal-600" },
};

const UNTITLED: Record<DocType, string> = {
  flashcards: "Untitled flashcards",
  quizzes: "Untitled quiz",
  mindmaps: "Untitled mind map",
  slides: "Untitled slide deck",
  reports: "Untitled report",
  infographics: "Untitled infographic",
  podcasts: "Untitled podcast",
  notes: "Untitled notes",
  transformations: "Untitled transformation",
  page: "Untitled page",
  pdf: "Untitled document",
  doc: "Untitled document",
  site: "Untitled site",
  image: "Untitled image",
  folder: "Untitled folder",
  space: "Untitled space",
};

const MODULE_TITLES: Record<ModuleKind | "all", string> = {
  all: "All",
  flashcards: "Flashcards",
  quizzes: "Quizzes",
  mindmaps: "Mind Maps",
  slides: "Slides",
  reports: "Reports",
  infographics: "Infographics",
  podcasts: "Podcasts",
  notes: "Notes",
  transformations: "Transformations",
};

/** Header block per module: glyph, tint and one-line subtitle. */
const MODULE_HEADER: Record<
  ModuleKind | "all",
  { Icon: LucideIcon; color: string; subtitle: string }
> = {
  all: {
    Icon: LayoutGridIcon,
    color: "text-foreground",
    subtitle:
      "Semua hasil kerja anda dalam satu tempat — kad imbas, kuiz, slaid, laporan dan banyak lagi.",
  },
  flashcards: {
    Icon: LayersIcon,
    color: "text-amber-500",
    subtitle: "Buat, ulang kaji dan kuasai topik dengan kad imbas pintar.",
  },
  quizzes: {
    Icon: CircleHelpIcon,
    color: "text-teal-600",
    subtitle:
      "Uji kefahaman dengan kuiz pintar — pilihan, benar/palsu, isi tempat kosong dan soalan terbuka.",
  },
  mindmaps: {
    Icon: WaypointsIcon,
    color: "text-violet-500",
    subtitle: "Susun idea dan konsep dalam peta minda yang jelas.",
  },
  slides: {
    Icon: PresentationIcon,
    color: "text-yellow-500",
    subtitle: "Hasilkan slaid pembentangan yang kemas dengan bantuan AI.",
  },
  reports: {
    Icon: FileTextIcon,
    color: "text-purple-500",
    subtitle: "Tulis laporan yang tersusun dan mudah difahami.",
  },
  infographics: {
    Icon: ChartColumnIcon,
    color: "text-pink-500",
    subtitle: "Tukar idea menjadi infografik yang menarik.",
  },
  podcasts: {
    Icon: PodcastIcon,
    color: "text-red-500",
    subtitle: "Hasilkan audio pembelajaran daripada topik anda.",
  },
  notes: {
    Icon: StickyNoteIcon,
    color: "text-green-600",
    subtitle: "Catatan ringkas untuk rujukan pantas.",
  },
  transformations: {
    Icon: WandSparklesIcon,
    color: "text-blue-500",
    subtitle: "Ubah kandungan sedia ada menjadi format baharu.",
  },
};

const CREATE_MODULE_ITEMS: {
  type: DocType;
  label: string;
  Icon: LucideIcon;
}[] = [
  { type: "flashcards", label: "Flashcards", Icon: LayersIcon },
  { type: "quizzes", label: "Quiz", Icon: CircleHelpIcon },
  { type: "mindmaps", label: "Mind Map", Icon: WaypointsIcon },
  { type: "slides", label: "Slide Deck", Icon: PresentationIcon },
  { type: "reports", label: "Report", Icon: FileTextIcon },
  { type: "infographics", label: "Infographic", Icon: ChartColumnIcon },
  { type: "podcasts", label: "Podcast", Icon: PodcastIcon },
  { type: "notes", label: "Notes", Icon: StickyNoteIcon },
  {
    type: "transformations",
    label: "Transformation",
    Icon: WandSparklesIcon,
  },
];

const DocGlyph: FC<{ type: DocType; size?: "sm" | "lg" }> = ({
  type,
  size = "sm",
}) => {
  const { Icon, color } = TYPE_STYLES[type];
  return (
    <span className="flex shrink-0 flex-col items-center leading-none">
      <Icon
        className={cn(size === "sm" ? "size-4" : "size-12", color)}
        strokeWidth={1.5}
      />
      {type === "pdf" && (
        <span
          className={cn(
            "font-bold tracking-widest",
            color,
            size === "sm" ? "text-[5px]" : "text-[10px]",
          )}
        >
          PDF
        </span>
      )}
    </span>
  );
};

const SORT_OPTIONS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "az", label: "Name (A-Z)" },
  { id: "za", label: "Name (Z-A)" },
] as const;
type Sort = (typeof SORT_OPTIONS)[number]["id"];

const newDoc = (type: DocType, title?: string): Doc => ({
  id: crypto.randomUUID(),
  title: title ?? UNTITLED[type],
  type,
  pinned: false,
  favorite: false,
});

const typeFromFileName = (name: string): DocType => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return "image";
  return "doc";
};

const CreateMenu: FC<{
  onStartFromTemplate: () => void;
  onCreate: (type: DocType, title?: string) => void;
}> = ({ onStartFromTemplate, onCreate }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="bg-foreground text-background hover:bg-foreground/90 flex h-9 shrink-0 items-center gap-1 rounded-full px-4 text-sm font-medium transition-colors">
          Create
          <ChevronDownIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="bottom"
          className="max-h-96 min-w-56 overflow-y-auto"
        >
          <DropdownMenuItem onClick={onStartFromTemplate}>
            <LayoutDashboardIcon className="size-4" />
            Start from template
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {CREATE_MODULE_ITEMS.map(({ type, label, Icon }) => (
            <DropdownMenuItem key={type} onClick={() => onCreate(type)}>
              <Icon className="size-4" />
              {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <TableIcon className="size-4" />
            Sheet
            <span className="text-muted-foreground ml-auto pl-6 text-xs">
              Coming soon
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileRef.current?.click()}>
            <UploadIcon className="size-4" />
            Upload files
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <PlugIcon className="size-4" />
            Connect a plugin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          for (const file of Array.from(event.target.files ?? [])) {
            onCreate(typeFromFileName(file.name), file.name);
          }
          event.target.value = "";
        }}
      />
    </>
  );
};

const DocMenu: FC<{
  doc: Doc;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (doc: Doc) => void;
}> = ({ doc, onTogglePin, onToggleFavorite, onDelete }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      aria-label="Item options"
      className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
    >
      <MoreHorizontalIcon className="size-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" side="bottom">
      <DropdownMenuItem onClick={() => onTogglePin(doc.id)}>
        {doc.pinned ? (
          <PinOffIcon className="size-4" />
        ) : (
          <PinIcon className="size-4" />
        )}
        {doc.pinned ? "Unpin" : "Pin"}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onToggleFavorite(doc.id)}>
        <StarIcon
          className={cn(
            "size-4",
            doc.favorite && "fill-current text-amber-400",
          )}
        />
        {doc.favorite ? "Remove favorite" : "Favorite"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={() => onDelete(doc)}>
        <Trash2Icon className="size-4" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const deckInfoOf = (doc: Doc, progress: Record<string, DeckProgress>) => {
  const spec =
    doc.spec ??
    (doc.content?.kind === "flashcards"
      ? { cards: doc.content.cards }
      : undefined);
  const questions = (doc.spec as { questions?: unknown[] } | undefined)
    ?.questions;
  const items = spec?.cards ?? questions ?? [];
  const row = progress[doc.artifactId ?? doc.id];
  const total = row?.total || items.length;
  return { total, known: row?.knownCount ?? 0 };
};

/** Tinted covers for non-deck tiles, keyed by doc type. */
const FILE_TILE_COVER: Record<string, string> = {
  slides:
    "bg-gradient-to-br from-amber-300/50 via-orange-200/40 to-yellow-100/30 dark:from-amber-900/60 dark:via-orange-950/50 dark:to-yellow-950/40",
  reports:
    "bg-gradient-to-br from-purple-300/50 via-violet-200/40 to-indigo-100/30 dark:from-purple-900/60 dark:via-violet-950/50 dark:to-indigo-950/40",
  infographics:
    "bg-gradient-to-br from-pink-300/50 via-rose-200/40 to-fuchsia-100/30 dark:from-pink-900/60 dark:via-rose-950/50 dark:to-fuchsia-950/40",
  podcasts:
    "bg-gradient-to-br from-red-300/50 via-rose-200/40 to-orange-100/30 dark:from-red-900/60 dark:via-rose-950/50 dark:to-orange-950/40",
  notes:
    "bg-gradient-to-br from-green-300/50 via-emerald-200/40 to-lime-100/30 dark:from-green-900/60 dark:via-emerald-950/50 dark:to-lime-950/40",
  mindmaps:
    "bg-gradient-to-br from-violet-300/50 via-purple-200/40 to-fuchsia-100/30 dark:from-violet-900/60 dark:via-purple-950/50 dark:to-fuchsia-950/40",
  transformations:
    "bg-gradient-to-br from-blue-300/50 via-sky-200/40 to-cyan-100/30 dark:from-blue-900/60 dark:via-sky-950/50 dark:to-cyan-950/40",
  pdf: "bg-gradient-to-br from-red-300/50 via-rose-200/40 to-pink-100/30 dark:from-red-900/60 dark:via-rose-950/50 dark:to-pink-950/40",
  image:
    "bg-gradient-to-br from-pink-300/50 via-fuchsia-200/40 to-purple-100/30 dark:from-pink-900/60 dark:via-fuchsia-950/50 dark:to-purple-950/40",
  doc: "bg-gradient-to-br from-slate-300/50 via-slate-200/40 to-slate-100/30 dark:from-slate-800/60 dark:via-slate-900/50 dark:to-slate-950/40",
  page: "bg-gradient-to-br from-slate-300/50 via-slate-200/40 to-slate-100/30 dark:from-slate-800/60 dark:via-slate-900/50 dark:to-slate-950/40",
  folder:
    "bg-gradient-to-br from-slate-300/50 via-slate-200/40 to-slate-100/30 dark:from-slate-800/60 dark:via-slate-900/50 dark:to-slate-950/40",
  site: "bg-gradient-to-br from-violet-300/50 via-purple-200/40 to-indigo-100/30 dark:from-violet-900/60 dark:via-purple-950/50 dark:to-indigo-950/40",
  space:
    "bg-gradient-to-br from-teal-300/50 via-emerald-200/40 to-cyan-100/30 dark:from-teal-900/60 dark:via-emerald-950/50 dark:to-cyan-950/40",
};

/**
 * The unified gallery tile: decks and quizzes get their accent cover + emoji +
 * mastery bar; every other artifact gets a type-tinted cover with its glyph.
 */
const GalleryCard: FC<{
  doc: Doc;
  known: number;
  total: number;
  onOpen: () => void;
  menu: ReactNode;
}> = ({ doc, known, total, onOpen, menu }) => {
  const spec = doc.spec as { subject?: string; accent?: string } | undefined;
  const theme = accentTheme(spec?.accent);
  const isSpec = !!doc.spec;
  const typeStyle = TYPE_STYLES[doc.type];
  const pct = total > 0 ? Math.round((known / total) * 100) : 0;

  return (
    <div
      onClick={onOpen}
      className="group border-border/60 bg-card relative cursor-pointer overflow-hidden rounded-2xl border transition-shadow hover:shadow-md"
    >
      <div
        className={cn(
          "relative flex aspect-[16/9] items-center justify-center overflow-hidden",
          isSpec
            ? theme.cover
            : (FILE_TILE_COVER[doc.type] ?? FILE_TILE_COVER.doc),
        )}
      >
        <div
          aria-hidden="true"
          className="absolute -top-8 -left-8 size-28 rounded-full bg-white/40 blur-2xl dark:bg-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -right-10 -bottom-10 size-32 rounded-full bg-white/30 blur-3xl dark:bg-white/5"
        />
        {isSpec ? (
          <span className="relative text-5xl drop-shadow-sm select-none">
            {coverEmoji(doc.title, spec?.subject)}
          </span>
        ) : (
          <typeStyle.Icon
            className={cn("relative size-14 opacity-80", typeStyle.color)}
            strokeWidth={1.5}
          />
        )}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {doc.pinned && (
            <span className="bg-background/85 flex size-7 items-center justify-center rounded-full shadow-sm">
              <PinIcon className="size-3.5" />
            </span>
          )}
          {doc.favorite && (
            <span className="bg-background/85 flex size-7 items-center justify-center rounded-full shadow-sm">
              <StarIcon className="size-3.5 fill-current text-amber-400" />
            </span>
          )}
        </div>
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute top-2.5 right-2.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        >
          {menu}
        </div>
      </div>

      <div className="p-4">
        <p className="truncate text-base font-semibold" title={doc.title}>
          {doc.title}
        </p>
        <div className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
          {isSpec ? (
            <>
              {doc.type === "quizzes" ? (
                <CircleHelpIcon className="size-3.5" />
              ) : (
                <LayersIcon className="size-3.5" />
              )}
              {total} {doc.type === "quizzes" ? "soalan" : "kad"}
            </>
          ) : (
            <>
              <typeStyle.Icon className={cn("size-3.5", typeStyle.color)} />
              {MODULE_TITLES[doc.type as keyof typeof MODULE_TITLES] ??
                doc.type}
              {doc.source === "chat" && (
                <span className="bg-muted ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                  From chat
                </span>
              )}
            </>
          )}
        </div>
        {isSpec && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="bg-muted/70 h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className={cn("h-full transition-all", theme.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-muted-foreground text-xs font-medium tabular-nums">
              {pct}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const downloadSpecJson = (doc: Doc) => {
  if (!doc.spec) return;
  const blob = new Blob([JSON.stringify(doc.spec, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${doc.title || "flashcards"}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const SharedArtifactMenu: FC<{
  doc: Doc;
  siblings: { name: string; url: string }[];
  onDownload: (doc: Doc) => void;
  onRemove: (artifactId: string) => void;
  onSetFlags: (
    artifactId: string,
    flags: { pinned?: boolean; favorite?: boolean },
  ) => void;
}> = ({ doc, siblings, onDownload, onRemove, onSetFlags }) => {
  const others = siblings.filter((file) => file.url !== doc.url);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="File options"
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        <DropdownMenuItem
          onClick={() =>
            doc.artifactId &&
            onSetFlags(doc.artifactId, { pinned: !doc.pinned })
          }
        >
          {doc.pinned ? (
            <PinOffIcon className="size-4" />
          ) : (
            <PinIcon className="size-4" />
          )}
          {doc.pinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            doc.artifactId &&
            onSetFlags(doc.artifactId, { favorite: !doc.favorite })
          }
        >
          <StarIcon
            className={cn(
              "size-4",
              doc.favorite && "fill-current text-amber-400",
            )}
          />
          {doc.favorite ? "Remove favorite" : "Favorite"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => (doc.spec ? downloadSpecJson(doc) : onDownload(doc))}
        >
          <DownloadIcon className="size-4" />
          Download
        </DropdownMenuItem>
        {others.map((file) => (
          <DropdownMenuItem
            key={file.url}
            onClick={() => window.open(file.url, "_blank")}
          >
            <DownloadIcon className="size-4" />
            Download {file.name.split(".").pop()?.toUpperCase() ?? file.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => doc.artifactId && onRemove(doc.artifactId)}
        >
          <Trash2Icon className="size-4" />
          Remove from gallery
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ALL_TABS = ["Suggested", "Favorites", "Your items", "Shared with you"];
const MODULE_TABS = ["All", "Pinned", "Favorites", "Shared with you"];

export const SpaceGallery: FC<{ mode: "all" | ModuleKind }> = ({ mode }) => {
  const { setSection, setView } = useSidebarNav();
  const aui = useAui();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [tab, setTab] = useState<string>(mode === "all" ? "Suggested" : "All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [sharedArtifacts, setSharedArtifacts] = useState<SharedArtifact[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, DeckProgress>>(
    {},
  );
  const [showNewPresentation, setShowNewPresentation] = useState(false);
  const [createKind, setCreateKind] = useState<ModuleKind | null>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data: { docs?: Doc[] }) => {
        if (!cancelled) setDocs(data.docs ?? []);
      })
      .catch(() => {
        if (!cancelled) setDocs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pi/artifacts")
      .then((res) => res.json())
      .then((data: { artifacts?: SharedArtifact[] }) => {
        if (!cancelled) setSharedArtifacts(data.artifacts ?? []);
      })
      .catch(() => {});
    Promise.all([
      fetch("/api/decks/progress")
        .then((res) => res.json())
        .catch(() => ({})),
      fetch("/api/quizzes/progress")
        .then((res) => res.json())
        .catch(() => ({})),
    ])
      .then(
        ([decks, quizzes]: [
          { progress?: (DeckProgress & { deckId: string })[] },
          {
            progress?: {
              quizId: string;
              correctCount: number;
              total: number;
            }[];
          },
        ]) => {
          if (cancelled) return;
          const map: Record<string, DeckProgress> = {};
          for (const row of decks.progress ?? []) {
            map[row.deckId] = { knownCount: row.knownCount, total: row.total };
          }
          for (const row of quizzes.progress ?? []) {
            map[row.quizId] = {
              knownCount: row.correctCount,
              total: row.total,
            };
          }
          setProgressMap(map);
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const artifactDocs = useMemo<Doc[]>(
    () =>
      sharedArtifacts.map((artifact) => ({
        id: artifact.id,
        title: artifact.title,
        type: (artifact.type === "other" ? "doc" : artifact.type) as DocType,
        pinned: artifact.pinned ?? false,
        favorite: artifact.favorite ?? false,
        source: "chat" as const,
        url: artifact.url,
        artifactId: artifact.id,
        ...(artifact.kind === "spec" && artifact.spec
          ? { spec: artifact.spec as FlashcardSpec }
          : {}),
      })),
    [sharedArtifacts],
  );

  // Resolves both local docs and artifact cards; declared after artifactDocs
  // so the closure never reads it in its temporal dead zone.
  const findDoc = (id: string | null) =>
    id
      ? ([...(docs ?? []), ...artifactDocs].find((doc) => doc.id === id) ??
        null)
      : null;
  const editingDoc = findDoc(editingId);
  const viewingDoc = findDoc(viewingId);

  const filtered = useMemo(() => {
    if (!docs) return [];
    const q = query.trim().toLowerCase();
    const result = [...docs, ...artifactDocs].filter((doc) => {
      if (mode !== "all" && doc.type !== mode) return false;
      if (tab === "Pinned" && !doc.pinned) return false;
      if (tab === "Favorites" && !doc.favorite) return false;
      if (tab === "Shared with you") return false;
      if (q && !doc.title.toLowerCase().includes(q)) return false;
      return true;
    });
    switch (sort) {
      case "oldest":
        return [...result].reverse();
      case "az":
        return [...result].sort((a, b) => a.title.localeCompare(b.title));
      case "za":
        return [...result].sort((a, b) => b.title.localeCompare(a.title));
      default:
        return result;
    }
  }, [docs, artifactDocs, mode, tab, query, sort]);

  /** Persist a new doc server-side (optimistic — the UI already shows it). */
  const persistDoc = (doc: Doc) => {
    void fetch("/api/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        ...(doc.content ? { content: doc.content } : {}),
        ...(doc.slides ? { slides: doc.slides } : {}),
        ...(doc.downloads ? { downloads: doc.downloads } : {}),
        ...(doc.originArtifactId
          ? { originArtifactId: doc.originArtifactId }
          : {}),
      }),
    }).catch(() => {});
  };

  const addDoc = (type: DocType, title?: string) => {
    const doc = newDoc(type, title);
    setDocs((prev) => [doc, ...(prev ?? [])]);
    persistDoc(doc);
  };

  const togglePin = (id: string) => {
    const doc = (docs ?? []).find((entry) => entry.id === id);
    if (doc) updateDoc(id, { pinned: !doc.pinned });
  };

  const toggleFavorite = (id: string) => {
    const doc = (docs ?? []).find((entry) => entry.id === id);
    if (doc) updateDoc(id, { favorite: !doc.favorite });
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev?.filter((doc) => doc.id !== id) ?? null);
    void fetch(`/api/docs/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const updateDoc = (id: string, patch: Partial<Doc>) => {
    setDocs(
      (prev) =>
        prev?.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)) ??
        null,
    );
    void fetch(`/api/docs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  };

  const openDeck = (doc: Doc) => {
    if (!doc.slides) {
      updateDoc(doc.id, {
        slides: [
          blankSlide(doc.title === "Untitled slide deck" ? "" : doc.title),
        ],
      });
    }
    setEditingId(doc.id);
  };

  const createDeck = (title: string, slides: SlideData[]) => {
    const doc: Doc = { ...newDoc("slides", title), slides };
    setDocs((prev) => [doc, ...(prev ?? [])]);
    persistDoc(doc);
    setShowNewPresentation(false);
    setEditingId(doc.id);
  };

  const siblingsOf = (doc: Doc) =>
    sharedArtifacts
      .filter(
        (artifact) =>
          typeof artifact.url === "string" &&
          baseName(artifact.title) === baseName(doc.title),
      )
      .map((artifact) => ({
        name: artifact.title,
        url: artifact.url as string,
      }));

  const openSharedArtifact = async (doc: Doc) => {
    if (!doc.artifactId) return;
    if (doc.spec) {
      router.push(`/spaces/flashcards/${doc.artifactId}`);
      return;
    }
    if (!doc.url) return;
    if (doc.type === "slides") {
      // PowerPoint files render from the actual .pptx, exactly as generated.
      if (/\.pptx$/i.test(doc.url)) {
        setPreviewId(doc.artifactId);
        return;
      }
      const downloads = siblingsOf(doc);
      const existing = (docs ?? []).find(
        (entry) => entry.originArtifactId === doc.artifactId,
      );
      if (existing) {
        updateDoc(existing.id, { downloads });
        setEditingId(existing.id);
        return;
      }
      try {
        const res = await fetch(`/api/pi/artifacts/${doc.artifactId}/outline`);
        const data = (await res.json()) as {
          slides?: { title: string; subtitle: string }[];
        };
        if (data.slides && data.slides.length > 0) {
          const local: Doc = {
            ...newDoc("slides", doc.title),
            originArtifactId: doc.artifactId,
            downloads,
            slides: data.slides.map((slide) => ({
              id: crypto.randomUUID(),
              title: slide.title,
              subtitle: slide.subtitle,
              notes: "",
            })),
          };
          setDocs((prev) => [local, ...(prev ?? [])]);
          persistDoc(local);
          setEditingId(local.id);
          return;
        }
      } catch {
        // fall through to download
      }
    }
    window.open(doc.url, "_blank");
  };

  const removeSharedArtifact = (artifactId: string) => {
    setSharedArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
    void fetch(`/api/pi/artifacts/${artifactId}`, { method: "DELETE" }).catch(
      () => {},
    );
  };

  const setArtifactFlags = (
    artifactId: string,
    flags: { pinned?: boolean; favorite?: boolean },
  ) => {
    setSharedArtifacts((prev) =>
      prev.map((artifact) =>
        artifact.id === artifactId ? { ...artifact, ...flags } : artifact,
      ),
    );
    void fetch(`/api/pi/artifacts/${artifactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flags),
    }).catch(() => {});
  };

  /**
   * Generations run as conversations on the pi harness: create a thread, switch
   * to it, and send the request — the agent researches, designs the artifact
   * (render_ui flashcards / a shared pptx), and it lands in Spaces.
   */
  const generateInThread = async (
    kind: "flashcards" | "quizzes" | "slides",
    input: CreateDialogInput,
  ) => {
    setCreateKind(null);
    try {
      const { id } = (await fetch("/api/pi/threads", {
        method: "POST",
      }).then((res) => res.json())) as { id: string };
      await aui.threads.switchToThread(id);
      setView("home");
      const language =
        input.language === "bm"
          ? "Jawab dalam bahasa Malaysia."
          : input.language === "en"
            ? "Answer in English."
            : "Gunakan bahasa Malaysia, boleh campur istilah Inggeris.";
      const attachmentNote =
        input.files.length > 0
          ? ` Rujuk juga fail yang dilampirkan: ${input.files.join(", ")}.`
          : "";
      const prompt =
        kind === "flashcards"
          ? `Buat kad imbas tentang ${input.topic}. ${language} Gunakan render_ui flashcards supaya kad boleh terus dilihat dan diacak.${attachmentNote}`
          : kind === "quizzes"
            ? `Buat kuiz tentang ${input.topic}. ${language} Gunakan render_ui quizzes — campurkan jenis soalan (pilihan aneka, benar/palsu, isi tempat kosong, soalan terbuka) supaya kuiz ini menguji kefahaman.${attachmentNote}`
            : `Buat slide deck tentang ${input.topic}. ${language} Hasilkan fail .pptx yang kemas, semak visualnya, dan share_file kepadanya.${attachmentNote}`;
      aui.composer.setText(prompt);
      aui.composer.send();
    } catch {
      // the dialog simply closes; the user can retry
    }
  };

  const startFromTemplate = () => {
    if (mode === "slides") {
      templatesRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setSection("slides");
  };

  const tabs = mode === "all" ? ALL_TABS : MODULE_TABS;
  const emptyMessage =
    tab === "Shared with you"
      ? "Nothing shared with you yet"
      : tab === "Pinned"
        ? "No pinned items"
        : tab === "Favorites"
          ? "No favorites yet"
          : query
            ? "No items match your search"
            : "Nothing here yet — create something to get started";

  if (viewingDoc) {
    const spec: FlashcardSpec =
      viewingDoc.spec ??
      (viewingDoc.content?.kind === "flashcards"
        ? { title: viewingDoc.title, cards: viewingDoc.content.cards }
        : { title: viewingDoc.title, cards: [] });
    return (
      <FlashcardViewer
        spec={spec}
        deckId={viewingDoc.id}
        onClose={() => setViewingId(null)}
      />
    );
  }

  const previewDoc = findDoc(previewId);

  if (previewDoc && previewDoc.artifactId) {
    return (
      <SlidePreview
        artifactId={previewDoc.artifactId}
        title={previewDoc.title}
        downloads={siblingsOf(previewDoc)}
        onClose={() => setPreviewId(null)}
      />
    );
  }

  if (editingDoc) {
    return (
      <SlideEditor
        title={editingDoc.title}
        downloads={editingDoc.downloads}
        slides={
          editingDoc.slides ?? [
            blankSlide(
              editingDoc.title === "Untitled slide deck"
                ? ""
                : editingDoc.title,
            ),
          ]
        }
        onTitleChange={(title) => updateDoc(editingDoc.id, { title })}
        onSlidesChange={(slides) => updateDoc(editingDoc.id, { slides })}
        onGenerateWithAi={(topic) =>
          void generateInThread("slides", {
            topic,
            language: "both",
            files: [],
          })
        }
        onClose={() => setEditingId(null)}
      />
    );
  }

  const isFlashcards = mode === "flashcards";
  const isQuizzes = mode === "quizzes";
  const isModule = isFlashcards || isQuizzes;

  const openDeckDoc = (doc: Doc) => {
    if (doc.spec) {
      router.push(
        doc.type === "quizzes"
          ? `/spaces/quizzes/${doc.artifactId}`
          : `/spaces/flashcards/${doc.artifactId}`,
      );
      return;
    }
    if (doc.artifactId) {
      void openSharedArtifact(doc);
      return;
    }
    if (doc.type === "flashcards") {
      setViewingId(doc.id);
      return;
    }
    if (doc.type === "slides") openDeck(doc);
  };

  const header = MODULE_HEADER[mode];

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              className={cn(
                "bg-muted/60 flex size-12 shrink-0 items-center justify-center rounded-2xl",
                header.color,
              )}
            >
              <header.Icon className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {MODULE_TITLES[mode]}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {header.subtitle}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="relative ml-auto hidden h-24 w-56 shrink-0 md:block"
            >
              <div className="absolute top-1/2 right-0 size-24 -translate-y-1/2 rounded-full bg-[#8fd9c8]/50 blur-2xl dark:bg-[#0f4f4a]/60" />
              <div className="border-border/60 bg-card absolute top-1/2 right-8 h-16 w-28 -translate-y-1/2 rotate-6 rounded-xl border shadow-sm" />
              <div className="border-border/60 bg-card absolute top-1/2 right-14 h-16 w-28 -translate-y-1/2 -rotate-3 rounded-xl border shadow-md" />
              <div className="border-border/60 bg-card absolute top-1/2 right-12 flex h-16 w-28 -translate-y-1/2 items-center justify-center rounded-xl border text-2xl shadow-lg">
                💡
              </div>
              <SparklesIcon className="absolute top-1 right-0 size-4 text-amber-400" />
              <SparklesIcon className="absolute right-24 bottom-0 size-3 text-amber-400" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 max-sm:w-full">
            <div className="relative max-sm:w-full">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  isQuizzes
                    ? "Search quizzes..."
                    : isFlashcards
                      ? "Search flashcards..."
                      : "Search"
                }
                aria-label="Search"
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 w-56 rounded-full border pr-3 pl-9 text-sm outline-none focus-visible:ring-2 max-sm:w-full md:w-64"
              />
            </div>
            {mode === "all" ? (
              <CreateMenu
                onStartFromTemplate={startFromTemplate}
                onCreate={addDoc}
              />
            ) : mode === "slides" ? (
              <Button
                onClick={() => setShowNewPresentation(true)}
                className="h-9 rounded-full px-4 text-sm"
              >
                <PlusIcon className="size-4" />
                New slides
              </Button>
            ) : (
              <Button
                onClick={() => setCreateKind(mode)}
                className="h-9 rounded-full px-4 text-sm"
              >
                <SparklesIcon className="size-4" />
                New {MODULE_TITLES[mode].toLowerCase()}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((item) => {
              const TabIcon = {
                All: LayoutGridIcon,
                Suggested: SparklesIcon,
                Pinned: PinIcon,
                Favorites: StarIcon,
                "Your items": FolderIcon,
                "Shared with you": UsersIcon,
              }[item];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors sm:px-4",
                    tab === item
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {TabIcon ? <TabIcon className="size-3.5 shrink-0" /> : null}
                  <span className="whitespace-nowrap">{item}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Sort"
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-full transition-colors"
              >
                <AlignLeftIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onClick={() => setSort(option.id)}
                  >
                    {sort === option.id ? (
                      <CheckIcon className="size-4" />
                    ) : (
                      <span className="size-4" />
                    )}
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="bg-border mx-1 h-5 w-px" />
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setLayout("grid")}
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors",
                layout === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <LayoutGridIcon className="size-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => setLayout("list")}
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors",
                layout === "list"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <ListIcon className="size-4" />
            </button>
          </div>
        </div>

        {mode === "slides" && (
          <div className="mt-8" ref={templatesRef}>
            <h2 className="text-base font-semibold">
              Create together in Space
            </h2>
            <p className="text-muted-foreground text-sm">
              Choose a template to start working with your team
            </p>
            <div className="scrollbar-subtle mt-4 flex gap-4 overflow-x-auto pb-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() =>
                    createDeck(template.title, [
                      blankSlide(template.title, "Created from template"),
                    ])
                  }
                  className="w-64 shrink-0 text-left"
                >
                  <div className="border-border/60 aspect-[16/10] overflow-hidden rounded-xl border transition-transform duration-200 hover:scale-[1.02]">
                    <template.render />
                  </div>
                  <p className="mt-2.5 text-center text-sm font-medium">
                    {template.title}
                  </p>
                  <p className="text-muted-foreground text-center text-xs">
                    Slides
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {docs !== null &&
          (layout === "grid" ? (
            <div
              className={cn(
                "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
                isModule && "xl:grid-cols-4",
              )}
            >
              {isModule &&
                filtered.map((doc) => {
                  const info = deckInfoOf(doc, progressMap);
                  return (
                    <GalleryCard
                      key={doc.id}
                      doc={doc}
                      known={info.known}
                      total={info.total}
                      onOpen={() => openDeckDoc(doc)}
                      menu={
                        doc.artifactId ? (
                          <SharedArtifactMenu
                            doc={doc}
                            siblings={siblingsOf(doc)}
                            onDownload={(entry) =>
                              entry.url && window.open(entry.url, "_blank")
                            }
                            onRemove={removeSharedArtifact}
                            onSetFlags={setArtifactFlags}
                          />
                        ) : (
                          <DocMenu
                            doc={doc}
                            onTogglePin={togglePin}
                            onToggleFavorite={toggleFavorite}
                            onDelete={setPendingDelete}
                          />
                        )
                      }
                    />
                  );
                })}
              {isModule && (
                <button
                  type="button"
                  onClick={() => setCreateKind(mode)}
                  className="border-border/60 hover:bg-muted/40 flex min-h-[248px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center transition-colors"
                >
                  <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
                    <PlusIcon className="size-5" />
                  </span>
                  <span className="text-sm font-semibold">
                    {isQuizzes ? "Buat kuiz baharu" : "Buat set baharu"}
                  </span>
                  <span className="text-muted-foreground max-w-44 text-xs">
                    {isQuizzes
                      ? "Hasilkan kuiz dengan AI atau secara manual"
                      : "Hasilkan kad imbas dengan AI atau secara manual"}
                  </span>
                </button>
              )}
              {!isModule &&
                filtered.map((doc) => {
                  const info = deckInfoOf(doc, progressMap);
                  return (
                    <GalleryCard
                      key={doc.id}
                      doc={doc}
                      known={info.known}
                      total={info.total}
                      onOpen={() => openDeckDoc(doc)}
                      menu={
                        doc.artifactId ? (
                          <SharedArtifactMenu
                            doc={doc}
                            siblings={siblingsOf(doc)}
                            onDownload={(entry) =>
                              entry.url && window.open(entry.url, "_blank")
                            }
                            onRemove={removeSharedArtifact}
                            onSetFlags={setArtifactFlags}
                          />
                        ) : (
                          <DocMenu
                            doc={doc}
                            onTogglePin={togglePin}
                            onToggleFavorite={toggleFavorite}
                            onDelete={setPendingDelete}
                          />
                        )
                      }
                    />
                  );
                })}
            </div>
          ) : (
            <div className="mt-6 flex flex-col">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  onClick={
                    doc.spec
                      ? () =>
                          router.push(`/spaces/flashcards/${doc.artifactId}`)
                      : doc.artifactId
                        ? () => void openSharedArtifact(doc)
                        : doc.type === "slides"
                          ? () => openDeck(doc)
                          : doc.type === "flashcards"
                            ? () => setViewingId(doc.id)
                            : undefined
                  }
                  className={cn(
                    "group hover:bg-muted/50 relative flex h-11 items-center gap-3 rounded-lg px-3 transition-colors",
                    (doc.spec ||
                      doc.artifactId ||
                      doc.type === "slides" ||
                      doc.type === "flashcards") &&
                      "cursor-pointer",
                  )}
                >
                  <DocGlyph type={doc.type} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {doc.title}
                  </span>
                  {doc.source === "chat" && (
                    <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                      From chat
                    </span>
                  )}
                  {doc.pinned && (
                    <PinIcon className="text-muted-foreground size-3.5 shrink-0" />
                  )}
                  {doc.favorite && (
                    <StarIcon className="size-3.5 shrink-0 fill-current text-amber-400" />
                  )}
                  <div
                    onClick={(event) => event.stopPropagation()}
                    className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                  >
                    {doc.artifactId ? (
                      <SharedArtifactMenu
                        doc={doc}
                        siblings={siblingsOf(doc)}
                        onDownload={(entry) =>
                          entry.url && window.open(entry.url, "_blank")
                        }
                        onRemove={removeSharedArtifact}
                        onSetFlags={setArtifactFlags}
                      />
                    ) : (
                      <DocMenu
                        doc={doc}
                        onTogglePin={togglePin}
                        onToggleFavorite={toggleFavorite}
                        onDelete={setPendingDelete}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

        {docs !== null && filtered.length === 0 && (
          <div className="text-muted-foreground py-12 text-center text-sm">
            {emptyMessage}
          </div>
        )}
      </div>

      <NewPresentationDialog
        open={showNewPresentation}
        onOpenChange={setShowNewPresentation}
        onCreate={createDeck}
      />

      <CreateDialog
        open={createKind !== null}
        label={createKind ? MODULE_TITLES[createKind].toLowerCase() : "item"}
        supported={
          createKind === "slides" ||
          createKind === "flashcards" ||
          createKind === "quizzes"
        }
        onOpenChange={(open) => {
          if (!open) setCreateKind(null);
        }}
        onGenerate={(input: CreateDialogInput) =>
          void generateInThread(
            createKind === "flashcards"
              ? "flashcards"
              : createKind === "quizzes"
                ? "quizzes"
                : "slides",
            input,
          )
        }
        onCreateEmpty={() => {
          if (createKind) addDoc(createKind);
          setCreateKind(null);
        }}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
            <DialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; will be permanently deleted.
              This can&rsquo;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) removeDoc(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
