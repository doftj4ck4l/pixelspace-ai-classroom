"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import {
  AlignLeftIcon,
  CheckIcon,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  PresentationIcon,
  SearchIcon,
  Trash2Icon,
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
import { cn } from "@/lib/utils";

type SlideDoc = {
  id: string;
  title: string;
  pinned: boolean;
};

const STORAGE_KEY = "paic-slides-v1";

const SEED_SLIDES: SlideDoc[] = [
  { id: "demo-1", title: "Untitled slide", pinned: false },
  { id: "demo-2", title: "Weekly Business Review", pinned: false },
];

const TABS = ["All", "Pinned", "Yours", "Shared with you"] as const;
type Tab = (typeof TABS)[number];

const SORT_OPTIONS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "az", label: "Name (A-Z)" },
  { id: "za", label: "Name (Z-A)" },
] as const;
type Sort = (typeof SORT_OPTIONS)[number]["id"];

type Template = {
  id: string;
  title: string;
  render: FC;
};

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

const newSlide = (title: string): SlideDoc => ({
  id: crypto.randomUUID(),
  title,
  pinned: false,
});

const SlideMenu: FC<{
  slide: SlideDoc;
  onTogglePin: (id: string) => void;
  onDelete: (slide: SlideDoc) => void;
}> = ({ slide, onTogglePin, onDelete }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      aria-label="Slide options"
      className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
    >
      <MoreHorizontalIcon className="size-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" side="bottom">
      <DropdownMenuItem onClick={() => onTogglePin(slide.id)}>
        {slide.pinned ? (
          <PinOffIcon className="size-4" />
        ) : (
          <PinIcon className="size-4" />
        )}
        {slide.pinned ? "Unpin" : "Pin"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onClick={() => onDelete(slide)}
      >
        <Trash2Icon className="size-4" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const SlidesGallery: FC = () => {
  const [slides, setSlides] = useState<SlideDoc[] | null>(null);
  const [tab, setTab] = useState<Tab>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [pendingDelete, setPendingDelete] = useState<SlideDoc | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setSlides(raw ? (JSON.parse(raw) as SlideDoc[]) : SEED_SLIDES);
    } catch {
      setSlides(SEED_SLIDES);
    }
  }, []);

  useEffect(() => {
    if (slides) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
      } catch {
        // storage unavailable
      }
    }
  }, [slides]);

  const filtered = useMemo(() => {
    if (!slides) return [];
    const q = query.trim().toLowerCase();
    const result = slides.filter((slide) => {
      if (tab === "Pinned" && !slide.pinned) return false;
      if (tab === "Shared with you") return false;
      if (q && !slide.title.toLowerCase().includes(q)) return false;
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
  }, [slides, tab, query, sort]);

  const addSlide = (title: string) => {
    setSlides((prev) => [newSlide(title), ...(prev ?? [])]);
  };

  const togglePin = (id: string) => {
    setSlides(
      (prev) =>
        prev?.map((slide) =>
          slide.id === id ? { ...slide, pinned: !slide.pinned } : slide,
        ) ?? null,
    );
  };

  const removeSlide = (id: string) => {
    setSlides((prev) => prev?.filter((slide) => slide.id !== id) ?? null);
  };

  const emptyMessage =
    tab === "Shared with you"
      ? "Nothing shared with you yet"
      : tab === "Pinned"
        ? "No pinned slides"
        : query
          ? "No slides match your search"
          : "No slides yet — create one to get started";

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Slides</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search slides"
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 w-56 rounded-full border pr-3 pl-9 text-sm outline-none focus-visible:ring-2 md:w-64"
              />
            </div>
            <Button
              onClick={() => addSlide("Untitled slide")}
              className="h-9 rounded-full px-4 text-sm"
            >
              <PlusIcon className="size-4" />
              New slides
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((item) => (
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
                aria-label="Sort slides"
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

        <div className="mt-8">
          <h2 className="text-base font-semibold">Create together in Space</h2>
          <p className="text-muted-foreground text-sm">
            Choose a template to start working with your team
          </p>
          <div className="scrollbar-subtle mt-4 flex gap-4 overflow-x-auto pb-3">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => addSlide(template.title)}
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

        {slides !== null &&
          (layout === "grid" ? (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((slide) => (
                <div
                  key={slide.id}
                  className="group border-border/60 bg-card relative rounded-xl border p-3 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-2 pr-7">
                    <PresentationIcon className="size-4 shrink-0 text-red-500" />
                    <span className="truncate text-sm font-medium">
                      {slide.title}
                    </span>
                    {slide.pinned && (
                      <PinIcon className="text-muted-foreground size-3.5 shrink-0" />
                    )}
                  </div>
                  <div className="bg-muted/40 mt-3 flex aspect-[16/10] items-center justify-center rounded-lg">
                    <PresentationIcon className="size-10 text-red-500/30" />
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <SlideMenu
                      slide={slide}
                      onTogglePin={togglePin}
                      onDelete={setPendingDelete}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col">
              {filtered.map((slide) => (
                <div
                  key={slide.id}
                  className="group hover:bg-muted/50 relative flex h-11 items-center gap-3 rounded-lg px-3 transition-colors"
                >
                  <PresentationIcon className="size-4 shrink-0 text-red-500" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {slide.title}
                  </span>
                  {slide.pinned && (
                    <PinIcon className="text-muted-foreground size-3.5 shrink-0" />
                  )}
                  <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <SlideMenu
                      slide={slide}
                      onTogglePin={togglePin}
                      onDelete={setPendingDelete}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}

        {slides !== null && filtered.length === 0 && (
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
            <DialogTitle>Delete slide?</DialogTitle>
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
                if (pendingDelete) removeSlide(pendingDelete.id);
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
