import type { LucideIcon } from "@/components/icons";

export const KpmStatTile = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <div className="border-border/60 bg-card rounded-2xl border p-4">
    <div className="flex items-center gap-2.5">
      <span className="bg-muted/60 text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-4" />
      </span>
      <span className="text-muted-foreground text-xs leading-snug font-medium">
        {label}
      </span>
    </div>
    <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
  </div>
);
