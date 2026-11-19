"use client";

import type { FC } from "react";
import {
  FlashcardDeck,
  type FlashcardItem,
  type FlashcardSpec,
} from "@/components/assistant-ui/flashcard-deck";

/**
 * Full-area deck view used from Spaces. The deck itself owns the study
 * experience (flip, grid, present, review rounds); this only frames it.
 */
export const FlashcardViewer: FC<{
  spec: FlashcardSpec;
  deckId?: string;
  onClose: () => void;
  onEdit?: () => void;
  onImproveCard?: (index: number, card: FlashcardItem) => void;
}> = ({ spec, deckId, onClose, onEdit, onImproveCard }) => (
  <div className="bg-background h-full overflow-hidden">
    <FlashcardDeck
      spec={spec}
      variant="full"
      deckId={deckId}
      onClose={onClose}
      onEdit={onEdit}
      onImproveCard={onImproveCard}
    />
  </div>
);
