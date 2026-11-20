"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Artifact = {
  id: string;
  title: string;
  type: string;
  createdAt: string;
};

type ProgressEntry = { known: number; total: number };

const MODULE_META: Record<
  string,
  {
    label: string;
    unit: string;
    emoji: string;
    cover: string;
    bar: string;
  }
> = {
  flashcards: {
    label: "Kad imbas",
    unit: "kad",
    emoji: "🃏",
    cover:
      "bg-gradient-to-br from-amber-300/50 via-orange-200/40 to-yellow-100/30 dark:from-amber-900/60 dark:via-orange-950/50 dark:to-yellow-950/40",
    bar: "bg-amber-400",
  },
  quizzes: {
    label: "Kuiz",
    unit: "soalan",
    emoji: "❓",
    cover:
      "bg-gradient-to-br from-teal-300/50 via-emerald-200/40 to-cyan-100/30 dark:from-teal-900/60 dark:via-emerald-950/50 dark:to-cyan-950/40",
    bar: "bg-teal-500",
  },
  mindmaps: {
    label: "Peta pembelajaran",
    unit: "konsep",
    emoji: "🗺️",
    cover:
      "bg-gradient-to-br from-violet-300/50 via-purple-200/40 to-fuchsia-100/30 dark:from-violet-900/60 dark:via-purple-950/50 dark:to-fuchsia-950/40",
    bar: "bg-violet-500",
  },
};

const MODULE_ORDER = ["flashcards", "quizzes", "mindmaps"] as const;

export const ContinueLearning = () => {
  const [artifacts, setArtifacts] = useState<Artifact[] | null>(null);
  const [progress, setProgress] = useState<Record<string, ProgressEntry>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pi/artifacts")
      .then((res) => res.json())
      .then((data: { artifacts?: Artifact[] }) => {
        if (!cancelled) setArtifacts(data.artifacts ?? []);
      })
      .catch(() => {
        if (!cancelled) setArtifacts([]);
      });
    Promise.all([
      fetch("/api/decks/progress")
        .then((res) => res.json())
        .catch(() => ({})),
      fetch("/api/quizzes/progress")
        .then((res) => res.json())
        .catch(() => ({})),
      fetch("/api/mindmaps/progress")
        .then((res) => res.json())
        .catch(() => ({})),
    ])
      .then(
        ([decks, quizzes, mindmaps]: [
          {
            progress?: {
              deckId: string;
              knownCount: number;
              total: number;
            }[];
          },
          {
            progress?: {
              quizId: string;
              correctCount: number;
              total: number;
            }[];
          },
          {
            progress?: {
              mapId: string;
              masteredCount: number;
              total: number;
            }[];
          },
        ]) => {
          if (cancelled) return;
          const map: Record<string, ProgressEntry> = {};
          for (const row of decks.progress ?? []) {
            map[row.deckId] = { known: row.knownCount, total: row.total };
          }
          for (const row of quizzes.progress ?? []) {
            map[row.quizId] = {
              known: row.correctCount,
              total: row.total,
            };
          }
          for (const row of mindmaps.progress ?? []) {
            map[row.mapId] = {
              known: row.masteredCount,
              total: row.total,
            };
          }
          setProgress(map);
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = useMemo(
    () =>
      (artifacts ?? [])
        .filter((artifact) =>
          (MODULE_ORDER as readonly string[]).includes(artifact.type),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [artifacts],
  );

  return (
    <section>
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BookOpenIcon className="size-4 text-teal-600" />
          Sambung belajar
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Teruskan dari tempat anda berhenti.
        </p>
      </div>

      {artifacts === null ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="border-border/60 bg-card h-36 animate-pulse rounded-3xl border"
            />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="border-border/60 text-muted-foreground mt-4 flex flex-col items-center gap-2 rounded-3xl border border-dashed px-6 py-10 text-center text-sm">
          <span className="text-3xl">🌱</span>
          Belum ada hasil kerja — mulakan dengan Cipta pantas di atas!
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((artifact) => {
            const meta = MODULE_META[artifact.type];
            if (!meta) return null;
            const row = progress[artifact.id];
            const total = row?.total ?? 0;
            const known = row?.known ?? 0;
            const pct =
              total > 0 ? Math.min(100, Math.round((known / total) * 100)) : 0;
            return (
              <Link
                key={artifact.id}
                href={`/spaces/${artifact.type}/${artifact.id}`}
                className="group border-border/60 bg-card hover:border-border overflow-hidden rounded-3xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div
                  className={cn(
                    "relative flex h-20 items-center justify-center",
                    meta.cover,
                  )}
                >
                  <span className="text-4xl drop-shadow-sm select-none">
                    {meta.emoji}
                  </span>
                  <span className="bg-background/85 absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 text-[11px] font-medium">
                    {meta.label}
                  </span>
                </div>
                <div className="p-4">
                  <p
                    className="truncate text-sm font-semibold"
                    title={artifact.title}
                  >
                    {artifact.title}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="bg-muted/70 h-1.5 flex-1 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          "h-full transition-all duration-500 motion-reduce:transition-none",
                          meta.bar,
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium tabular-nums">
                      {known}/{total || "?"} {meta.unit}
                    </span>
                    <ChevronRightIcon className="text-muted-foreground size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};
