"use client";

import { useEffect, useState, type FC } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FlashcardViewer } from "@/components/assistant-ui/flashcard-viewer";
import { type FlashcardSpec } from "@/components/assistant-ui/flashcard-deck";

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

  useEffect(() => {
    const id = params?.artifactId;
    if (!id) return;
    let cancelled = false;
    fetch(`/api/pi/artifacts/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ArtifactJson | null) => {
        if (cancelled) return;
        if (!data || data.kind !== "spec" || !data.spec) {
          setMissing(true);
          return;
        }
        setSpec(data.spec as FlashcardSpec);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [params]);

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

  return (
    <FlashcardViewer
      spec={spec}
      deckId={params?.artifactId}
      onClose={() => router.push("/spaces/flashcards")}
    />
  );
};

export default DeckPage;
