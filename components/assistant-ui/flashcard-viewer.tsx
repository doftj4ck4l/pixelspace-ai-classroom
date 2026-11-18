"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ShuffleIcon,
  XIcon,
} from "lucide-react";
import type { FlashcardItem } from "@/components/assistant-ui/harness";
import { cn } from "@/lib/utils";

export const FlashcardViewer: FC<{
  title: string;
  cards: FlashcardItem[];
  onClose: () => void;
}> = ({ title, cards, onClose }) => {
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  const order = useMemo(() => {
    const indices = cards.map((_, index) => index);
    if (!shuffled) return indices;
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, shuffled]);

  const card = cards[order[position]];

  const go = (delta: number) => {
    setFlipped(false);
    setPosition((current) =>
      Math.min(Math.max(current + delta, 0), cards.length - 1),
    );
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards.length]);

  const download = () => {
    const blob = new Blob(
      [JSON.stringify({ title, cards }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "flashcards"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {title}
        </span>
        <span className="text-muted-foreground text-xs">
          {cards.length} card{cards.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => {
            setShuffled((s) => !s);
            setPosition(0);
            setFlipped(false);
          }}
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-colors",
            shuffled && "bg-muted text-foreground",
          )}
        >
          <ShuffleIcon className="size-4" />
          Shuffle
        </button>
        <button
          type="button"
          aria-label="Download"
          onClick={download}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <DownloadIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
        {cards.length === 0 || !card ? (
          <p className="text-muted-foreground text-sm">
            No cards yet — generate this deck with AI.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="border-border/60 bg-card flex min-h-64 w-full max-w-xl cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {flipped ? "Answer" : "Question"}
              </span>
              <span
                className={cn(
                  "text-[#1f1f1f] dark:text-[#e3e3e3]",
                  flipped
                    ? "text-lg leading-relaxed"
                    : "text-2xl font-semibold leading-snug",
                )}
              >
                {flipped ? card.back : card.front}
              </span>
              <span className="text-muted-foreground text-xs">
                {flipped ? "Tap to see the question" : "Tap to flip"}
              </span>
            </button>

            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Previous card"
                disabled={position === 0}
                onClick={() => go(-1)}
                className="hover:bg-muted flex size-9 items-center justify-center rounded-full transition-colors disabled:opacity-30"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
              <span className="text-muted-foreground w-16 text-center text-sm">
                {position + 1} / {cards.length}
              </span>
              <button
                type="button"
                aria-label="Next card"
                disabled={position === cards.length - 1}
                onClick={() => go(1)}
                className="hover:bg-muted flex size-9 items-center justify-center rounded-full transition-colors disabled:opacity-30"
              >
                <ChevronRightIcon className="size-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
