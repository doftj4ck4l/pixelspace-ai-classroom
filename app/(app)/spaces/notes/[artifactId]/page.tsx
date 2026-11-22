"use client";

import { useCallback, useEffect, useState, type FC } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { NotesViewer } from "@/components/assistant-ui/notes-viewer";
import { ArtifactAiPanel } from "@/components/assistant-ui/artifact-ai-panel";
import {
  type NotesSection,
  type NotesSpec,
} from "@/components/assistant-ui/notes-viewer";

type ArtifactJson = {
  id: string;
  title: string;
  kind?: "file" | "spec";
  spec?: unknown;
  updatedAt?: string;
  owner?: boolean;
};

/** /spaces/notes/<artifactId> — structured study notes as their own page. */
const NotesPage: FC = () => {
  const params = useParams<{ artifactId: string }>();
  const router = useRouter();
  const [spec, setSpec] = useState<NotesSpec | null>(null);
  const [version, setVersion] = useState(0);
  const [missing, setMissing] = useState(false);
  const [owner, setOwner] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrefill, setAiPrefill] = useState<{
    text: string;
    nonce: number;
  } | null>(null);
  const [focusedSection, setFocusedSection] = useState<number | null>(null);

  const artifactId = params?.artifactId;

  const load = useCallback(() => {
    if (!artifactId) return;
    fetch(`/api/pi/artifacts/${artifactId}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ArtifactJson | null) => {
        if (!data || data.kind !== "spec" || !data.spec) {
          setMissing(true);
          return;
        }
        setMissing(false);
        setOwner(data.owner !== false);
        setSpec(data.spec as NotesSpec);
        setVersion((value) => value + 1);
      })
      .catch(() => setMissing(true));
  }, [artifactId]);

  useEffect(load, [load]);

  if (missing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">
          These notes could not be found.
        </p>
        <Link
          href="/spaces/notes"
          className="text-foreground text-sm underline"
        >
          Back to Notes
        </Link>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="bg-muted/30 m-6 h-64 animate-pulse rounded-2xl border" />
    );
  }

  const improveSection = (index: number, section: NotesSection) => {
    setFocusedSection(index);
    setAiPrefill({
      text: `Improve the section "${section.heading}" (id ${section.id}): make it clearer for a school student while keeping the same content and section ids.`,
      nonce: Date.now(),
    });
  };

  return (
    <>
      <NotesViewer
        key={version}
        spec={spec}
        variant="full"
        notesId={artifactId}
        initialIndex={focusedSection ?? undefined}
        onClose={() => router.push("/spaces/notes")}
        onSectionChange={setFocusedSection}
        onImproveSection={owner ? improveSection : undefined}
      />
      {artifactId && owner && (
        <ArtifactAiPanel
          artifactId={artifactId}
          kind="notes"
          open={aiOpen}
          onOpenChange={setAiOpen}
          prefill={aiPrefill}
          focusedIndex={focusedSection}
          onDeckUpdated={load}
        />
      )}
    </>
  );
};

export default NotesPage;
