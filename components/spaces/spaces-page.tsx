"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import {
  AddIcon,
  BookOpenIcon,
  CopyIcon,
  EditIcon,
  GroupIcon,
  KeyIcon,
  LayersIcon,
  LoginIcon,
  LogoutIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserIcon,
} from "@/components/icons";
import { AppPageHeader } from "@/components/app-page-header";
import {
  accentTheme,
  coverEmoji,
} from "@/components/assistant-ui/flashcard-deck";
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
import { FilterSelect } from "@/components/ui/filter-select";
import { SpaceSources } from "@/components/spaces/space-sources";
import { useT } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type SpaceRow = {
  id: string;
  name: string;
  level: string;
  description: string;
  accent: string;
  teacher: string;
  createdAt: string;
  code?: string;
  members?: number;
};

const ALL_LEVELS = [
  "Tahun 1",
  "Tahun 2",
  "Tahun 3",
  "Tahun 4",
  "Tahun 5",
  "Tahun 6",
  "Tingkatan 1",
  "Tingkatan 2",
  "Tingkatan 3",
  "Tingkatan 4",
  "Tingkatan 5",
  "Umum",
];

/** School type drives which levels a teacher can pick. */
const levelsForSchool = (type?: string) =>
  type === "primary"
    ? ALL_LEVELS.filter((level) => level.startsWith("Tahun"))
    : type === "secondary"
      ? ALL_LEVELS.filter((level) => level.startsWith("Tingkatan"))
      : ALL_LEVELS;

const ACCENT_DOT: Record<string, string> = {
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
};

export const SpacesPage: FC<{
  role: "teacher" | "student";
  onOpenSpace?: (id: string) => void;
}> = ({ role, onOpenSpace }) => {
  const isTeacher = role === "teacher";
  const t = useT();
  const router = useRouter();
  const [rows, setRows] = useState<SpaceRow[] | null>(null);
  const [school, setSchool] = useState<{ name: string; type: string } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SpaceRow | null>(null);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("Tingkatan 4");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState("teal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SpaceRow | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [predicted, setPredicted] = useState<{
    subject: string;
    title: string | null;
  } | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => {
    fetch("/api/spaces", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            spaces?: SpaceRow[];
            school?: { name: string; type: string } | null;
          } | null,
        ) => {
          setRows(data?.spaces ?? []);
          if (data?.school) setSchool(data.school);
        },
      )
      .catch(() => setRows([]));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!dialogOpen || editing || name.trim().length < 2) {
      setPredicted(null);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/textbooks/match?name=${encodeURIComponent(name.trim())}&level=${encodeURIComponent(level)}`,
        );
        const data = (await res.json().catch(() => null)) as {
          subject?: string | null;
          title?: string | null;
        } | null;
        setPredicted(
          data?.subject
            ? { subject: data.subject, title: data.title ?? null }
            : null,
        );
      } catch {
        setPredicted(null);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [dialogOpen, editing, name, level]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setLevel(levelsForSchool(school?.type)[0] ?? "Tingkatan 4");
    setDescription("");
    setAccent("teal");
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: SpaceRow) => {
    setEditing(row);
    setName(row.name);
    setLevel(row.level);
    setDescription(row.description);
    setAccent(row.accent);
    setError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { name, level, description, accent };
      const res = editing
        ? await fetch(`/api/spaces/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/spaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Gagal menyimpan subjek.");
        return;
      }
      setDialogOpen(false);
      load();
    } catch {
      setError("Gagal menyimpan subjek.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: SpaceRow) => {
    setRows((prev) => (prev ?? []).filter((item) => item.id !== row.id));
    await fetch(`/api/spaces/${row.id}`, { method: "DELETE" }).catch(() => {});
  };

  const join = async () => {
    if (!joinCode.trim() || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch("/api/spaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setJoinError(data?.error ?? "Gagal menyertai subjek.");
        return;
      }
      setJoinOpen(false);
      setJoinCode("");
      load();
    } catch {
      setJoinError("Gagal menyertai subjek.");
    } finally {
      setJoining(false);
    }
  };

  const leave = async (row: SpaceRow) => {
    setRows((prev) => (prev ?? []).filter((item) => item.id !== row.id));
    await fetch(`/api/spaces/${row.id}/leave`, { method: "POST" }).catch(
      () => {},
    );
  };

  const copyCode = (row: SpaceRow) => {
    if (!row.code) return;
    void navigator.clipboard.writeText(row.code).catch(() => {});
    setCopied(row.id);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((row) => {
      if (
        q &&
        !`${row.name} ${row.level} ${row.description}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, query]);

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 sm:px-8 sm:py-8">
        <AppPageHeader
          icon={GroupIcon}
          iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-300"
          title={t("spaces.title")}
          subtitle={
            isTeacher
              ? t("spaces.subtitle.teacher")
              : t("spaces.subtitle.student")
          }
          actions={
            <>
              <div className="relative max-sm:w-full">
                <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("spaces.searchPlaceholder")}
                  aria-label={t("common.search")}
                  className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 w-56 rounded-full border pr-3 pl-9 text-sm outline-none focus-visible:ring-2 max-sm:w-full md:w-64"
                />
              </div>
              {isTeacher ? (
                <Button
                  onClick={openCreate}
                  className="h-9 gap-2 rounded-full px-4 text-sm"
                >
                  <AddIcon className="size-4" />
                  {t("spaces.add")}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setJoinError(null);
                    setJoinOpen(true);
                  }}
                  className="h-9 gap-2 rounded-full px-4 text-sm"
                >
                  <LoginIcon className="size-4" />
                  {t("spaces.joinTitle")}
                </Button>
              )}
            </>
          }
        />

        {rows === null ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="bg-muted/30 h-64 animate-pulse rounded-3xl"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-border/60 mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
            <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
              <GroupIcon className="text-muted-foreground size-5" />
            </span>
            <p className="text-sm font-medium">
              {query ? "Tiada subjek sepadan" : "Belum ada subjek"}
            </p>
            <p className="text-muted-foreground max-w-md text-sm">
              {isTeacher
                ? "Tambah subjek yang anda ajar di sini — contohnya Matematik Tambahan Tingkatan 4 atau Matematik Moden Tingkatan 5."
                : "Masukkan kod subjek daripada guru anda untuk menyertai."}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((row) => {
              const theme = accentTheme(row.accent);
              return (
                <div
                  key={row.id}
                  onClick={() =>
                    onOpenSpace
                      ? onOpenSpace(row.id)
                      : router.push(`/community/${row.id}`)
                  }
                  className={cn(
                    "group relative overflow-hidden rounded-3xl border border-white/60 p-2.5 transition-shadow hover:shadow-lg dark:border-white/10",
                    theme.cover,
                    "cursor-pointer",
                  )}
                >
                  <div className="relative z-10 flex items-center gap-1.5">
                    <span className="text-foreground flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium backdrop-blur dark:bg-black/30">
                      <LayersIcon className="size-3.5" />
                      {row.level}
                    </span>
                    {isTeacher ? (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="ml-auto flex items-center justify-center rounded-full bg-white/70 backdrop-blur dark:bg-black/30 [&_button]:size-6"
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={t("spaces.menuAria")}
                            className="text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(row)}>
                              <EditIcon className="size-4" />
                              Sunting
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setPendingDelete(row)}
                              className="text-destructive"
                            >
                              <Trash2Icon className="size-4" />
                              Padam
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="ml-auto flex items-center justify-center rounded-full bg-white/70 backdrop-blur dark:bg-black/30 [&_button]:size-6"
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={t("spaces.menuAria")}
                            className="text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => void leave(row)}
                              className="text-destructive"
                            >
                              <LogoutIcon className="size-4" />
                              Keluar dari subjek
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  <div className="relative flex h-28 items-center justify-center sm:h-32">
                    <div
                      aria-hidden="true"
                      className="absolute -top-6 -left-6 size-24 rounded-full bg-white/40 blur-2xl dark:bg-white/10"
                    />
                    <span className="relative text-6xl drop-shadow-sm select-none">
                      {coverEmoji(row.name, row.level)}
                    </span>
                  </div>

                  <div className="relative z-10 rounded-2xl bg-white/75 p-3 backdrop-blur-md dark:bg-black/35">
                    <p
                      className="truncate text-sm font-semibold"
                      title={row.name}
                    >
                      {row.name}
                    </p>
                    <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
                      <UserIcon className="size-3.5" />
                      <span className="truncate">{row.teacher}</span>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">{row.level}</span>
                    </div>
                    {isTeacher && row.code ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          copyCode(row);
                        }}
                        className="text-muted-foreground hover:bg-muted/60 hover:text-foreground mt-2 flex h-7 w-full items-center justify-between gap-2 rounded-lg px-2 text-[11px] font-medium transition-colors"
                        title={t("spaces.copyCode")}
                      >
                        <span className="flex items-center gap-1.5">
                          <KeyIcon className="size-3.5" />
                          Kod: {row.code}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {row.members ?? 0} pelajar
                          {copied === row.id ? (
                            <span className="text-emerald-600">
                              {t("spaces.copied")}
                            </span>
                          ) : (
                            <CopyIcon className="size-3.5" />
                          )}
                        </span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {isTeacher ? (
              <button
                type="button"
                onClick={openCreate}
                className="border-border/60 hover:bg-muted/40 flex min-h-[248px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center transition-colors"
              >
                <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
                  <PlusIcon className="size-5" />
                </span>
                <span className="text-sm font-semibold">Tambah subjek</span>
                <span className="text-muted-foreground max-w-44 text-xs">
                  Contoh: Matematik Tambahan Tingkatan 4
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setJoinError(null);
                  setJoinOpen(true);
                }}
                className="border-border/60 hover:bg-muted/40 flex min-h-[248px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center transition-colors"
              >
                <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
                  <LoginIcon className="size-5" />
                </span>
                <span className="text-sm font-semibold">Sertai dengan kod</span>
                <span className="text-muted-foreground max-w-44 text-xs">
                  Masukkan kod subjek yang diberikan guru anda
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("spaces.joinTitle")}</DialogTitle>
            <DialogDescription>
              Masukkan kod 6 aksara daripada guru anda.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("spaces.code")}</span>
            <input
              value={joinCode}
              onChange={(event) =>
                setJoinCode(event.target.value.toUpperCase())
              }
              placeholder="cth. MT4X7K"
              maxLength={8}
              className="border-border/60 bg-background focus-visible:ring-ring/40 h-11 rounded-xl border px-3 text-center font-mono text-base tracking-[0.3em] uppercase outline-none focus-visible:ring-2"
            />
          </label>
          {joinError && <p className="text-destructive text-sm">{joinError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => void join()}
              disabled={joining || joinCode.trim().length < 4}
              className="gap-2"
            >
              <LoginIcon className="size-4" />
              {t("spaces.join")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("spaces.edit") : t("spaces.add")}
            </DialogTitle>
            <DialogDescription>
              Subjek ini akan kelihatan kepada pelajar di sekolah anda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("spaces.name")}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("spaces.namePlaceholder")}
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            {!editing && name.trim().length >= 2 ? (
              predicted ? (
                <p className="text-muted-foreground -mt-1 flex items-center gap-1.5 text-xs">
                  <BookOpenIcon className="size-3.5 shrink-0 text-emerald-600" />
                  {t("spaces.textbookMatch")}:{" "}
                  <span className="text-foreground font-medium">
                    {predicted.title ?? predicted.subject}
                  </span>
                </p>
              ) : (
                <p className="text-muted-foreground -mt-1 text-xs">
                  {t("spaces.noTextbookMatch")}
                </p>
              )
            ) : null}
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("spaces.level")}</span>
              <FilterSelect
                value={level}
                onValueChange={setLevel}
                ariaLabel="Tahap"
                options={Array.from(
                  new Set([
                    ...levelsForSchool(school?.type),
                    ...(level ? [level] : []),
                  ]),
                ).map((value) => ({ value, label: value }))}
                className="border-border/60 focus-visible:ring-ring/40 h-10 w-full rounded-xl px-3"
              />
              {school && (
                <span className="text-muted-foreground text-xs">
                  {school.name} ·{" "}
                  {school.type === "primary"
                    ? "Sekolah Rendah"
                    : school.type === "secondary"
                      ? "Sekolah Menengah"
                      : "Tahap bebas"}
                </span>
              )}
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">
                {t("spaces.description")}{" "}
                <span className="text-muted-foreground">
                  {t("spaces.optional")}
                </span>
              </span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("spaces.descriptionPlaceholder")}
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
                    onClick={() => setAccent(color)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-transform",
                      accent === color && "ring-ring ring-2 ring-offset-2",
                    )}
                  >
                    <span
                      className={cn("size-5 rounded-full", ACCENT_DOT[color])}
                    />
                  </button>
                ))}
              </div>
            </div>
            {editing ? (
              <SpaceSources spaceId={editing.id} level={editing.level} />
            ) : null}
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void save()}
              disabled={saving || !name.trim()}
            >
              {editing ? t("common.save") : t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("spaces.deleteTitle")}</DialogTitle>
            <DialogDescription>
              &ldquo;{pendingDelete?.name}&rdquo; akan dipadam dan tidak lagi
              kelihatan kepada pelajar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Batal
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                if (pendingDelete) void remove(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Padam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
