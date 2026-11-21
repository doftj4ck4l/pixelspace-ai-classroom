"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Loader2Icon, PlusIcon, SearchIcon } from "@/components/icons";
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
import { jsonFetch, patchJson, postJson } from "./api";
import {
  Chip,
  EmptyState,
  ErrorBanner,
  ROLE_LABELS,
  TableSkeleton,
  USER_STATUS_LABELS,
  formatDate,
} from "./shared";
import type { SchoolRow, UserRow } from "./types";

const PAGE_SIZE = 50;

type Filters = { q: string; role: string; schoolId: string; offset: number };

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Semua peranan" },
  { value: "student", label: "Pelajar" },
  { value: "teacher", label: "Guru" },
  { value: "kpm", label: "KPM" },
  { value: "superadmin", label: "Pentadbir" },
];

const CREATE_ROLE_OPTIONS = [
  { value: "teacher", label: "Guru" },
  { value: "kpm", label: "KPM" },
  { value: "superadmin", label: "Pentadbir" },
];

export const UsersTab = () => {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [filters, setFilters] = useState<Filters>({
    q: "",
    role: "",
    schoolId: "",
    offset: 0,
  });
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((current) =>
        current.q === searchInput.trim()
          ? current
          : { ...current, q: searchInput.trim(), offset: 0 },
      );
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    void jsonFetch<{ schools: SchoolRow[] }>("/api/admin/schools")
      .then((data) => setSchools(data.schools))
      .catch(() => setSchools([]));
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.role) params.set("role", filters.role);
    if (filters.schoolId) params.set("schoolId", filters.schoolId);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(filters.offset));
    try {
      const data = await jsonFetch<{ users: UserRow[]; total: number }>(
        `/api/admin/users?${params.toString()}`,
      );
      setUsers(data.users);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const schoolNameById = useMemo(
    () => new Map(schools.map((school) => [school.id, school.name])),
    [schools],
  );

  const patchUser = async (
    id: string,
    patch: { role?: string; schoolId?: string | null; status?: string },
  ) => {
    const previous = users;
    setUsers(
      (rows) =>
        rows?.map((row) =>
          row.id === id
            ? {
                ...row,
                ...patch,
                ...(patch.schoolId !== undefined
                  ? {
                      schoolName: patch.schoolId
                        ? (schoolNameById.get(patch.schoolId) ?? null)
                        : null,
                    }
                  : {}),
              }
            : row,
        ) ?? null,
    );
    try {
      await patchJson(`/api/admin/users/${id}`, patch);
      setError(null);
    } catch (err) {
      setUsers(previous);
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Pengguna</h2>
          <p className="text-muted-foreground text-sm">
            Cari, tapis dan urus akaun pengguna.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          Tambah akaun
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari nama, e-mel atau nama pengguna…"
            className="w-64 pl-8"
          />
        </div>
        <FilterSelect
          value={filters.role}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              role: value,
              offset: 0,
            }))
          }
          options={ROLE_FILTER_OPTIONS}
          ariaLabel="Peranan"
        />
        <FilterSelect
          value={filters.schoolId}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              schoolId: value,
              offset: 0,
            }))
          }
          options={[
            { value: "", label: "Semua sekolah" },
            { value: "none", label: "Tiada sekolah" },
            ...schools.map((school) => ({
              value: school.id,
              label: school.name,
            })),
          ]}
          ariaLabel="Sekolah"
        />
      </div>

      <ErrorBanner message={error} />

      <div className="bg-card overflow-hidden rounded-xl border">
        {users === null ? (
          <TableSkeleton rows={6} cols={5} />
        ) : users.length === 0 ? (
          <EmptyState>
            <span className="text-foreground font-medium">
              Tiada pengguna ditemui
            </span>
            <span>Ubah carian atau tapisan anda.</span>
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs font-medium tracking-wide uppercase">
                    <th className="px-4 py-2.5 font-medium">Nama</th>
                    <th className="px-4 py-2.5 font-medium">E-mel</th>
                    <th className="px-4 py-2.5 font-medium">Nama pengguna</th>
                    <th className="px-4 py-2.5 font-medium">Peranan</th>
                    <th className="px-4 py-2.5 font-medium">Sekolah</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Dicipta</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {row.displayName ?? row.name}
                        </div>
                        {row.yearLabel ? (
                          <div className="text-muted-foreground text-xs">
                            {row.yearLabel}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">{row.username ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Chip
                          tone={row.role === "superadmin" ? "info" : "neutral"}
                        >
                          {ROLE_LABELS[row.role] ?? row.role}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">{row.schoolName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Chip
                          tone={row.status === "active" ? "success" : "danger"}
                        >
                          {USER_STATUS_LABELS[row.status] ?? row.status}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <FilterSelect
                            value={row.role}
                            ariaLabel="Peranan"
                            onValueChange={(value) =>
                              void patchUser(row.id, { role: value })
                            }
                            options={ROLE_FILTER_OPTIONS.filter(
                              (option) => option.value,
                            )}
                            contentClassName="min-w-36"
                          />
                          <FilterSelect
                            value={row.schoolId ?? ""}
                            ariaLabel="Sekolah"
                            onValueChange={(value) =>
                              void patchUser(row.id, {
                                schoolId: value || null,
                              })
                            }
                            options={[
                              { value: "", label: "Tiada sekolah" },
                              ...schools.map((school) => ({
                                value: school.id,
                                label: school.name,
                              })),
                            ]}
                            className="max-w-44"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void patchUser(row.id, {
                                status:
                                  row.status === "active"
                                    ? "suspended"
                                    : "active",
                              })
                            }
                          >
                            {row.status === "active" ? "Gantung" : "Aktifkan"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
              <span className="text-muted-foreground text-xs">
                Menunjukkan {filters.offset + 1}–{filters.offset + users.length}{" "}
                daripada {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.offset === 0}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      offset: Math.max(0, current.offset - PAGE_SIZE),
                    }))
                  }
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.offset + users.length >= total}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      offset: current.offset + PAGE_SIZE,
                    }))
                  }
                >
                  Seterusnya
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateAccountDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={load}
      />
    </section>
  );
};

const CreateAccountDialog = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
}) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setName("");
    setUsername("");
    setPassword("");
    setRole("teacher");
    setError(null);
    setPending(false);
  }, [open]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Kata laluan mesti sekurang-kurangnya 8 aksara.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await postJson("/api/admin/users", {
        email: email.trim(),
        name: name.trim(),
        username: username.trim() || undefined,
        password,
        role,
      });
      await onCreated();
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
          <DialogTitle>Tambah akaun</DialogTitle>
          <DialogDescription>
            Cipta akaun untuk guru, KPM atau pentadbir.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => void onSubmit(event)}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Nama</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama penuh"
              autoFocus
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">E-mel</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@sekolah.edu.my"
              autoComplete="off"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Nama pengguna</span>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="cth: guru.ali"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Peranan</span>
              <FilterSelect
                value={role}
                onValueChange={setRole}
                options={CREATE_ROLE_OPTIONS}
                disabled={pending}
                className="w-full"
                ariaLabel="Peranan"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Kata laluan</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sekurang-kurangnya 8 aksara"
              autoComplete="new-password"
              required
            />
          </label>
          <ErrorBanner message={error} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Batal
            </DialogClose>
            <Button
              type="submit"
              disabled={
                pending || !email.trim() || !name.trim() || password.length < 8
              }
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Cipta akaun
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
