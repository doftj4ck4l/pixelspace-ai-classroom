"use client";

import type { FC } from "react";
import { DownloadIcon, XIcon } from "lucide-react";
import {
  FlashcardDeck,
  type FlashcardSpec,
} from "@/components/assistant-ui/flashcard-deck";

/**
 * Full-screen deck view used from Spaces (both for decks the agent designed
 * via render_ui and for local flashcard docs).
 */
export const FlashcardViewer: FC<{
  spec: FlashcardSpec;
  onClose: () => void;
}> = ({ spec, onClose }) => {
  const download = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${spec.title ?? "flashcards"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {spec.title ?? "Kad Imbas"}
        </span>
        <span className="text-muted-foreground text-xs">
          {spec.cards.length} card{spec.cards.length === 1 ? "" : "s"}
        </span>
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

      <div className="flex flex-1 justify-center overflow-y-auto p-4 md:p-8">
        <FlashcardDeck spec={spec} variant="full" />
      </div>
    </div>
  );
};
