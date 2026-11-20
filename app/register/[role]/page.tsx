import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { RegisterForm } from "@/components/auth/register-form";

const PORTALS: Record<string, { title: string }> = {
  student: { title: "Daftar sebagai Pelajar" },
  teacher: { title: "Daftar sebagai Guru" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;
  const portal = PORTALS[role];
  return {
    title: `${portal?.title ?? "Daftar"} — Pixelspace AI Classroom`,
  };
}

export default async function RegisterRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (role !== "student" && role !== "teacher") redirect("/");
  const user = await getSessionUser();
  if (user) redirect(getRoleHome(roleOf(user)));
  return <RegisterForm role={role} />;
}
