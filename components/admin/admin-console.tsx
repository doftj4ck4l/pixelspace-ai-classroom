"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { jsonFetch } from "./api";
import { SchoolsTab } from "./schools-tab";
import { UsersTab } from "./users-tab";
import { RequestsTab } from "./requests-tab";
import { FeedbackTab } from "./feedback-tab";
import { TextbooksTab } from "./textbooks-tab";
import type { FeedbackRow } from "./types";

type Tab = "schools" | "users" | "requests" | "feedback" | "textbooks";

export const AdminConsole = () => {
  const [tab, setTab] = useState<Tab>("schools");
  const [pendingCount, setPendingCount] = useState(0);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);

  const refreshBadges = useCallback(async () => {
    const [requests, feedback] = await Promise.allSettled([
      jsonFetch<{ pendingCount: number }>("/api/admin/school-requests"),
      jsonFetch<{ feedback: FeedbackRow[] }>("/api/feedback"),
    ]);
    setPendingCount(
      requests.status === "fulfilled" ? requests.value.pendingCount : 0,
    );
    setNewFeedbackCount(
      feedback.status === "fulfilled"
        ? feedback.value.feedback.filter((row) => row.status === "baru").length
        : 0,
    );
  }, []);

  useEffect(() => {
    void refreshBadges();
  }, [refreshBadges]);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "schools", label: "Sekolah" },
    { id: "users", label: "Pengguna" },
    { id: "requests", label: "Permintaan", badge: pendingCount },
    { id: "feedback", label: "Maklum Balas", badge: newFeedbackCount },
    { id: "textbooks", label: "Buku Teks" },
  ];

  return (
    <main className="scrollbar-subtle h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Konsol Pentadbir
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Urus sekolah, akaun pengguna, permintaan pendaftaran dan maklum
            balas daripada guru serta KPM.
          </p>
        </header>

        <div className="border-b">
          <nav className="-mb-px flex items-center gap-1" role="tablist">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  tab === item.id
                    ? "border-foreground text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {item.label}
                {item.badge ? (
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-700 dark:text-amber-400">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-5">
          {tab === "schools" ? <SchoolsTab /> : null}
          {tab === "users" ? <UsersTab /> : null}
          {tab === "requests" ? (
            <RequestsTab onChanged={refreshBadges} />
          ) : null}
          {tab === "feedback" ? (
            <FeedbackTab onChanged={refreshBadges} />
          ) : null}
          {tab === "textbooks" ? <TextbooksTab /> : null}
        </div>
      </div>
    </main>
  );
};
