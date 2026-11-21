import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersIcon } from "@/components/icons";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";

export const metadata: Metadata = { title: "Spaces — Pixelspace AI Classroom" };

/** Shared Spaces for teachers and students (class spaces land here). */
export default async function CommunityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const role = roleOf(user);
  if (role !== "teacher" && role !== "student") redirect(getRoleHome(role));

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
              <UsersIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold sm:text-3xl">Spaces</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Ruang kongsi untuk guru dan pelajar — bahan kelas, peta
                pembelajaran dan kuiz yang dikongsi akan muncul di sini.
              </p>
            </div>
          </div>
        </div>

        <div className="border-border/60 mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
            <UsersIcon className="text-muted-foreground size-5" />
          </span>
          <p className="text-sm font-medium">Belum ada ruang dikongsi</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Guru boleh berkongsi bahan kelas kepada pelajar di sini. Cipta
            sesuatu di Hub dahulu, kemudian kongsi ke ruang kelas anda.
          </p>
        </div>
      </div>
    </div>
  );
}
