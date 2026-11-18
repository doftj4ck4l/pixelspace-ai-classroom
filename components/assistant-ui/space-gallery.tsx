"use client";

import { useEffect, useMemo, useRef, useState, type FC } from "react";
import {
  AlignLeftIcon,
  CheckIcon,
  ChevronDownIcon,
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
  PresentationIcon,
  SearchIcon,
  StarIcon,
  TableIcon,
  Trash2Icon,
  UploadIcon,
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
import { cn } from "@/lib/utils";

type DocType =
  | "page"
  | "slide"
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
};

const STORAGE_KEY = "paic-space-docs-v1";

const SEED_DOCS: Doc[] = [
  {
    id: "demo-1",
    title: "Your guide to pages",
    type: "page",
    pinned: false,
    favorite: true,
  },
  {
    id: "demo-2",
    title: "Untitled slide",
    type: "slide",
    pinned: false,
    favorite: false,
  },
  {
    id: "demo-3",
    title: "Weekly Business Review",
    type: "slide",
    pinned: false,
    favorite: false,
  },
  {
    id: "demo-4",
    title: "Tourism_Malaysia_AI_Avatar_Proposal",
    type: "pdf",
    pinned: false,
    favorite: false,
  },
  {
    id: "demo-5",
    title: "Silibus_Latihan_Projek_Pelajar",
    type: "pdf",
    pinned: false,
    favorite: false,
  },
  {
    id: "demo-6",
    title: "Pixelspace_AI_Classroom_Notes",
    type: "doc",
    pinned: false,
    favorite: false,
  },
];

const TYPE_STYLES: Record<DocType, { Icon: LucideIcon; color: string }> = {
  page: { Icon: FileTextIcon, color: "text-foreground" },
  slide: { Icon: PresentationIcon, color: "text-yellow-500" },
  pdf: { Icon: FileTextIcon, color: "text-red-500" },
  doc: { Icon: FileTextIcon, color: "text-blue-500" },
  site: { Icon: LayoutGridIcon, color: "text-violet-500" },
  image: { Icon: ImageIcon, color: "text-pink-500" },
  folder: { Icon: FolderIcon, color: "text-muted-foreground" },
  space: { Icon: LayersIcon, color: "text-teal-600" },
};

const UNTITLED: Record<DocType, string> = {
  page: "Untitled page",
  slide: "Untitled slide",
  pdf: "Untitled document",
  doc: "Untitled document",
  site: "Untitled site",
  image: "Untitled image",
  folder: "Untitled folder",
  space: "Untitled space",
};

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

type Template = { id: string; title: string; render: FC };

const ProductStrategyThumb: FC = () => (
  <div className="relative flex size-full flex-col items-center justify-center overflow-hidden bg-[#1e2a5a]">
    <svg
      aria-hidden="true"
      viewBox="0 0 100 60"
      className="absolute inset-x-0 bottom-0 w-full text-white/10"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.4"
    >
      <path d="M50 58 L20 20 L80 20 Z" />
      <path d="M50 58 L35 10 L65 10 Z" />
    </svg>
    <span className="relative text-[10px] tracking-[0.35em] text-white/60">
      2027
    </span>
    <span className="relative text-center text-lg leading-tight font-semibold text-white">
      Product
      <br />
      Strategy
    </span>
  </div>
);

const WeeklyReviewThumb: FC = () => (
  <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#f3e8d8] to-[#e6d5bd]">
    <div className="h-[82%] w-[78%] rounded-md bg-white p-1.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[6px] font-medium text-[#333]">
          Weekly Business Review
        </span>
        <span className="text-[5px] text-[#888]">Alder</span>
      </div>
      <p className="mt-0.5 text-[4px] text-[#999]">October 2025</p>
      <div className="mt-1 h-[58%] rounded-sm bg-gradient-to-br from-[#c9a27a] to-[#8b5e3c]" />
    </div>
  </div>
);

const PhotographyThumb: FC = () => (
  <div className="flex size-full flex-col items-center justify-center gap-1.5 border bg-white dark:bg-[#1e1f20]">
    <span className="font-serif text-xs italic text-[#2b2b2b] dark:text-[#e3e3e3]">
      Luma Studio
    </span>
    <div className="flex gap-0.5">
      <div className="h-8 w-4 rounded-[2px] bg-gradient-to-b from-[#8d8d8d] to-[#4a4a4a]" />
      <div className="h-8 w-5 rounded-[2px] bg-gradient-to-b from-[#b0a89c] to-[#6b6257]" />
      <div className="h-8 w-4 rounded-[2px] bg-gradient-to-b from-[#d9d2c8] to-[#9a9187]" />
    </div>
  </div>
);

const NextOsThumb: FC = () => (
  <div className="flex size-full flex-col items-center justify-end overflow-hidden bg-gradient-to-b from-[#bfe0f5] to-[#eef6fb] pt-2">
    <p className="max-w-[85%] text-center text-[7px] font-medium text-[#2b3a46]">
      Introducing our next generation OS
    </p>
    <div className="mt-1.5 h-[62%] w-[72%] rounded-t-lg bg-[#3a3a3c] p-1">
      <div className="size-full rounded-sm bg-gradient-to-b from-[#f5c9a8] via-[#c9b8b0] to-[#9db8d2]" />
    </div>
  </div>
);

const BrandGuideThumb: FC = () => (
  <div className="flex size-full flex-col justify-between bg-[#e8503a] p-3">
    <span className="text-base leading-tight font-semibold text-white/95">
      Brand
      <br />
      Guide
    </span>
    <span className="text-[5px] text-white/70">2025 ©</span>
  </div>
);

const TEMPLATES: Template[] = [
  {
    id: "product-strategy",
    title: "Product Strategy",
    render: ProductStrategyThumb,
  },
  {
    id: "weekly-review",
    title: "Weekly Business Review",
    render: WeeklyReviewThumb,
  },
  {
    id: "photography",
    title: "Photography Portfolio",
    render: PhotographyThumb,
  },
  { id: "next-os", title: "Next Generation OS", render: NextOsThumb },
  { id: "brand-guide", title: "Brand Guide", render: BrandGuideThumb },
];

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
        <DropdownMenuContent align="end" side="bottom" className="min-w-56">
          <DropdownMenuItem onClick={onStartFromTemplate}>
            <LayoutDashboardIcon className="size-4" />
            Start from template
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onCreate("page")}>
            <FileTextIcon className="size-4" />
            Page
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreate("slide")}>
            <PresentationIcon className="size-4" />
            Slides
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <TableIcon className="size-4" />
            Sheet
            <span className="text-muted-foreground ml-auto pl-6 text-xs">
              Coming soon
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreate("site")}>
            <LayoutGridIcon className="size-4" />
            Site
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreate("image")}>
            <ImageIcon className="size-4" />
            Image
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onCreate("folder")}>
            <FolderIcon className="size-4" />
            Folder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreate("space")}>
            <LayersIcon className="size-4" />
            Space
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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

const ALL_TABS = ["Suggested", "Favorites", "Your items", "Shared with you"];
const SLIDES_TABS = ["All", "Pinned", "Yours", "Shared with you"];

export const SpaceGallery: FC<{ mode: "all" | "slides" }> = ({ mode }) => {
  const { setSection } = useSidebarNav();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [tab, setTab] = useState<string>(mode === "all" ? "Suggested" : "All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setDocs(raw ? (JSON.parse(raw) as Doc[]) : SEED_DOCS);
    } catch {
      setDocs(SEED_DOCS);
    }
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

  const filtered = useMemo(() => {
    if (!docs) return [];
    const q = query.trim().toLowerCase();
    const result = docs.filter((doc) => {
      if (mode === "slides" && doc.type !== "slide") return false;
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
  }, [docs, mode, tab, query, sort]);

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

  const startFromTemplate = () => {
    if (mode === "slides") {
      templatesRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setSection("slides");
  };

  const tabs = mode === "all" ? ALL_TABS : SLIDES_TABS;
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

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">
            {mode === "all" ? "All" : "Slides"}
          </h1>
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
            <CreateMenu onStartFromTemplate={startFromTemplate} onCreate={addDoc} />
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
                  onClick={() => addDoc("slide", template.title)}
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
                  className="group border-border/60 bg-card relative rounded-xl border p-3 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-2 pr-7">
                    <DocGlyph type={doc.type} />
                    <span className="truncate text-sm font-medium">
                      {doc.title}
                    </span>
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
                  <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <DocMenu
                      doc={doc}
                      onTogglePin={togglePin}
                      onToggleFavorite={toggleFavorite}
                      onDelete={setPendingDelete}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  className="group hover:bg-muted/50 relative flex h-11 items-center gap-3 rounded-lg px-3 transition-colors"
                >
                  <DocGlyph type={doc.type} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {doc.title}
                  </span>
                  {doc.pinned && (
                    <PinIcon className="text-muted-foreground size-3.5 shrink-0" />
                  )}
                  {doc.favorite && (
                    <StarIcon className="size-3.5 shrink-0 fill-current text-amber-400" />
                  )}
                  <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <DocMenu
                      doc={doc}
                      onTogglePin={togglePin}
                      onToggleFavorite={toggleFavorite}
                      onDelete={setPendingDelete}
                    />
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
