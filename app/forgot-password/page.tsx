import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Lupa kata laluan — Pixelspace AI Classroom",
};

export default async function ForgotPasswordPage() {
  const user = await getSessionUser();
  if (user) redirect(getRoleHome(roleOf(user)));
  return <ForgotPasswordForm />;
}
