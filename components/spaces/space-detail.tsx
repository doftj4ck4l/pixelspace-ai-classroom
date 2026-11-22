"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CopyIcon,
  GroupIcon,
  KeyIcon,
  Loader2Icon,
  UserIcon,
} from "@/components/icons";
import {
  accentTheme,
  coverEmoji,
} from "@/components/assistant-ui/flashcard-deck";
import { SpaceSources } from "@/components/spaces/space-sources";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SpaceInfo = {
  id: string;
  name: string;
  level: string;
  description: string;
  accent: string;
  code: string;
  teacher: string;
};

type StudentRow = {
  id: string;
  name: string;
  email: string;
  yearLabel: string | null;
  className: string | null;
  joinedAt: string;
  chats: number;
  artifacts: number;
  quizzes: number;
  lastActive: string | null;
};

type Insights = {
  summary: {
    students: number;
    activeThisWeek: number;
    chats: number;
    quizzes: number;
  };
  students: StudentRow[];
};

type Tab = "sources" | "students" | "analytics";

/** A space's inner page: sources, enrolled students and engagement. */
export const SpaceDetail: FC<{ space: SpaceInfo; isOwner: boolean }> = ({
  space,
  isOwner,
}) => {
  const { language, t } = useI18n();
  const [tab, setTab] = useState<Tab>("sources");
  const [insights, setInsights] = useState<Insights | null>(null);
  const [copied, setCopied] = useState(false);
  const theme = accentTheme(space.accent);

  useEffect(() => {
    if (!isOwner) return;
    fetch(`/api/spaces/${space.id}/insights`)
      .then((res) => res.json())
      .then((data: Insights) => setInsights(data))
      .catch(() => setInsights(null));
  }, [isOwner, space.id]);

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Intl.DateTimeFormat(language === "ms" ? "ms-MY" : "en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  };

  const tabs: { id: Tab; label: string }[] = useMemo(() => {
    const base: { id: Tab; label: string }[] = [
      { id: "sources", label: t("spaceDetail.tab.sources") },
    ];
    if (isOwner) {
      base.push(
        { id: "students", label: t("spaceDetail.tab.students") },
        { id: "analytics", label: t("spaceDetail.tab.analytics") },
      );
    }
    return base;
  }, [isOwner, t]);

  const maxScore = useMemo(() => {
    if (!insights?.students.length) return 1;
    return Math.max(
      1,
      ...insights.students.map(
        (student) => student.chats + student.quizzes * 2 + student.artifacts,
      ),
    );
  }, [insights]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(space.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the code is on screen anyway
    }
  };

  return (
    <main className="scrollbar-subtle h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <Link
          href="/community"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          {t("spaceDetail.back")}
        </Link>

        <header className="mt-4 flex flex-wrap items-center gap-4">
          <div
            className={cn(
              "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
              theme.cover,
            )}
          >
            <span className="relative text-4xl drop-shadow-sm select-none">
              {coverEmoji(space.name, space.level)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {space.name}
            </h1>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="bg-muted/60 rounded-full px-2 py-0.5 text-xs font-medium">
                {space.level}
              </span>
              {!isOwner && space.teacher ? (
                <span className="flex items-center gap-1">
                  <UserIcon className="size-3.5" />
                  {space.teacher}
                </span>
              ) : null}
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  title={t("spaces.copyCode")}
                  className="hover:bg-muted/60 hover:text-foreground flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
                >
                  <KeyIcon className="size-3.5" />
                  {t("spaces.code")}: {space.code}
                  {copied ? (
                    <span className="text-emerald-600">
                      {t("spaces.copied")}
                    </span>
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                </button>
              ) : null}
              {isOwner && insights ? (
                <span className="flex items-center gap-1 text-xs">
                  <GroupIcon className="size-3.5" />
                  {t("spaces.students", { n: insights.summary.students })}
                </span>
              ) : null}
            </div>
            {space.description ? (
              <p className="text-muted-foreground mt-2 text-sm">
                {space.description}
              </p>
            ) : null}
          </div>
        </header>

        <div className="scrollbar-subtle -mx-1 mt-5 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === item.id
                  ? "bg-foreground text-background border-transparent"
                  : "text-muted-foreground hover:text-foreground border-border",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "sources" ? (
            <SpaceSources
              spaceId={space.id}
              level={space.level}
              readOnly={!isOwner}
            />
          ) : null}

          {tab === "students" ? (
            <section className="flex flex-col gap-3">
              {insights === null ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : insights.students.length === 0 ? (
                <div className="border-border/60 text-muted-foreground rounded-2xl border border-dashed px-4 py-12 text-center text-sm">
                  {t("spaceDetail.noStudents")}
                </div>
              ) : (
                <div className="bg-card overflow-hidden rounded-2xl border">
                  <div className="divide-y">
                    {insights.students.map((student) => (
                      <div
                        key={student.id}
                        className="hover:bg-muted/30 flex flex-wrap items-center gap-3 px-4 py-3"
                      >
                        <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                          {student.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {student.name}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {[
                              student.yearLabel,
                              student.className,
                              student.email,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                          <span className="bg-muted/60 rounded-full px-2 py-0.5">
                            {t("spaceDetail.joined")}:{" "}
                            {formatDate(student.joinedAt)}
                          </span>
                          <span className="bg-muted/60 rounded-full px-2 py-0.5">
                            {t("spaceDetail.chats")}: {student.chats}
                          </span>
                          <span className="bg-muted/60 rounded-full px-2 py-0.5">
                            {t("spaceDetail.quizzes")}: {student.quizzes}
                          </span>
                          <span className="hidden sm:inline">
                            {t("spaceDetail.lastActive")}:{" "}
                            {formatDate(student.lastActive) ??
                              t("spaceDetail.never")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {tab === "analytics" ? (
            <section className="flex flex-col gap-4">
              {insights === null ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      {
                        label: t("spaceDetail.summary.students"),
                        value: insights.summary.students,
                      },
                      {
                        label: t("spaceDetail.activeWeek"),
                        value: insights.summary.activeThisWeek,
                      },
                      {
                        label: t("spaceDetail.summary.chats"),
                        value: insights.summary.chats,
                      },
                      {
                        label: t("spaceDetail.summary.quizzes"),
                        value: insights.summary.quizzes,
                      },
                    ].map((tile) => (
                      <div
                        key={tile.label}
                        className="bg-card rounded-2xl border px-4 py-3"
                      >
                        <p className="text-2xl font-semibold">{tile.value}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {tile.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-card rounded-2xl border px-4 py-4">
                    <h2 className="text-sm font-semibold">
                      {t("spaceDetail.engagement")}
                    </h2>
                    <div className="mt-3 flex flex-col gap-3">
                      {insights.students.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          {t("spaceDetail.noStudents")}
                        </p>
                      ) : (
                        insights.students.map((student) => {
                          const score =
                            student.chats +
                            student.quizzes * 2 +
                            student.artifacts;
                          return (
                            <div key={student.id} className="grid gap-1">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="truncate font-medium">
                                  {student.name}
                                </span>
                                <span className="text-muted-foreground shrink-0">
                                  {t("spaceDetail.chats")}: {student.chats} ·{" "}
                                  {t("spaceDetail.quizzes")}: {student.quizzes}{" "}
                                  · {t("spaceDetail.lastActive")}:{" "}
                                  {formatDate(student.lastActive) ??
                                    t("spaceDetail.never")}
                                </span>
                              </div>
                              <div className="bg-muted h-2 overflow-hidden rounded-full">
                                <div
                                  className="bg-foreground/70 h-full rounded-full transition-[width]"
                                  style={{
                                    width: `${Math.max(4, Math.round((score / maxScore) * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
};
