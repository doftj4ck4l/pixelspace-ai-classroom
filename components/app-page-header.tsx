import type { ComponentType, ReactNode } from "react";
import { SparklesIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/** The fixed page header used by Hub, Textbooks, Spaces and Duties. */
export function AppPageHeader({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  actions,
}: {
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: ReactNode;
  subtitle: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl",
            iconClassName ?? "bg-muted/60 text-foreground",
          )}
        >
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
        </div>
        <div
          aria-hidden="true"
          className="relative ml-auto hidden h-24 w-56 shrink-0 md:block"
        >
          <div className="absolute top-1/2 right-0 size-24 -translate-y-1/2 rounded-full bg-[#8fd9c8]/50 blur-2xl dark:bg-[#0f4f4a]/60" />
          <div className="border-border/60 bg-card absolute top-1/2 right-8 h-16 w-28 -translate-y-1/2 rotate-6 rounded-xl border shadow-sm" />
          <div className="border-border/60 bg-card absolute top-1/2 right-14 h-16 w-28 -translate-y-1/2 -rotate-3 rounded-xl border shadow-md" />
          <div className="border-border/60 bg-card absolute top-1/2 right-12 flex h-16 w-28 -translate-y-1/2 items-center justify-center rounded-xl border text-2xl shadow-lg">
            💡
          </div>
          <SparklesIcon className="absolute top-1 right-0 size-4 text-amber-400" />
          <SparklesIcon className="absolute right-24 bottom-0 size-3 text-amber-400" />
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3 max-sm:w-full">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
