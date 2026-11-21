"use client";

import { TrophyIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { StudentSummary } from "./student-home";

const BADGES: Record<string, { emoji: string; hint: string; cover: string }> = {
  "first-artifact": {
    emoji: "🎨",
    hint: "Hasilkan artifak pertama anda",
    cover:
      "from-pink-200/80 to-rose-100/60 dark:from-pink-950/60 dark:to-rose-950/40",
  },
  "chats-10": {
    emoji: "💬",
    hint: "Hantar 10 sembang",
    cover:
      "from-sky-200/80 to-cyan-100/60 dark:from-sky-950/60 dark:to-cyan-950/40",
  },
  "cards-50": {
    emoji: "🃏",
    hint: "Kuasai 50 kad imbas",
    cover:
      "from-amber-200/80 to-orange-100/60 dark:from-amber-950/60 dark:to-orange-950/40",
  },
  "quizzes-5": {
    emoji: "✅",
    hint: "Selesaikan 5 kuiz",
    cover:
      "from-teal-200/80 to-emerald-100/60 dark:from-teal-950/60 dark:to-emerald-950/40",
  },
  "quiz-ace": {
    emoji: "🏆",
    hint: "Skor 80%+ dalam satu kuiz",
    cover:
      "from-yellow-200/80 to-amber-100/60 dark:from-yellow-950/60 dark:to-amber-950/40",
  },
  "map-master": {
    emoji: "🗺️",
    hint: "Kuasai 5 nod peta pembelajaran",
    cover:
      "from-violet-200/80 to-purple-100/60 dark:from-violet-950/60 dark:to-purple-950/40",
  },
  "streak-7": {
    emoji: "🔥",
    hint: "Belajar 7 hari berturut-turut",
    cover:
      "from-red-200/80 to-orange-100/60 dark:from-red-950/60 dark:to-orange-950/40",
  },
};

export const Achievements = ({
  achievements,
}: {
  achievements: StudentSummary["achievements"] | null;
}) => {
  const earnedCount = achievements?.filter((badge) => badge.earned).length ?? 0;
  const total = achievements?.length ?? Object.keys(BADGES).length;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <TrophyIcon className="size-4 text-amber-500" />
            Pencapaian
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Kumpul lencana sambil anda belajar.
          </p>
        </div>
        {achievements && (
          <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium tabular-nums">
            {earnedCount}/{total} diperoleh
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {achievements === null
          ? Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="border-border/60 bg-card h-28 animate-pulse rounded-3xl border"
              />
            ))
          : achievements.map((badge) => {
              const meta = BADGES[badge.id] ?? {
                emoji: "🏅",
                hint: badge.label,
                cover:
                  "from-slate-200/80 to-slate-100/60 dark:from-slate-900/60 dark:to-slate-950/40",
              };
              return (
                <div
                  key={badge.id}
                  title={meta.hint}
                  className={cn(
                    "border-border/60 bg-card relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl border p-4 text-center transition-all duration-200",
                    badge.earned
                      ? "hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      : "opacity-45 grayscale",
                  )}
                >
                  {badge.earned && (
                    <div
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
                        meta.cover,
                      )}
                    />
                  )}
                  <span className="relative text-3xl">
                    {badge.earned ? meta.emoji : "🔒"}
                  </span>
                  <span className="relative text-xs leading-snug font-medium">
                    {badge.label}
                  </span>
                </div>
              );
            })}
      </div>
    </section>
  );
};
