"use client";

import { useCallback, useEffect, useState, type FC } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FlashcardViewer } from "@/components/assistant-ui/flashcard-viewer";
import { DeckAiPanel } from "@/components/assistant-ui/deck-ai-panel";
import {
  type FlashcardItem,
  type FlashcardSpec,
} from "@/components/assistant-ui/flashcard-deck";

type ArtifactJson = {
  id: string;
  title: string;
  kind?: "file" | "spec";
  spec?: unknown;
};

/** /spaces/flashcards/<artifactId> — a shared deck as its own page. */
const DeckPage: FC = () => {
  const params = useParams<{ artifactId: string }>();
  const router = useRouter();
  const [spec, setSpec] = useState<FlashcardSpec | null>(null);
  const [missing, setMissing] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrefill, setAiPrefill] = useState<{
    text: string;
    nonce: number;
  } | null>(null);
  const [focusedCard, setFocusedCard] = useState<number | null>(null);

  const artifactId = params?.artifactId;

  const load = useCallback(() => {
    if (!artifactId) return;
    fetch(`/api/pi/artifacts/${artifactId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ArtifactJson | null) => {
        if (!data || data.kind !== "spec" || !data.spec) {
          setMissing(true);
          return;
        }
        setMissing(false);
        setSpec(data.spec as FlashcardSpec);
      })
      .catch(() => setMissing(true));
  }, [artifactId]);

  useEffect(load, [load]);

  if (missing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">
          This deck could not be found.
        </p>
        <Link
          href="/spaces/flashcards"
          className="text-foreground text-sm underline"
        >
          Back to Flashcards
        </Link>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="bg-muted/30 m-6 h-64 animate-pulse rounded-2xl border" />
    );
  }

  const improveCard = (index: number, card: FlashcardItem) => {
    setFocusedCard(index);
    setAiPrefill({
      text: `Improve card ${index + 1} ("${card.front}"): make it clearer and easier to remember while keeping the same meaning.`,
      nonce: Date.now(),
    });
  };

  return (
    <>
      <FlashcardViewer
        spec={spec}
        deckId={artifactId}
        onClose={() => router.push("/spaces/flashcards")}
        onCardChange={setFocusedCard}
        onImproveCard={improveCard}
      />
      {artifactId && (
        <DeckAiPanel
          artifactId={artifactId}
          open={aiOpen}
          onOpenChange={setAiOpen}
          prefill={aiPrefill}
          focusedCardIndex={focusedCard}
          onDeckUpdated={load}
        />
      )}
    </>
  );
};

export default DeckPage;
