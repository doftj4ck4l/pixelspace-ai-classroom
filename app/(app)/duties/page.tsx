import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardListIcon } from "@/components/icons";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { T } from "@/components/i18n-text";

export const metadata: Metadata = { title: "Duties — Pixelspace AI Classroom" };

/** Teacher duties: rosters, invigilation and weekly tasks (teacher role only). */
export default async function DutiesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const role = roleOf(user);
  if (role !== "teacher") redirect(getRoleHome(role));

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <ClipboardListIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold sm:text-3xl">
                <T k="duties.title" />
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                <T k="duties.subtitle" />
              </p>
            </div>
          </div>
        </div>

        <div className="border-border/60 mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
            <ClipboardListIcon className="text-muted-foreground size-5" />
          </span>
          <p className="text-sm font-medium">
            <T k="duties.empty" />
          </p>
          <p className="text-muted-foreground max-w-md text-sm">
            <T k="duties.emptyBody" />
          </p>
        </div>
      </div>
    </div>
  );
}
