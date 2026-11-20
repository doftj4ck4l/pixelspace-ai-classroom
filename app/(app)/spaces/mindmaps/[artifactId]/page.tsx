"use client";

import { useCallback, useEffect, useState, type FC } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LearningMapViewer } from "@/components/assistant-ui/learning-map-viewer";
import { ArtifactAiPanel } from "@/components/assistant-ui/artifact-ai-panel";
import {
  type MindMapNode,
  type MindMapSpec,
} from "@/components/assistant-ui/learning-map";

type ArtifactJson = {
  id: string;
  title: string;
  kind?: "file" | "spec";
  spec?: unknown;
  updatedAt?: string;
};

/** /spaces/mindmaps/<artifactId> — a learning map as its own page. */
const MindMapPage: FC = () => {
  const params = useParams<{ artifactId: string }>();
  const router = useRouter();
  const [spec, setSpec] = useState<MindMapSpec | null>(null);
  const [version, setVersion] = useState(0);
  const [missing, setMissing] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrefill, setAiPrefill] = useState<{
    text: string;
    nonce: number;
  } | null>(null);
  const [focusedNode, setFocusedNode] = useState<number | null>(null);

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
        setSpec(data.spec as MindMapSpec);
        setVersion((value) => value + 1);
      })
      .catch(() => setMissing(true));
  }, [artifactId]);

  useEffect(load, [load]);

  if (missing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">
          This learning map could not be found.
        </p>
        <Link
          href="/spaces/mindmaps"
          className="text-foreground text-sm underline"
        >
          Back to Learning Map
        </Link>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="bg-muted/30 m-6 h-64 animate-pulse rounded-2xl border" />
    );
  }

  const improveNode = (index: number, node: MindMapNode) => {
    setFocusedNode(index);
    setAiPrefill({
      text: `Improve the node "${node.label}" (id ${node.id}): make its summary and details clearer for a school student while keeping the same topic and structure.`,
      nonce: Date.now(),
    });
  };

  return (
    <>
      <LearningMapViewer
        key={version}
        spec={spec}
        mapId={artifactId}
        initialIndex={focusedNode ?? undefined}
        onClose={() => router.push("/spaces/mindmaps")}
        onNodeChange={setFocusedNode}
        onImproveNode={improveNode}
      />
      {artifactId && (
        <ArtifactAiPanel
          artifactId={artifactId}
          kind="mindmaps"
          open={aiOpen}
          onOpenChange={setAiOpen}
          prefill={aiPrefill}
          focusedIndex={focusedNode}
          onDeckUpdated={load}
        />
      )}
    </>
  );
};

export default MindMapPage;
