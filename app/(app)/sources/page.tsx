import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LibraryBooksIcon } from "@/components/icons";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Sources — Pixelspace AI Classroom",
};

/** Teacher sources: textbooks, references and teaching materials (teacher only). */
export default async function SourcesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const role = roleOf(user);
  if (role !== "teacher") redirect(getRoleHome(role));

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-300">
              <LibraryBooksIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold sm:text-3xl">Sources</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Sumber pengajaran anda — buku teks, nota rujukan dan bahan
                sumber akan muncul di sini.
              </p>
            </div>
          </div>
        </div>

        <div className="border-border/60 mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
            <LibraryBooksIcon className="text-muted-foreground size-5" />
          </span>
          <p className="text-sm font-medium">Belum ada sumber</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Tambah atau rujuk bahan sumber anda di sini untuk digunakan semasa
            menghasilkan bahan pengajaran dengan AI.
          </p>
        </div>
      </div>
    </div>
  );
}
