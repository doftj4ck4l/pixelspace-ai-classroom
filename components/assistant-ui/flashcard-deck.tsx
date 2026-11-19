"use client";

import { useMemo, useState, type FC } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LightbulbIcon,
  ShuffleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The rich flashcard deck, rendered from a `render_ui` flashcards spec — the
 * same block inline in chat and full-screen from Spaces. The model designs the
 * content (count, tags, hints, types, accent); this renders any combination.
 */

export type FlashcardItem = {
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  type?: "term" | "question" | "cloze" | "formula";
};

export type FlashcardSpec = {
  title?: string;
  subject?: string;
  language?: string;
  accent?: string;
  cards: FlashcardItem[];
};

type AccentTheme = {
  header: string;
  bar: string;
  chip: string;
  badge: string;
  cardRing: string;
};

const ACCENTS: Record<string, AccentTheme> = {
  teal: {
    header: "from-teal-500/15 via-teal-500/5 to-transparent",
    bar: "bg-teal-500",
    chip: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
    badge: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    cardRing: "ring-teal-500/20",
  },
  blue: {
    header: "from-blue-500/15 via-blue-500/5 to-transparent",
    bar: "bg-blue-500",
    chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    cardRing: "ring-blue-500/20",
  },
  amber: {
    header: "from-amber-500/15 via-amber-500/5 to-transparent",
    bar: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    cardRing: "ring-amber-500/20",
  },
  violet: {
    header: "from-violet-500/15 via-violet-500/5 to-transparent",
    bar: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    cardRing: "ring-violet-500/20",
  },
  rose: {
    header: "from-rose-500/15 via-rose-500/5 to-transparent",
    bar: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    cardRing: "ring-rose-500/20",
  },
  emerald: {
    header: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    bar: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    cardRing: "ring-emerald-500/20",
  },
};

const TYPE_LABEL: Record<NonNullable<FlashcardItem["type"]>, string> = {
  term: "Istilah",
  question: "Soalan",
  cloze: "Isi tempat kosong",
  formula: "Formula",
};

export const FlashcardDeck: FC<{
  spec: FlashcardSpec;
  variant?: "inline" | "full";
}> = ({ spec, variant = "inline" }) => {
  const theme = ACCENTS[spec.accent ?? "teal"] ?? ACCENTS.teal;
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  const order = useMemo(() => {
    const indices = spec.cards.map((_, index) => index);
    if (!shuffled) return indices;
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.cards, shuffled]);

  const card = spec.cards[order[position]];
  const total = spec.cards.length;

  const go = (delta: number) => {
    setFlipped(false);
    setHintOpen(false);
    setPosition((current) => Math.min(Math.max(current + delta, 0), total - 1));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") go(-1);
    else if (event.key === "ArrowRight") go(1);
    else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setFlipped((f) => !f);
    }
  };

  if (!card) {
    return (
      <div className="text-muted-foreground border-border/60 my-4 rounded-xl border border-dashed p-4 text-sm">
        This deck has no cards.
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "border-border/60 bg-card my-4 overflow-hidden rounded-2xl border outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        variant === "inline" ? "w-full max-w-xl" : "w-full max-w-2xl",
      )}
    >
      <div className={cn("bg-gradient-to-r px-4 py-3", theme.header)}>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {spec.title ?? "Kad Imbas"}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
              theme.chip,
            )}
          >
            {position + 1} / {total}
          </span>
        </div>
        {spec.subject ? (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {spec.subject}
          </p>
        ) : null}
      </div>

      <div className="h-1 w-full bg-muted/60">
        <div
          className={cn("h-full transition-all duration-300", theme.bar)}
          style={{ width: `${((position + 1) / total) * 100}%` }}
        />
      </div>

      <div
        className={cn("px-4", variant === "inline" ? "py-4" : "py-6")}
      >
        <button
          type="button"
          onClick={() => {
            setFlipped((f) => !f);
            setHintOpen(false);
          }}
          className="block w-full text-left"
          aria-label={flipped ? "Show the question" : "Show the answer"}
        >
          <div
            className={cn(
              "border-border/60 flex flex-col items-center justify-center gap-3 rounded-xl border px-5 text-center ring-1 ring-inset transition-colors",
              theme.cardRing,
              variant === "inline" ? "min-h-40 py-6" : "min-h-64 py-10",
            )}
          >
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {card.type ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                    theme.badge,
                  )}
                >
                  {TYPE_LABEL[card.type] ?? card.type}
                </span>
              ) : null}
              {card.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              {flipped ? "Jawapan" : "Soalan"}
            </span>

            <span
              className={cn(
                "text-foreground",
                flipped
                  ? "text-base leading-relaxed"
                  : "text-xl font-semibold leading-snug",
                card.type === "formula" && "font-mono text-lg",
              )}
            >
              {flipped ? card.back : card.front}
            </span>

            {!flipped && (
              <span className="text-muted-foreground text-xs">
                Klik untuk flip
              </span>
            )}
          </div>
        </button>

        {card.hint ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setHintOpen((open) => !open)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            >
              <LightbulbIcon className="size-3.5" />
              {hintOpen ? "Sembunyi petunjuk" : "Petunjuk"}
            </button>
            {hintOpen && (
              <p className="text-muted-foreground mt-1 text-xs italic">
                {card.hint}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="border-border/60 flex items-center justify-center gap-3 border-t px-4 py-2.5">
        <button
          type="button"
          aria-label="Kad sebelumnya"
          disabled={position === 0}
          onClick={() => go(-1)}
          className="hover:bg-muted flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="text-muted-foreground w-14 text-center text-xs tabular-nums">
          {position + 1} / {total}
        </span>
        <button
          type="button"
          aria-label="Kad seterusnya"
          disabled={position === total - 1}
          onClick={() => go(1)}
          className="hover:bg-muted flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
        >
          <ChevronRightIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setShuffled((s) => !s);
            setPosition(0);
            setFlipped(false);
            setHintOpen(false);
          }}
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground ml-2 flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition-colors",
            shuffled && "bg-muted text-foreground",
          )}
        >
          <ShuffleIcon className="size-3.5" />
          Acak
        </button>
      </div>
    </div>
  );
};
