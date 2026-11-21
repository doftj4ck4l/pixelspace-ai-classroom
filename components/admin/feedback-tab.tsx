"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2Icon, PictureAsPdfIcon, Trash2Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { cn } from "@/lib/utils";
import { jsonFetch, patchJson } from "./api";
import {
  Chip,
  EmptyState,
  ErrorBanner,
  ROLE_LABELS,
  TableSkeleton,
  formatDate,
  type ChipTone,
} from "./shared";
import type { FeedbackRow } from "./types";

const STATUS_OPTIONS = [
  { value: "baru", label: "Baru" },
  { value: "dibaca", label: "Dibaca" },
  { value: "selesai", label: "Selesai" },
];

const STATUS_FILTERS = [{ value: "all", label: "Semua" }, ...STATUS_OPTIONS];

const statusTone = (status: string): ChipTone =>
  status === "selesai" ? "success" : status === "dibaca" ? "info" : "warning";

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Feedback inbox: what teachers and KPM sent from Help & support. */
export const FeedbackTab = ({
  onChanged,
}: {
  onChanged: () => void | Promise<void>;
}) => {
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await jsonFetch<{ feedback: FeedbackRow[] }>(
        "/api/feedback",
      );
      setRows(data.feedback);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setRowStatus = async (row: FeedbackRow, next: string) => {
    const previous = rows;
    setBusyId(row.id);
    setRows(
      (current) =>
        current?.map((item) =>
          item.id === row.id ? { ...item, status: next } : item,
        ) ?? null,
    );
    try {
      await patchJson(`/api/feedback/${row.id}`, { status: next });
      await onChanged();
      setError(null);
    } catch (err) {
      setRows(previous ?? null);
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: FeedbackRow) => {
    if (!window.confirm(`Padam maklum balas "${row.subject}"?`)) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/feedback/${row.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setRows(
        (current) => current?.filter((item) => item.id !== row.id) ?? null,
      );
      await onChanged();
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const visible =
    rows?.filter((row) => status === "all" || row.status === status) ?? null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Maklum balas</h2>
          <p className="text-muted-foreground text-sm">
            Maklum balas daripada guru dan KPM melalui Help & support.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatus(item.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                status === item.value
                  ? "bg-foreground text-background border-transparent"
                  : "text-muted-foreground hover:text-foreground border-border",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="bg-card overflow-hidden rounded-xl border">
        {visible === null ? (
          <TableSkeleton rows={4} cols={3} />
        ) : visible.length === 0 ? (
          <EmptyState>
            <span className="text-foreground font-medium">
              Tiada maklum balas
            </span>
            <span>Maklum balas daripada guru dan KPM akan muncul di sini.</span>
          </EmptyState>
        ) : (
          <div className="divide-y">
            {visible.map((row) => (
              <article key={row.id} className="flex flex-col gap-3 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {row.subject}
                  </span>
                  <Chip tone={statusTone(row.status)}>
                    {STATUS_OPTIONS.find(
                      (option) => option.value === row.status,
                    )?.label ?? row.status}
                  </Chip>
                </div>

                <div className="text-muted-foreground text-xs">
                  {[
                    row.name,
                    ROLE_LABELS[row.role] ?? row.role,
                    row.schoolName ?? "Tiada sekolah",
                    row.email,
                    formatDate(row.createdAt),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>

                <p className="text-sm whitespace-pre-wrap">{row.message}</p>

                {row.attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {row.attachments.map((attachment) => (
                      <a
                        key={attachment.url}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="border-border/60 hover:bg-muted/50 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors"
                      >
                        {attachment.mime === "application/pdf" ? (
                          <PictureAsPdfIcon className="size-4 text-red-500" />
                        ) : (
                          <span className="size-8 shrink-0 overflow-hidden rounded-md">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="size-full object-cover"
                            />
                          </span>
                        )}
                        <span className="max-w-44 truncate">
                          {attachment.name}
                        </span>
                        <span className="text-muted-foreground">
                          {formatSize(attachment.size)}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <FilterSelect
                    value={row.status}
                    onValueChange={(value) => void setRowStatus(row, value)}
                    options={STATUS_OPTIONS}
                    ariaLabel="Status maklum balas"
                    disabled={busyId === row.id}
                    className="h-9 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive gap-1.5"
                    disabled={busyId === row.id}
                    onClick={() => void remove(row)}
                  >
                    {busyId === row.id ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <Trash2Icon className="size-4" />
                    )}
                    Padam
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
