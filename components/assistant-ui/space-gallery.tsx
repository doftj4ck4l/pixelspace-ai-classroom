"use client";

import { useEffect, useMemo, useRef, useState, type FC } from "react";
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
import { GenerationView } from "@/components/assistant-ui/generation-view";
import {
  streamGeneration,
  type GeneratedContent,
  type GenerationArtifact,
  type GenerationInput,
  type GenerationSource,
} from "@/components/assistant-ui/harness";
import {
  NewPresentationDialog,
  SlideEditor,
  TEMPLATES,
  blankSlide,
  type SlideData,
} from "@/components/assistant-ui/slide-editor";
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
  /** Companion files (same base name) offered inside the slide editor. */
  downloads?: { name: string; url: string }[];
};

type SharedArtifact = {
  id: string;
  title: string;
  type: string;
  url: string;
};

const baseName = (name: string) => name.replace(/\.[^.]+$/, "").toLowerCase();

const STORAGE_KEY = "paic-space-docs-v3";

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

const CREATE_MODULE_ITEMS: { type: DocType; label: string; Icon: LucideIcon }[] =
  [
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
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
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
          className={cn("size-4", doc.favorite && "fill-current text-amber-400")}
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

const SharedArtifactMenu: FC<{
  doc: Doc;
  siblings: { name: string; url: string }[];
  onDownload: (doc: Doc) => void;
  onRemove: (artifactId: string) => void;
}> = ({ doc, siblings, onDownload, onRemove }) => {
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
        <DropdownMenuItem onClick={() => onDownload(doc)}>
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
  const { setSection } = useSidebarNav();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [tab, setTab] = useState<string>(mode === "all" ? "Suggested" : "All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [sharedArtifacts, setSharedArtifacts] = useState<SharedArtifact[]>([]);
  const [showNewPresentation, setShowNewPresentation] = useState(false);
  const [createKind, setCreateKind] = useState<ModuleKind | null>(null);
  const [generation, setGeneration] = useState<GenerationInput | null>(null);
  const [genSteps, setGenSteps] = useState<string[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const genAbortRef = useRef<AbortController | null>(null);
  const genTargetRef = useRef<string | null>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  const editingDoc = docs?.find((doc) => doc.id === editingId) ?? null;
  const viewingDoc = docs?.find((doc) => doc.id === viewingId) ?? null;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setDocs(raw ? (JSON.parse(raw) as Doc[]) : []);
    } catch {
      setDocs([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pi/artifacts")
      .then((res) => res.json())
      .then((data: { artifacts?: SharedArtifact[] }) => {
        if (!cancelled) setSharedArtifacts(data.artifacts ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (docs) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      } catch {
        // storage unavailable
      }
    }
  }, [docs]);

  const artifactDocs = useMemo<Doc[]>(
    () =>
      sharedArtifacts.map((artifact) => ({
        id: artifact.id,
        title: artifact.title,
        type: (artifact.type === "other" ? "doc" : artifact.type) as DocType,
        pinned: false,
        favorite: false,
        source: "chat" as const,
        url: artifact.url,
        artifactId: artifact.id,
      })),
    [sharedArtifacts],
  );

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

  const addDoc = (type: DocType, title?: string) => {
    setDocs((prev) => [newDoc(type, title), ...(prev ?? [])]);
  };

  const togglePin = (id: string) => {
    setDocs(
      (prev) =>
        prev?.map((doc) =>
          doc.id === id ? { ...doc, pinned: !doc.pinned } : doc,
        ) ?? null,
    );
  };

  const toggleFavorite = (id: string) => {
    setDocs(
      (prev) =>
        prev?.map((doc) =>
          doc.id === id ? { ...doc, favorite: !doc.favorite } : doc,
        ) ?? null,
    );
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev?.filter((doc) => doc.id !== id) ?? null);
  };

  const updateDoc = (id: string, patch: Partial<Doc>) => {
    setDocs(
      (prev) => prev?.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)) ?? null,
    );
  };

  const openDeck = (doc: Doc) => {
    if (!doc.slides) {
      updateDoc(doc.id, {
        slides: [blankSlide(doc.title === "Untitled slide deck" ? "" : doc.title)],
      });
    }
    setEditingId(doc.id);
  };

  const createDeck = (title: string, slides: SlideData[]) => {
    const doc: Doc = { ...newDoc("slides", title), slides };
    setDocs((prev) => [doc, ...(prev ?? [])]);
    setShowNewPresentation(false);
    setEditingId(doc.id);
  };

  const siblingsOf = (doc: Doc) =>
    sharedArtifacts
      .filter((artifact) => baseName(artifact.title) === baseName(doc.title))
      .map((artifact) => ({ name: artifact.title, url: artifact.url }));

  const openSharedArtifact = async (doc: Doc) => {
    if (!doc.artifactId || !doc.url) return;
    if (doc.type === "slides") {
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

  const finishGeneration = (
    input: GenerationInput,
    content: GeneratedContent,
    sources: GenerationSource[],
    artifacts: GenerationArtifact[],
  ) => {
    const slides =
      content.kind === "slides"
        ? content.slides.map((slide) => ({
            id: crypto.randomUUID(),
            title: slide.title,
            subtitle: slide.subtitle,
            notes: "",
          }))
        : undefined;
    const targetId = genTargetRef.current;
    genTargetRef.current = null;

    if (targetId) {
      updateDoc(targetId, {
        title: input.topic,
        content,
        sources,
        artifacts,
        ...(slides ? { slides } : {}),
      });
      setEditingId(targetId);
    } else {
      const doc: Doc = {
        ...newDoc(input.kind, input.topic),
        content,
        sources,
        artifacts,
        ...(slides ? { slides } : {}),
      };
      setDocs((prev) => [doc, ...(prev ?? [])]);
      if (input.kind === "slides") setEditingId(doc.id);
      else setViewingId(doc.id);
    }

    setGeneration(null);
    setGenSteps([]);
    setGenError(null);
    genAbortRef.current = null;
  };

  const startGeneration = (input: GenerationInput, targetDocId?: string) => {
    genAbortRef.current?.abort();
    const controller = new AbortController();
    genAbortRef.current = controller;
    genTargetRef.current = targetDocId ?? null;
    setCreateKind(null);
    setGeneration(input);
    setGenSteps([]);
    setGenError(null);
    void streamGeneration(
      input,
      (event) => {
        if (event.type === "step") {
          setGenSteps((prev) => [...prev, event.label]);
        } else if (event.type === "done") {
          finishGeneration(input, event.content, event.sources, event.artifacts);
        } else {
          setGenError(event.message);
        }
      },
      controller.signal,
    ).catch((error: unknown) => {
      if ((error as Error)?.name !== "AbortError") {
        setGenError(error instanceof Error ? error.message : "Generation failed");
      }
    });
  };

  const cancelGeneration = () => {
    genAbortRef.current?.abort();
    genAbortRef.current = null;
    setGeneration(null);
    setGenSteps([]);
    setGenError(null);
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

  if (generation) {
    return (
      <GenerationView
        kind={generation.kind}
        topic={generation.topic}
        steps={genSteps}
        error={genError}
        onCancel={cancelGeneration}
        onRetry={() => startGeneration(generation, genTargetRef.current ?? undefined)}
      />
    );
  }

  if (viewingDoc) {
    const cards =
      viewingDoc.content?.kind === "flashcards" ? viewingDoc.content.cards : [];
    return (
      <FlashcardViewer
        title={viewingDoc.title}
        cards={cards}
        onClose={() => setViewingId(null)}
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
              editingDoc.title === "Untitled slide deck" ? "" : editingDoc.title,
            ),
          ]
        }
        onTitleChange={(title) => updateDoc(editingDoc.id, { title })}
        onSlidesChange={(slides) => updateDoc(editingDoc.id, { slides })}
        onGenerateWithAi={(topic) =>
          startGeneration(
            { kind: "slides", topic, language: "both", files: [] },
            editingDoc.id,
          )
        }
        onClose={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{MODULE_TITLES[mode]}</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search"
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 w-56 rounded-full border pr-3 pl-9 text-sm outline-none focus-visible:ring-2 md:w-64"
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
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  "h-8 rounded-full px-4 text-sm transition-colors",
                  tab === item
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
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
            <h2 className="text-base font-semibold">Create together in Space</h2>
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
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  onClick={
                    doc.artifactId
                      ? () => void openSharedArtifact(doc)
                      : doc.type === "slides"
                        ? () => openDeck(doc)
                        : doc.type === "flashcards"
                          ? () => setViewingId(doc.id)
                          : undefined
                  }
                  className={cn(
                    "group border-border/60 bg-card relative rounded-xl border p-3 transition-shadow hover:shadow-md",
                    (doc.artifactId ||
                      doc.type === "slides" ||
                      doc.type === "flashcards") &&
                      "cursor-pointer",
                  )}
                >
                  <div className="flex items-center gap-2 pr-7">
                    <DocGlyph type={doc.type} />
                    <span className="truncate text-sm font-medium">
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
                  </div>
                  <div className="mt-3 flex aspect-[16/10] items-center justify-center">
                    <DocGlyph type={doc.type} size="lg" />
                  </div>
                  <div
                    onClick={(event) => event.stopPropagation()}
                    className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    {doc.artifactId ? (
                      <SharedArtifactMenu
                        doc={doc}
                        siblings={siblingsOf(doc)}
                        onDownload={(entry) =>
                          entry.url && window.open(entry.url, "_blank")
                        }
                        onRemove={removeSharedArtifact}
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
          ) : (
            <div className="mt-6 flex flex-col">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  onClick={
                    doc.artifactId
                      ? () => void openSharedArtifact(doc)
                      : doc.type === "slides"
                        ? () => openDeck(doc)
                        : doc.type === "flashcards"
                          ? () => setViewingId(doc.id)
                          : undefined
                  }
                  className={cn(
                    "group hover:bg-muted/50 relative flex h-11 items-center gap-3 rounded-lg px-3 transition-colors",
                    (doc.artifactId ||
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
                    className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    {doc.artifactId ? (
                      <SharedArtifactMenu
                        doc={doc}
                        siblings={siblingsOf(doc)}
                        onDownload={(entry) =>
                          entry.url && window.open(entry.url, "_blank")
                        }
                        onRemove={removeSharedArtifact}
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
        label={
          createKind ? MODULE_TITLES[createKind].toLowerCase() : "item"
        }
        supported={
          createKind === "slides" || createKind === "flashcards"
        }
        onOpenChange={(open) => {
          if (!open) setCreateKind(null);
        }}
        onGenerate={(input: CreateDialogInput) =>
          startGeneration({
            kind: createKind === "flashcards" ? "flashcards" : "slides",
            ...input,
          })
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
