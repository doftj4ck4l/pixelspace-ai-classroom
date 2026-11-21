import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BotIcon } from "@/components/icons";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { BuddyMascot } from "@/components/student/buddy-mascot";

export const metadata: Metadata = { title: "Buddy — Pixelspace AI Classroom" };

/** Buddy: the student's AI learning companion (student role only). */
export default async function BuddyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const role = roleOf(user);
  if (role !== "student") redirect(getRoleHome(role));

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <BotIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold sm:text-3xl">Buddy</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Rakan pembelajaran AI anda — tanya soalan, minta petua ulang
                kaji dan sambung belajar bersama maskot Pixelspace.
              </p>
            </div>
          </div>
        </div>

        <div className="border-border/60 mt-8 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-14 text-center">
          <BuddyMascot />
          <p className="text-sm font-medium">Buddy sedang bersiap</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Sebentar lagi anda boleh berbual dengan Buddy tentang topik yang
            sedang anda pelajari, minta petua ulang kaji dan ulang kaji
            bersama-sama.
          </p>
        </div>
      </div>
    </div>
  );
}
