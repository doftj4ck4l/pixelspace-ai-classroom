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
  KeyIcon,
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

/** The little 3D book + set square, drawn inline so it travels with the app. */
const SpaceIllustration: FC = () => (
  <svg viewBox="0 0 280 170" className="h-36 w-auto" aria-hidden="true">
    <defs>
      <linearGradient id="spaceBook" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#5ed0b8" />
        <stop offset="1" stopColor="#1b8a7f" />
      </linearGradient>
      <linearGradient id="spaceTri" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c9b8f5" />
        <stop offset="1" stopColor="#7a5cd6" />
      </linearGradient>
    </defs>
    <ellipse cx="150" cy="154" rx="96" ry="11" fill="#0f6f63" opacity="0.08" />
    <g transform="rotate(-5 130 96)">
      <rect
        x="58"
        y="48"
        width="140"
        height="96"
        rx="12"
        fill="url(#spaceBook)"
      />
      <rect
        x="72"
        y="56"
        width="112"
        height="80"
        rx="8"
        fill="#ffffff"
        opacity="0.92"
      />
      <rect x="72" y="56" width="112" height="14" rx="7" fill="#d8f3ec" />
      <rect x="86" y="82" width="70" height="6" rx="3" fill="#8fd9c8" />
      <rect x="86" y="96" width="84" height="6" rx="3" fill="#cdeee8" />
      <rect x="86" y="110" width="56" height="6" rx="3" fill="#cdeee8" />
      <rect x="170" y="40" width="16" height="34" rx="4" fill="#ffd166" />
    </g>
    <g transform="translate(178 76)">
      <path d="M0 70 L76 70 L76 0 Z" fill="url(#spaceTri)" opacity="0.92" />
      <path
        d="M0 70 L76 70 L76 0 Z"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      <circle cx="58" cy="34" r="6" fill="#ffffff" opacity="0.85" />
      <line
        x1="12"
        y1="62"
        x2="28"
        y2="62"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="2"
      />
      <line
        x1="20"
        y1="50"
        x2="32"
        y2="50"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="2"
      />
    </g>
  </svg>
);

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
    <main className="scrollbar-subtle h-full overflow-y-auto">
      <div className="relative overflow-hidden">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="spaceWave1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d9f6ef" stopOpacity="0.95" />
              <stop offset="1" stopColor="#eefaf6" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="spaceWave2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e8f7f2" stopOpacity="0.7" />
              <stop offset="1" stopColor="#f4fbf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 0 H1200 V140 C1000 84 760 226 480 176 C260 138 90 196 0 156 Z"
            fill="url(#spaceWave1)"
          />
          <path
            d="M0 0 H1200 V84 C980 36 720 166 430 118 C230 84 80 128 0 98 Z"
            fill="url(#spaceWave2)"
          />
        </svg>

        <div className="relative mx-auto w-full max-w-5xl px-4 pt-6 pb-3 md:px-8">
          <Link
            href="/community"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeftIcon className="size-4" />
            {t("spaceDetail.back")}
          </Link>

          <header className="mt-4 flex flex-wrap items-start gap-4">
            <div
              className={cn(
                "flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl shadow-sm",
                theme.cover,
              )}
            >
              <span className="text-4xl drop-shadow-sm select-none">
                {coverEmoji(space.name, space.level)}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-3xl font-bold tracking-tight">
                {space.name}
              </h1>
              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 font-medium backdrop-blur dark:bg-black/30">
                  <LayersIcon className="size-3.5" />
                  {space.level}
                </span>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => void copyCode()}
                    title={t("spaces.copyCode")}
                    className="hover:text-foreground flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 font-medium backdrop-blur transition-colors dark:bg-black/30"
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
                <p className="text-muted-foreground mt-2 text-sm">
                  {space.description}
                </p>
              ) : null}
            </div>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              {isOwner ? (
                <>
                  <Button
                    variant="outline"
                    className="h-10 gap-2 rounded-full border-white/70 bg-white/70 px-4 backdrop-blur dark:border-white/10 dark:bg-black/30"
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
                      className="flex size-10 items-center justify-center rounded-full border border-white/70 bg-white/70 backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-black/30"
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

            <div className="ml-auto hidden xl:block">
              <SpaceIllustration />
            </div>
          </header>

          <div className="mt-4 flex items-center gap-1.5">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  tab === item.id
                    ? "bg-[#d8f3ec] text-[#0f6f63] shadow-sm dark:bg-[#12312e] dark:text-[#8fd9c8]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-black/20",
                )}
              >
                <item.Icon className="size-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pt-2 pb-10 md:px-8">
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
