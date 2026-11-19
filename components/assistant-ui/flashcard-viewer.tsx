"use client";

import type { FC } from "react";
import {
  FlashcardDeck,
  type FlashcardSpec,
} from "@/components/assistant-ui/flashcard-deck";

/**
 * Full-area deck view used from Spaces. The deck itself owns the study
 * experience (flip, grid, present, review rounds); this only frames it.
 */
export const FlashcardViewer: FC<{
  spec: FlashcardSpec;
  onClose: () => void;
}> = ({ spec, onClose }) => (
  <div className="bg-background h-full overflow-hidden">
    <FlashcardDeck spec={spec} variant="full" onClose={onClose} />
  </div>
);
