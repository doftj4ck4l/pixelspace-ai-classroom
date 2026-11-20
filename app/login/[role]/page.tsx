import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { LoginForm, type LoginTheme } from "@/components/auth/login-form";

const PORTALS: Record<string, { theme: LoginTheme; title: string }> = {
  student: { theme: "student", title: "Masuk sebagai Pelajar" },
  teacher: { theme: "teacher", title: "Masuk sebagai Guru" },
  admin: { theme: "admin", title: "Masuk sebagai Pentadbir" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;
  const portal = PORTALS[role];
  return {
    title: `${portal?.title ?? "Masuk"} — Pixelspace AI Classroom`,
  };
}

export default async function LoginRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const portal = PORTALS[role];
  if (!portal) redirect("/");
  const user = await getSessionUser();
  if (user) redirect(getRoleHome(roleOf(user)));
  return <LoginForm theme={portal.theme} />;
}
