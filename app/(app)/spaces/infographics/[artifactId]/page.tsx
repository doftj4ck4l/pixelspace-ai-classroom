"use client";

import { useCallback, useEffect, useState, type FC } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ImageViewer } from "@/components/assistant-ui/image-viewer";

type ArtifactJson = {
  id: string;
  title: string;
  kind?: "file" | "spec";
  url?: string;
  updatedAt?: string;
};

/** /spaces/infographics/<artifactId> — an infographic as its own page. */
const InfographicPage: FC = () => {
  const params = useParams<{ artifactId: string }>();
  const router = useRouter();
  const [artifact, setArtifact] = useState<ArtifactJson | null>(null);
  const [version, setVersion] = useState(0);
  const [missing, setMissing] = useState(false);

  const artifactId = params?.artifactId;

  const load = useCallback(() => {
    if (!artifactId) return;
    fetch(`/api/pi/artifacts/${artifactId}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ArtifactJson | null) => {
        if (!data || data.kind !== "file" || !data.url) {
          setMissing(true);
          return;
        }
        setMissing(false);
        setArtifact(data);
        setVersion((value) => value + 1);
      })
      .catch(() => setMissing(true));
  }, [artifactId]);

  useEffect(load, [load]);

  if (missing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">
          This infographic could not be found.
        </p>
        <Link
          href="/spaces/infographics"
          className="text-foreground text-sm underline"
        >
          Back to Infographics
        </Link>
      </div>
    );
  }

  if (!artifact || !artifactId || !artifact.url) {
    return (
      <div className="bg-muted/30 m-6 h-64 animate-pulse rounded-2xl border" />
    );
  }

  return (
    <ImageViewer
      key={version}
      artifactId={artifactId}
      title={artifact.title}
      url={artifact.url}
      downloads={[{ name: artifact.title, url: artifact.url }]}
      onClose={() => router.push("/spaces/infographics")}
    />
  );
};

export default InfographicPage;
