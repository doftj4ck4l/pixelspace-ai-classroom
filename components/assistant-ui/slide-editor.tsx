"use client";

import { useEffect, useRef, useState, type FC } from "react";
import {
  AudioLinesIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileInputIcon,
  FilePlus2Icon,
  FilePlusIcon,
  FolderInputIcon,
  ImageIcon,
  LayoutGridIcon,
  MessageSquarePlusIcon,
  MicIcon,
  PanelLeftIcon,
  PlayIcon,
  PlusIcon,
  Share2Icon,
  TypeIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SlideData = {
  id: string;
  title: string;
  subtitle: string;
  notes?: string;
};

export const blankSlide = (title = "", subtitle = ""): SlideData => ({
  id: crypto.randomUUID(),
  title,
  subtitle,
  notes: "",
});

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

const ProjectKickoffThumb: FC = () => (
  <div className="flex size-full flex-col items-center justify-center gap-1 bg-[#16352a] p-3">
    <span className="rounded-full border border-white/20 px-1.5 py-0.5 text-[5px] text-white/60">
      2025/07 Planning
    </span>
    <span className="text-center text-sm leading-tight font-semibold text-emerald-300">
      Team Project
      <br />
      Kickoff Session
    </span>
    <span className="text-center text-[5px] text-white/50">
      Aligning on the vision, plan, and path to success
    </span>
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
      Guidelines
    </span>
    <span className="text-[5px] text-white/70">2025 ©</span>
  </div>
);

export const TEMPLATES: Template[] = [
  {
    id: "weekly-review",
    title: "Weekly Business Review",
    render: WeeklyReviewThumb,
  },
  { id: "project-kickoff", title: "Project Kickoff", render: ProjectKickoffThumb },
  {
    id: "product-strategy",
    title: "Product Strategy",
    render: ProductStrategyThumb,
  },
  { id: "luma-studio", title: "Luma Studio", render: PhotographyThumb },
  { id: "next-os", title: "Next generation OS", render: NextOsThumb },
  { id: "brand-guidelines", title: "Brand Guidelines", render: BrandGuideThumb },
];

export const NewPresentationDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (title: string, slides: SlideData[]) => void;
}> = ({ open, onOpenChange, onCreate }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const createFromFile = (file: File) => {
    const title = file.name.replace(/\.[^.]+$/, "");
    onCreate(title, [blankSlide(title, "")]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlusIcon className="size-4" />
            New presentation
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onCreate("Untitled slide", [blankSlide()])}
            className="bg-muted/60 hover:bg-muted flex flex-col items-center gap-2 rounded-lg px-4 py-5 text-sm whitespace-nowrap transition-colors"
          >
            <FilePlus2Icon className="size-5" />
            Start from scratch
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="bg-muted/60 hover:bg-muted flex flex-col items-center gap-2 rounded-lg px-4 py-5 text-sm whitespace-nowrap transition-colors"
          >
            <FileInputIcon className="size-5" />
            Create from a file
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="bg-muted/60 hover:bg-muted flex flex-col items-center gap-2 rounded-lg px-4 py-5 text-sm whitespace-nowrap transition-colors"
          >
            <FolderInputIcon className="size-5" />
            Upload
          </button>
        </div>

        <div className="mt-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <LayoutGridIcon className="size-4" />
            Start with a template
          </p>
          <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-5">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() =>
                  onCreate(template.title, [
                    blankSlide(template.title, "Created from template"),
                  ])
                }
                className="text-left"
              >
                <div className="border-border/60 aspect-[16/10] overflow-hidden rounded-lg border transition-transform duration-200 hover:scale-[1.02]">
                  <template.render />
                </div>
                <p className="mt-2 truncate text-center text-sm">
                  {template.title}
                </p>
              </button>
            ))}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".pptx,.ppt,.pdf,.doc,.docx,.txt,.md"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) createFromFile(file);
            event.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export const SlideEditor: FC<{
  title: string;
  slides: SlideData[];
  onTitleChange: (title: string) => void;
  onSlidesChange: (slides: SlideData[]) => void;
  onGenerateWithAi: (topic: string) => void;
  onClose: () => void;
}> = ({
  title,
  slides,
  onTitleChange,
  onSlidesChange,
  onGenerateWithAi,
  onClose,
}) => {
  const [current, setCurrent] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [notesOpen, setNotesOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [chatText, setChatText] = useState("");

  const slide = slides[Math.min(current, slides.length - 1)];

  const updateSlide = (patch: Partial<SlideData>) => {
    onSlidesChange(
      slides.map((s, i) => (i === current ? { ...s, ...patch } : s)),
    );
  };

  const addSlide = () => {
    onSlidesChange([...slides, blankSlide()]);
    setCurrent(slides.length);
  };

  useEffect(() => {
    if (!presenting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPresenting(false);
      if (event.key === "ArrowRight")
        setCurrent((c) => Math.min(c + 1, slides.length - 1));
      if (event.key === "ArrowLeft") setCurrent((c) => Math.max(c - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, slides.length]);

  const sendToChat = () => {
    const text = chatText.trim();
    if (!text) return;
    setChatText("");
    onGenerateWithAi(text);
  };

  return (
    <div className="bg-background relative flex h-full flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-3">
        {renaming ? (
          <input
            autoFocus
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            onBlur={() => setRenaming(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape")
                setRenaming(false);
            }}
            className="bg-muted h-7 max-w-48 rounded-md px-2 text-sm outline-none"
          />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:bg-muted flex h-7 items-center gap-1 rounded-md px-2 text-sm font-medium transition-colors">
              <span className="max-w-48 truncate">{title}</span>
              <ChevronDownIcon className="text-muted-foreground size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom">
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                Rename
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="bg-border mx-1 h-5 w-px" />

        <button
          type="button"
          aria-label="Text style"
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <TypeIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Insert image"
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <ImageIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Undo"
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <Undo2Icon className="size-4" />
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted hover:text-foreground ml-1 flex h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-colors"
        >
          <MessageSquarePlusIcon className="size-4" />
          Add comments
        </button>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 items-center gap-1 rounded-md px-2 text-sm transition-colors">
            Fit
            <ChevronDownIcon className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom">
            {[50, 75, 100].map((level) => (
              <DropdownMenuItem key={level} onClick={() => setZoom(level)}>
                {level}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={() => setPresenting(true)}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-colors"
        >
          <PlayIcon className="size-4" />
          Present
        </button>
        <button
          type="button"
          aria-label="Download"
          onClick={() => {
            const blob = new Blob([JSON.stringify({ title, slides }, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${title || "presentation"}.json`;
            link.click();
            URL.revokeObjectURL(url);
          }}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <DownloadIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(window.location.href);
          }}
          className="bg-muted hover:bg-muted/70 flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors"
        >
          <Share2Icon className="size-3.5" />
          Share
        </button>
        <button
          type="button"
          aria-label="Close editor"
          onClick={onClose}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-56 shrink-0 flex-col border-r md:flex">
          <div className="text-muted-foreground flex h-10 items-center justify-between px-3 text-xs">
            <span>
              {slides.length} slide{slides.length === 1 ? "" : "s"}
            </span>
            <PanelLeftIcon className="size-3.5" />
          </div>
          <div className="scrollbar-subtle flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrent(index)}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-2 text-left transition-colors",
                  index === current
                    ? "border-blue-500 bg-blue-500/10"
                    : "hover:bg-muted/60",
                )}
              >
                <span className="text-muted-foreground w-3 pt-0.5 text-[10px]">
                  {index + 1}
                </span>
                <span className="block aspect-video w-full overflow-hidden rounded-sm border bg-white p-1.5 text-[#1f1f1f]">
                  <span className="block truncate text-[6px] font-semibold">
                    {item.title || "Click to add title"}
                  </span>
                  <span className="text-muted-foreground block truncate text-[5px]">
                    {item.subtitle || "Click to add subtitle"}
                  </span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={addSlide}
              aria-label="Add slide"
              className="hover:bg-muted/60 flex h-16 items-center justify-center rounded-lg border border-dashed transition-colors"
            >
              <PlusIcon className="text-muted-foreground size-4" />
            </button>
          </div>
        </div>

        <div className="bg-muted/30 flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 items-center justify-center p-8">
            <div
              style={{ transform: `scale(${zoom / 100})` }}
              className="flex aspect-video w-full max-w-3xl flex-col items-center justify-center gap-6 rounded-sm bg-white p-12 shadow-md transition-transform"
            >
              <input
                value={slide?.title ?? ""}
                onChange={(event) => updateSlide({ title: event.target.value })}
                placeholder="Click to add title"
                className="w-full bg-transparent text-center text-4xl font-bold text-[#1f1f1f] outline-none placeholder:text-[#9aa0a6] md:text-5xl"
              />
              <input
                value={slide?.subtitle ?? ""}
                onChange={(event) =>
                  updateSlide({ subtitle: event.target.value })
                }
                placeholder="Click to add subtitle"
                className="w-full bg-transparent text-center text-xl text-[#5e6063] outline-none placeholder:text-[#9aa0a6] md:text-2xl"
              />
            </div>
          </div>

          <div className="px-8 pb-24">
            <button
              type="button"
              onClick={() => setNotesOpen((open) => !open)}
              className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1 text-xs transition-colors"
            >
              <ChevronDownIcon
                className={cn("size-3.5 transition-transform", notesOpen && "rotate-180")}
              />
              Speaker notes
            </button>
            {notesOpen && (
              <textarea
                value={slide?.notes ?? ""}
                onChange={(event) => updateSlide({ notes: event.target.value })}
                placeholder="Add speaker notes for this slide..."
                className="border-border/60 bg-background focus-visible:ring-ring/40 mt-2 h-24 w-full resize-none rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
              />
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 w-full max-w-md -translate-x-1/2 px-4">
        <div className="bg-background pointer-events-auto rounded-2xl border p-3 shadow-lg">
          <p className="text-muted-foreground px-1 text-xs">New chat</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendToChat();
            }}
            className="mt-1.5 flex items-center gap-2"
          >
            <button
              type="button"
              aria-label="Add attachment"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <PlusIcon className="size-5" />
            </button>
            <input
              value={chatText}
              onChange={(event) => setChatText(event.target.value)}
              placeholder="Work with Pixelspace AI"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <button
              type="button"
              aria-label="Voice"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <MicIcon className="size-4" />
            </button>
            <Button
              type="submit"
              size="icon"
              disabled={!chatText.trim()}
              aria-label="Send"
              className="size-8 rounded-full"
            >
              <AudioLinesIcon className="size-4" />
            </Button>
          </form>
        </div>
      </div>

      {presenting && slide && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="flex aspect-video w-full max-w-5xl flex-col items-center justify-center gap-8 rounded bg-white p-16">
              <h1 className="text-center text-5xl font-bold text-[#1f1f1f]">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-center text-2xl text-[#5e6063]">
                  {slide.subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 pb-6 text-white">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
              className="hover:bg-white/10 flex size-9 items-center justify-center rounded-full transition-colors"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <span className="text-sm">
              {current + 1} / {slides.length}
            </span>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() =>
                setCurrent((c) => Math.min(c + 1, slides.length - 1))
              }
              className="hover:bg-white/10 flex size-9 items-center justify-center rounded-full transition-colors"
            >
              <ChevronRightIcon className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Exit presentation"
              onClick={() => setPresenting(false)}
              className="hover:bg-white/10 ml-4 flex size-9 items-center justify-center rounded-full transition-colors"
            >
              <XIcon className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
