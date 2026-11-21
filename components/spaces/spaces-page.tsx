"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import {
  AddIcon,
  EditIcon,
  GroupIcon,
  LayersIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserIcon,
} from "@/components/icons";
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
import { cn } from "@/lib/utils";

type SpaceRow = {
  id: string;
  name: string;
  level: string;
  description: string;
  accent: string;
  teacher: string;
  createdAt: string;
};

const LEVELS = [
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

const ACCENT_DOT: Record<string, string> = {
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
};

const TABS = [
  { id: "all", label: "Semua", Icon: LayersIcon },
  { id: "rendah", label: "Rendah", Icon: GroupIcon },
  { id: "menengah", label: "Menengah", Icon: GroupIcon },
] as const;

export const SpacesPage: FC<{ role: "teacher" | "student" }> = ({ role }) => {
  const isTeacher = role === "teacher";
  const [rows, setRows] = useState<SpaceRow[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
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

  const load = () => {
    fetch("/api/spaces", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { spaces?: SpaceRow[] } | null) =>
        setRows(data?.spaces ?? []),
      )
      .catch(() => setRows([]));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setLevel("Tingkatan 4");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((row) => {
      if (tab === "rendah" && !row.level.startsWith("Tahun")) return false;
      if (tab === "menengah" && !row.level.startsWith("Tingkatan"))
        return false;
      if (
        q &&
        !`${row.name} ${row.level} ${row.description}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, tab, query]);

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
              <GroupIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold sm:text-3xl">Spaces</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {isTeacher
                  ? "Tambah subjek yang anda ajar — pelajar di sekolah anda akan melihatnya di sini."
                  : "Subjek yang dikongsi oleh guru sekolah anda."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 max-sm:w-full">
            <div className="relative max-sm:w-full">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search subjects..."
                aria-label="Search"
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 w-56 rounded-full border pr-3 pl-9 text-sm outline-none focus-visible:ring-2 max-sm:w-full md:w-64"
              />
            </div>
            {isTeacher && (
              <Button
                onClick={openCreate}
                className="h-9 gap-2 rounded-full px-4 text-sm"
              >
                <AddIcon className="size-4" />
                Tambah subjek
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="scrollbar-subtle -mx-1 flex max-w-full items-center gap-1.5 overflow-x-auto px-1 pb-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors sm:px-4",
                  tab === item.id
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <item.Icon className="size-3.5 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

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
                : "Guru sekolah anda belum menambah subjek lagi. Semak semula nanti."}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((row) => {
              const theme = accentTheme(row.accent);
              return (
                <div
                  key={row.id}
                  onClick={isTeacher ? () => openEdit(row) : undefined}
                  className={cn(
                    "group relative overflow-hidden rounded-3xl border border-white/60 p-2.5 transition-shadow hover:shadow-lg dark:border-white/10",
                    theme.cover,
                    isTeacher && "cursor-pointer",
                  )}
                >
                  <div className="relative z-10 flex items-center gap-1.5">
                    <span className="text-foreground flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium backdrop-blur dark:bg-black/30">
                      <LayersIcon className="size-3.5" />
                      {row.level}
                    </span>
                    {isTeacher && (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="ml-auto flex items-center justify-center rounded-full bg-white/70 opacity-0 backdrop-blur transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 dark:bg-black/30 [&_button]:size-6"
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label="Pilihan subjek"
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
                  </div>
                </div>
              );
            })}

            {isTeacher && (
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
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sunting subjek" : "Tambah subjek"}
            </DialogTitle>
            <DialogDescription>
              Subjek ini akan kelihatan kepada pelajar di sekolah anda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Nama subjek</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="cth. Matematik Tambahan"
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Tahap</span>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              >
                {LEVELS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">
                Keterangan{" "}
                <span className="text-muted-foreground">(pilihan)</span>
              </span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="cth. Bab 1–5, KSSM"
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            <div className="grid gap-1.5 text-sm">
              <span className="font-medium">Warna</span>
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
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => void save()}
              disabled={saving || !name.trim()}
            >
              {editing ? "Simpan" : "Tambah"}
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
            <DialogTitle>Padam subjek?</DialogTitle>
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
