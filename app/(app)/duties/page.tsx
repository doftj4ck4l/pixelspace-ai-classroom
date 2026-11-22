import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardListIcon } from "@/components/icons";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { T } from "@/components/i18n-text";
import { AppPageHeader } from "@/components/app-page-header";

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
        <AppPageHeader
          icon={ClipboardListIcon}
          iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-300"
          title={<T k="duties.title" />}
          subtitle={<T k="duties.subtitle" />}
        />

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
