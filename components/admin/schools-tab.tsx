"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/filter-select";
import { cn } from "@/lib/utils";
import { jsonFetch, patchJson, postJson } from "./api";
import {
  EmptyState,
  ErrorBanner,
  SCHOOL_TYPE_LABELS,
  TableSkeleton,
} from "./shared";
import type { SchoolRow } from "./types";

const TYPE_OPTIONS = [
  { value: "primary", label: "Sekolah Rendah" },
  { value: "secondary", label: "Sekolah Menengah" },
];

export const SchoolsTab = () => {
  const [schools, setSchools] = useState<SchoolRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SchoolRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolRow | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await jsonFetch<{ schools: SchoolRow[] }>(
        "/api/admin/schools",
      );
      setSchools(data.schools);
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

  const toggleActive = async (school: SchoolRow) => {
    const next = !school.isActive;
    setSchools(
      (rows) =>
        rows?.map((row) =>
          row.id === school.id ? { ...row, isActive: next } : row,
        ) ?? null,
    );
    try {
      await patchJson(`/api/admin/schools/${school.id}`, { isActive: next });
      setError(null);
    } catch (err) {
      setSchools(
        (rows) =>
          rows?.map((row) =>
            row.id === school.id ? { ...row, isActive: school.isActive } : row,
          ) ?? null,
      );
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Sekolah</h2>
          <p className="text-muted-foreground text-sm">
            Senarai sekolah berdaftar dan bilangan pengguna.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          Tambah sekolah
        </Button>
      </div>

      <ErrorBanner message={error} />

      <div className="bg-card overflow-hidden rounded-xl border">
        {schools === null ? (
          <TableSkeleton rows={5} cols={6} />
        ) : schools.length === 0 ? (
          <EmptyState>
            <span className="text-foreground font-medium">Tiada sekolah</span>
            <span>Tambahkan sekolah pertama untuk mula.</span>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs font-medium tracking-wide uppercase">
                  <th className="px-4 py-2.5 font-medium">Nama</th>
                  <th className="px-4 py-2.5 font-medium">Jenis</th>
                  <th className="px-4 py-2.5 font-medium">Negeri</th>
                  <th className="px-4 py-2.5 font-medium">Daerah</th>
                  <th className="px-4 py-2.5 font-medium">Pengguna</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{school.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {school.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {SCHOOL_TYPE_LABELS[school.type] ?? school.type}
                    </td>
                    <td className="px-4 py-3">{school.state ?? "—"}</td>
                    <td className="px-4 py-3">{school.district ?? "—"}</td>
                    <td className="px-4 py-3">{school.userCount}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={school.isActive}
                        onClick={() => void toggleActive(school)}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                          school.isActive
                            ? "bg-emerald-600"
                            : "bg-muted-foreground/30",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
                            school.isActive && "translate-x-4",
                          )}
                        />
                        <span className="sr-only">
                          {school.isActive ? "Nyahaktifkan" : "Aktifkan"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditTarget(school)}
                        >
                          <PencilIcon />
                          <span className="sr-only">Sunting</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(school)}
                        >
                          <Trash2Icon />
                          <span className="sr-only">Padam</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SchoolFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={load}
      />
      <SchoolFormDialog
        open={editTarget !== null}
        school={editTarget ?? undefined}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSaved={load}
      />
      <DeleteSchoolDialog
        school={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={load}
      />
    </section>
  );
};

const SchoolFormDialog = ({
  open,
  onOpenChange,
  school,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school?: SchoolRow;
  onSaved: () => void | Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("secondary");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(school?.name ?? "");
    setType(school?.type ?? "secondary");
    setState(school?.state ?? "");
    setDistrict(school?.district ?? "");
    setError(null);
    setPending(false);
  }, [open, school]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Nama sekolah diperlukan.");
      return;
    }
    setPending(true);
    setError(null);
    const payload = {
      name: trimmedName,
      type,
      state: state.trim() || null,
      district: district.trim() || null,
    };
    try {
      if (school) {
        await patchJson(`/api/admin/schools/${school.id}`, payload);
      } else {
        await postJson("/api/admin/schools", payload);
      }
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {school ? "Sunting sekolah" : "Tambah sekolah"}
          </DialogTitle>
          <DialogDescription>
            {school
              ? "Kemas kini maklumat sekolah ini."
              : "Daftarkan sekolah baharu dalam sistem."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => void onSubmit(event)}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Nama sekolah</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: SMK Taman Desa"
              autoFocus
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Jenis</span>
              <FilterSelect
                value={type}
                onValueChange={setType}
                options={TYPE_OPTIONS}
                disabled={pending}
                className="w-full"
                ariaLabel="Jenis"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Negeri</span>
              <Input
                value={state}
                onChange={(event) => setState(event.target.value)}
                placeholder="Johor"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Daerah</span>
            <Input
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Kulai"
            />
          </label>
          <ErrorBanner message={error} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Batal
            </DialogClose>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {school ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DeleteSchoolDialog = ({
  school,
  onOpenChange,
  onDeleted,
}: {
  school: SchoolRow | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void | Promise<void>;
}) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!school) return;
    setError(null);
    setPending(false);
  }, [school]);

  const onConfirm = async () => {
    if (!school) return;
    setPending(true);
    setError(null);
    try {
      await jsonFetch(`/api/admin/schools/${school.id}`, { method: "DELETE" });
      await onDeleted();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
      setPending(false);
    }
  };

  return (
    <Dialog open={school !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Padam sekolah</DialogTitle>
          <DialogDescription>
            Padam “{school?.name}”? Tindakan ini tidak boleh dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <ErrorBanner message={error} />
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Batal
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => void onConfirm()}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            Padam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
