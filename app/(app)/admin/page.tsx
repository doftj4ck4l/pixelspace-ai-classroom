import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { AdminConsole } from "@/components/admin/admin-console";

export const metadata: Metadata = { title: "Admin — Pixelspace AI Classroom" };

/** Superadmin console: schools, users, requests. */
export default async function AdminConsolePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const role = roleOf(user);
  if (role !== "superadmin") redirect(getRoleHome(role));
  return <AdminConsole />;
}
