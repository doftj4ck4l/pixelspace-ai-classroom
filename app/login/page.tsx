import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk — Pixelspace AI Classroom",
};

/**
 * One login for every role. The form takes an email or user ID; the account
 * decides what comes next, so there is nothing a role picker could add here.
 */
export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(getRoleHome(roleOf(user)));
  return <LoginForm theme="teacher" />;
}
