"use client";

import type { FC, ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The app's single-select control (shadcn/Base UI dropdown menu) — used
 * everywhere a native <select> would otherwise appear, so filters, form
 * pickers and row actions all share one consistent design.
 */

export type FilterSelectOption = { value: string; label: string };

export const FilterSelect: FC<{
  value: string;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  id?: string;
  children?: ReactNode;
}> = ({
  value,
  onValueChange,
  options,
  placeholder = "—",
  ariaLabel,
  disabled,
  className,
  contentClassName,
  id,
}) => {
  const current = options.find((option) => option.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        render={
          <button
            type="button"
            className={cn(
              "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex h-8 items-center justify-between gap-2 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
          />
        }
      >
        <span className="min-w-0 truncate">
          {current?.label ?? placeholder}
        </span>
        <ChevronDownIcon className="text-muted-foreground size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("max-w-80 min-w-44", contentClassName)}
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <span className="truncate">{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
