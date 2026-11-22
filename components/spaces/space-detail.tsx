"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BarChart3Icon,
  CheckIcon,
  CopyIcon,
  EditIcon,
  GroupIcon,
  BracesIcon,
  LayersIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  Trash2Icon,
  UserIcon,
} from "@/components/icons";
import {
  accentTheme,
  coverEmoji,
} from "@/components/assistant-ui/flashcard-deck";
import { SpaceArtwork } from "@/components/spaces/space-artwork";
import s from "./space-study.module.css";
import { SpaceSourcesPanel } from "@/components/spaces/space-sources-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const ACCENT_DOT: Record<string, string> = {
  teal: "bg-[#8fd9c8]",
  blue: "bg-sky-300",
  amber: "bg-amber-300",
  violet: "bg-violet-300",
  rose: "bg-rose-300",
  emerald: "bg-emerald-300",
};

/** A space's inner page: sources, enrolled students and engagement. */
export const SpaceDetail: FC<{ space: SpaceInfo; isOwner: boolean }> = ({
  space,
  isOwner,
}) => {
  const { language, t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sources");
  const [insights, setInsights] = useState<Insights | null>(null);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editName, setEditName] = useState(space.name);
  const [editDescription, setEditDescription] = useState(space.description);
  const [editAccent, setEditAccent] = useState(space.accent);
  const [saving, setSaving] = useState(false);
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

  const tabs = useMemo(() => {
    const base: { id: Tab; label: string; Icon: typeof LayersIcon }[] = [
      { id: "sources", label: t("spaceDetail.tab.sources"), Icon: LayersIcon },
    ];
    if (isOwner) {
      base.push(
        {
          id: "students",
          label: t("spaceDetail.tab.students"),
          Icon: GroupIcon,
        },
        {
          id: "analytics",
          label: t("spaceDetail.tab.analytics"),
          Icon: BarChart3Icon,
        },
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

  const saveEdit = async () => {
    setSaving(true);
    await fetch(`/api/spaces/${space.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        description: editDescription,
        accent: editAccent,
      }),
    }).catch(() => {});
    setSaving(false);
    setEditOpen(false);
    router.refresh();
  };

  const deleteSpace = async () => {
    setSaving(true);
    await fetch(`/api/spaces/${space.id}`, { method: "DELETE" }).catch(
      () => {},
    );
    router.push("/community");
  };

  return (
    <main className={cn("scrollbar-subtle", s.page)}>
      <div className={s.hero}>
        <svg
          className={s.waves}
          viewBox="0 0 1300 270"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M590 270 C740 230 650 145 810 112 C930 88 870 -20 1070 30 C1180 65 1200 -30 1300 0 V270Z"
            fill="#dff3ff"
            fillOpacity=".8"
          />
          <path
            d="M790 0 C720 160 1080 94 1050 188 C1160 150 1230 230 1300 205 V0Z"
            fill="#d9f2ee"
            fillOpacity=".65"
          />
        </svg>
        <div className={s.workspace}>
          <Link href="/community" className={s.back}>
            <ArrowLeftIcon className="size-4" />
            {t("spaceDetail.back")}
          </Link>

          <header className={s.header}>
            <div className={cn(s.subjectIcon, theme.cover)}>
              <span className="select-none">
                {coverEmoji(space.name, space.level) === "➗"
                  ? "÷"
                  : coverEmoji(space.name, space.level)}
              </span>
            </div>

            <div className={s.subjectInfo}>
              <h1 className={s.title}>{space.name}</h1>
              <div className={s.metadata}>
                <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 font-medium backdrop-blur dark:bg-black/30">
                  {space.level}
                </span>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => void copyCode()}
                    title={t("spaces.copyCode")}
                    className="hover:text-foreground flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 font-medium backdrop-blur transition-colors dark:bg-black/30"
                  >
                    <BracesIcon className="size-3.5" />
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
                  <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 font-medium backdrop-blur dark:bg-black/30">
                    <GroupIcon className="size-3.5" />
                    {t("spaces.students", { n: insights.summary.students })}
                  </span>
                ) : null}
                {!isOwner && space.teacher ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 font-medium backdrop-blur dark:bg-black/30">
                    <UserIcon className="size-3.5" />
                    {space.teacher}
                  </span>
                ) : null}
              </div>
              {space.description ? (
                <p className={s.description}>{space.description}</p>
              ) : null}
            </div>

            <div className={s.heroArt}>
              <SpaceArtwork />
            </div>

            <div className={s.actions}>
              {isOwner ? (
                <>
                  <Button
                    variant="outline"
                    className={s.share}
                    onClick={() => void copyCode()}
                  >
                    {copied ? (
                      <CheckIcon className="size-4 text-emerald-600" />
                    ) : (
                      <UserIcon className="size-4" />
                    )}
                    {t("spaceDetail.shareCode")}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={t("spaceDetail.moreActions")}
                      className={s.more}
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditOpen(true)}
                        className="gap-2"
                      >
                        <EditIcon className="size-4" />
                        {t("spaces.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteOpen(true)}
                        className="gap-2"
                      >
                        <Trash2Icon className="size-4" />
                        {t("spaces.deleteTitle")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : null}
            </div>
          </header>

          <div className={s.tabs} role="tablist" aria-label={space.name}>
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                role="tab"
                id={`space-tab-${item.id}`}
                aria-selected={tab === item.id}
                tabIndex={tab === item.id ? 0 : -1}
                aria-controls={`space-panel-${item.id}`}
                onKeyDown={(event) => {
                  const index = tabs.findIndex((entry) => entry.id === item.id);
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % tabs.length
                      : event.key === "ArrowLeft"
                        ? (index + tabs.length - 1) % tabs.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? tabs.length - 1
                            : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  setTab(tabs[next].id);
                  document
                    .getElementById(`space-tab-${tabs[next].id}`)
                    ?.focus();
                }}
                className={s.tab}
              >
                <item.Icon className="size-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={cn(s.workspace, s.content)}
        role="tabpanel"
        id={`space-panel-${tab}`}
        aria-labelledby={`space-tab-${tab}`}
      >
        {tab === "sources" ? (
          <SpaceSourcesPanel
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
                          {[student.yearLabel, student.className, student.email]
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
                                {t("spaceDetail.quizzes")}: {student.quizzes} ·{" "}
                                {t("spaceDetail.lastActive")}:{" "}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("spaces.edit")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("spaces.name")}</span>
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">
                {t("spaces.description")}{" "}
                <span className="text-muted-foreground">
                  {t("spaces.optional")}
                </span>
              </span>
              <input
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            <div className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("spaces.color")}</span>
              <div className="flex items-center gap-2">
                {Object.keys(ACCENT_DOT).map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => setEditAccent(color)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-transform",
                      editAccent === color && "ring-ring ring-2 ring-offset-2",
                    )}
                  >
                    <span
                      className={cn("size-5 rounded-full", ACCENT_DOT[color])}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void saveEdit()}
              disabled={saving || !editName.trim()}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("spaces.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("spaces.deleteBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteSpace()}
              disabled={saving}
            >
              {t("spaces.deleteTitle")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};
