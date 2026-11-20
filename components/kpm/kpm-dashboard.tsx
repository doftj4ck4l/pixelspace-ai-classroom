"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheckIcon,
  InboxIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  SchoolIcon,
  TargetIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KpmStatTile } from "@/components/kpm/kpm-stat-tile";
import {
  ArtifactsByTypeChart,
  DailyActivityChart,
  TopSchoolsChart,
} from "@/components/kpm/kpm-charts";
import { KpmSchoolsTable } from "@/components/kpm/kpm-schools-table";
import { KpmSkeleton } from "@/components/kpm/kpm-skeleton";
import type {
  OverviewResponse,
  RangeDays,
  SchoolOption,
  SchoolsResponse,
} from "@/components/kpm/types";

const RANGES: RangeDays[] = [7, 30, 90];

const nf = new Intl.NumberFormat("ms-MY");

export const KpmDashboard = () => {
  const [days, setDays] = useState<RangeDays>(30);
  const [schoolId, setSchoolId] = useState("");
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/schools")
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)),
      )
      .then((body: SchoolsResponse) => {
        if (!cancelled) setSchools(body.schools ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ days: String(days) });
    if (schoolId) params.set("schoolId", schoolId);
    setLoading(true);
    fetch(`/api/analytics/overview?${params.toString()}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)),
      )
      .then((body: OverviewResponse) => {
        if (cancelled) return;
        setData(body);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, schoolId, reloadKey]);

  const hasActivity = useMemo(() => {
    if (!data) return false;
    const { totals } = data;
    return (
      totals.activeUsers > 0 ||
      totals.chats > 0 ||
      totals.artifacts > 0 ||
      totals.quizAttempts > 0
    );
  }, [data]);

  const showSkeleton = loading && !data;

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6 sm:px-8 sm:py-8">
        <header className="flex items-start gap-3">
          <span className="bg-muted/60 flex size-12 shrink-0 items-center justify-center rounded-2xl">
            <LayoutDashboardIcon className="size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              KPM Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Pandangan keseluruhan aktiviti pembelajaran mengikut sekolah.
            </p>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="bg-muted/60 flex items-center gap-0.5 rounded-full p-1">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDays(range)}
                className={cn(
                  "h-7 rounded-full px-3 text-xs font-medium transition-colors",
                  days === range
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {range} hari
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Sekolah
            </span>
            <select
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
              className="border-border/60 bg-background focus-visible:ring-ring/40 h-8 max-w-64 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2"
            >
              <option value="">Semua sekolah</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {showSkeleton ? (
          <KpmSkeleton />
        ) : error ? (
          <div className="border-border/60 mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
            <span className="bg-muted/60 text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
              <TriangleAlertIcon className="size-6" />
            </span>
            <div>
              <p className="font-medium">Gagal memuatkan data</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Sila cuba sebentar lagi.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              <RefreshCwIcon className="size-3.5" />
              Cuba lagi
            </Button>
          </div>
        ) : data ? (
          <div
            className={cn(
              "mt-6 flex flex-col gap-4 transition-opacity",
              loading && "opacity-60",
            )}
          >
            {hasActivity ? (
              <>
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <KpmStatTile
                    icon={SchoolIcon}
                    label="Sekolah aktif"
                    value={nf.format(data.totals.activeSchools)}
                  />
                  <KpmStatTile
                    icon={UsersIcon}
                    label="Pengguna aktif"
                    value={nf.format(data.totals.activeUsers)}
                  />
                  <KpmStatTile
                    icon={MessageSquareIcon}
                    label="Sembang"
                    value={nf.format(data.totals.chats)}
                  />
                  <KpmStatTile
                    icon={LayersIcon}
                    label="Artifak"
                    value={nf.format(data.totals.artifacts)}
                  />
                  <KpmStatTile
                    icon={ClipboardCheckIcon}
                    label="Cubaan kuiz"
                    value={nf.format(data.totals.quizAttempts)}
                  />
                  <KpmStatTile
                    icon={TargetIcon}
                    label="Skor kuiz purata"
                    value={`${data.totals.avgQuizScore}%`}
                  />
                </section>

                <DailyActivityChart data={data.daily} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <ArtifactsByTypeChart data={data.artifactsByType} />
                  <TopSchoolsChart data={data.topSchools} />
                </div>

                {data.schools.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-lg font-semibold">
                      Prestasi mengikut sekolah
                    </h2>
                    <KpmSchoolsTable schools={data.schools} />
                  </section>
                )}
              </>
            ) : (
              <div className="border-border/60 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
                <span className="bg-muted/60 text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                  <InboxIcon className="size-6" />
                </span>
                <div>
                  <p className="font-medium">Belum ada data untuk tempoh ini</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Aktiviti guru dan pelajar akan muncul di sini apabila mereka
                    mula menggunakan ruang pembelajaran.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
