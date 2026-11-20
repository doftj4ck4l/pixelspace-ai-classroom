"use client";

import { Mascot } from "@/components/mascots/Mascot";
import type { MascotState } from "@/components/mascots/types";
import { cn } from "@/lib/utils";
import type { StudentSummary } from "./student-home";

const GoalRing = ({ done }: { done: boolean }) => {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="7"
          className="stroke-muted"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={done ? 0 : circumference}
          className="stroke-amber-400 transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xl">
        {done ? "✅" : "🎯"}
      </div>
    </div>
  );
};

const Chip = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <span
    className={cn(
      "border-border/60 bg-background/70 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium shadow-sm backdrop-blur-sm",
      className,
    )}
  >
    {children}
  </span>
);

const Stat = ({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: number;
  label: string;
}) => (
  <div className="border-border/50 bg-background/60 flex min-w-0 flex-col items-center gap-0.5 rounded-2xl border px-3 py-2 backdrop-blur-sm">
    <span className="text-base leading-none">{emoji}</span>
    <span className="text-lg leading-tight font-semibold tabular-nums">
      {value}
    </span>
    <span className="text-muted-foreground truncate text-[11px]">{label}</span>
  </div>
);

export const HeroCard = ({
  name,
  displayName,
  summary,
  mascotState,
}: {
  name: string;
  displayName: string | null;
  summary: StudentSummary | null;
  mascotState: MascotState;
}) => {
  const ready = summary !== null;
  return (
    <section className="border-border/60 relative overflow-hidden rounded-3xl border bg-gradient-to-br from-teal-100/80 via-amber-50 to-orange-100/80 p-5 sm:p-7 dark:from-teal-950/60 dark:via-amber-950/30 dark:to-orange-950/50">
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 size-48 rounded-full bg-amber-200/50 blur-3xl dark:bg-amber-500/10"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 left-1/3 size-52 rounded-full bg-teal-200/50 blur-3xl dark:bg-teal-500/10"
      />
      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-end">
        <div className="shrink-0">
          <Mascot character="pixi" state={mascotState} size={160} />
        </div>
        <div className="min-w-0 flex-1 text-center sm:pb-2 sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Selamat kembali, {displayName ?? name}!
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
            {summary?.todayActive
              ? "Hebat! Sasaran harian hari ini sudah selesai. 🎉"
              : "Jom mula belajar — siapkan satu aktiviti untuk capai sasaran harian!"}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Chip className="border-orange-200/70 bg-orange-50/80 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300">
              🔥 {ready ? `${summary.streakDays} hari` : "—"}
            </Chip>
            <Chip className="border-amber-200/70 bg-amber-50/80 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              ⚡ {ready ? `${summary.xp} XP` : "—"}
            </Chip>
            <Chip className="border-teal-200/70 bg-teal-50/80 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300">
              🏅 {ready ? `Level ${summary.level}` : "—"}
            </Chip>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5 sm:pb-2">
          <GoalRing done={!!summary?.todayActive} />
          <span className="text-muted-foreground text-xs font-medium">
            Sasaran harian
          </span>
        </div>
      </div>
      <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          emoji="🃏"
          value={summary?.cardsMastered ?? 0}
          label="Kad dikuasai"
        />
        <Stat
          emoji="🧠"
          value={summary?.quizzesDone ?? 0}
          label="Kuiz selesai"
        />
        <Stat emoji="🗺️" value={summary?.mapsMastered ?? 0} label="Nod peta" />
        <Stat
          emoji="📋"
          value={summary?.checklistDone ?? 0}
          label="Senarai semak"
        />
      </div>
    </section>
  );
};
