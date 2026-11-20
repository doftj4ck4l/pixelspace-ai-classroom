"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const ROLE_LABELS: Record<string, string> = {
  student: "Pelajar",
  teacher: "Guru",
  kpm: "KPM",
  superadmin: "Pentadbir",
};

export const SCHOOL_TYPE_LABELS: Record<string, string> = {
  primary: "Rendah",
  secondary: "Menengah",
};

export const USER_STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  suspended: "Digantung",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  approved: "Diluluskan",
  rejected: "Ditolak",
};

export type ChipTone = "neutral" | "success" | "warning" | "danger" | "info";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "border-border bg-muted/60 text-muted-foreground",
  success:
    "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning:
    "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  info: "border-sky-600/20 bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

export const Chip = ({
  tone = "neutral",
  className,
  children,
}: {
  tone?: ChipTone;
  className?: string;
  children: ReactNode;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
      CHIP_TONES[tone],
      className,
    )}
  >
    {children}
  </span>
);

export const ErrorBanner = ({ message }: { message: string | null }) =>
  message ? (
    <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
      {message}
    </div>
  ) : null;

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="text-muted-foreground flex flex-col items-center justify-center gap-1 px-4 py-12 text-center text-sm">
    {children}
  </div>
);

export const TableSkeleton = ({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) => (
  <div className="divide-y">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            className={cn("h-4", colIndex === 0 ? "w-40" : "w-24")}
          />
        ))}
      </div>
    ))}
  </div>
);

export const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2 text-sm outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

export const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};
