import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { KpmDashboard } from "@/components/kpm/kpm-dashboard";

export const metadata: Metadata = {
  title: "KPM Dashboard — Pixelspace AI Classroom",
};

export default async function KpmDashboardPage() {
  const user = await getSessionUser();
  const role = roleOf(user);
  if (role !== "kpm" && role !== "superadmin") redirect(getRoleHome(role));
  return <KpmDashboard />;
}
