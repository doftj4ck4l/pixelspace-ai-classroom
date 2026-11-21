"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { jsonFetch, patchJson } from "./api";
import {
  Chip,
  EmptyState,
  ErrorBanner,
  REQUEST_STATUS_LABELS,
  TableSkeleton,
  formatDate,
  type ChipTone,
} from "./shared";
import type { SchoolRequestRow } from "./types";

const STATUS_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Diluluskan" },
  { value: "rejected", label: "Ditolak" },
];

const statusTone = (status: string): ChipTone =>
  status === "approved"
    ? "success"
    : status === "rejected"
      ? "danger"
      : "warning";

export const RequestsTab = ({
  onChanged,
}: {
  onChanged: () => void | Promise<void>;
}) => {
  const [requests, setRequests] = useState<SchoolRequestRow[] | null>(null);
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await jsonFetch<{ requests: SchoolRequestRow[] }>(
        `/api/admin/school-requests${status === "all" ? "" : `?status=${status}`}`,
      );
      setRequests(data.requests);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (
    request: SchoolRequestRow,
    next: "approved" | "rejected",
  ) => {
    const previous = requests;
    setBusyId(request.id);
    setRequests(
      (rows) =>
        rows?.map((row) =>
          row.id === request.id ? { ...row, status: next } : row,
        ) ?? null,
    );
    try {
      await patchJson(`/api/admin/school-requests/${request.id}`, {
        status: next,
      });
      await onChanged();
      await load();
      setError(null);
    } catch (err) {
      setRequests(previous);
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Permintaan sekolah</h2>
          <p className="text-muted-foreground text-sm">
            Permintaan pendaftaran sekolah daripada pengguna.
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
        {requests === null ? (
          <TableSkeleton rows={4} cols={3} />
        ) : requests.length === 0 ? (
          <EmptyState>
            <span className="text-foreground font-medium">
              Tiada permintaan
            </span>
            <span>Permintaan pendaftaran sekolah akan muncul di sini.</span>
          </EmptyState>
        ) : (
          <div className="divide-y">
            {requests.map((request) => (
              <div
                key={request.id}
                className="hover:bg-muted/30 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">
                      {request.schoolName}
                    </span>
                    <Chip tone={statusTone(request.status)}>
                      {REQUEST_STATUS_LABELS[request.status] ?? request.status}
                    </Chip>
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {[
                      request.state,
                      request.requestedBy
                        ? `Oleh: ${request.requestedBy}`
                        : null,
                      formatDate(request.createdAt),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {request.note ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {request.note}
                    </p>
                  ) : null}
                </div>
                {request.status === "pending" ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === request.id}
                      onClick={() => void decide(request, "approved")}
                    >
                      {busyId === request.id ? (
                        <Loader2Icon className="animate-spin" />
                      ) : null}
                      Luluskan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === request.id}
                      onClick={() => void decide(request, "rejected")}
                    >
                      Tolak
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
