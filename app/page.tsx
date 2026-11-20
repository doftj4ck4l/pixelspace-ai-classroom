import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";

/**
 * Root: visitors without a session go to sign-in (the landing page replaces
 * this in the auth phase); signed-in users land on their role's home.
 */
export default async function RootPage() {
  const user = await getSessionUser();
  if (user) redirect(getRoleHome(roleOf(user)));
  redirect("/login");
}
