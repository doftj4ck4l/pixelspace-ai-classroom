"use client";

import { useCallback, useEffect, useState, type FC } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DocumentPreview } from "@/components/assistant-ui/document-preview";

type ArtifactJson = {
  id: string;
  title: string;
  kind?: "file" | "spec";
  url?: string;
  updatedAt?: string;
};

/** /spaces/reports/<artifactId> — a shared report as its own page. */
const ReportPage: FC = () => {
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
          This report could not be found.
        </p>
        <Link
          href="/spaces/reports"
          className="text-foreground text-sm underline"
        >
          Back to Reports
        </Link>
      </div>
    );
  }

  if (!artifact || !artifactId) {
    return (
      <div className="bg-muted/30 m-6 h-64 animate-pulse rounded-2xl border" />
    );
  }

  return (
    <DocumentPreview
      key={version}
      artifactId={artifactId}
      title={artifact.title}
      downloads={
        artifact.url ? [{ name: artifact.title, url: artifact.url }] : []
      }
      onClose={() => router.push("/spaces/reports")}
    />
  );
};

export default ReportPage;
