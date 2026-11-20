import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { roleOf } from "@/lib/roles";
import { AppShell } from "@/components/assistant-ui/app-shell";

/** Everything under (app) requires a session; /login and /register stay public. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AppShell role={roleOf(user)}>{children}</AppShell>;
}
