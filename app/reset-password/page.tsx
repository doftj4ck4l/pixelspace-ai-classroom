import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Tetapkan semula kata laluan — Pixelspace AI Classroom",
};

export default async function ResetPasswordPage() {
  const user = await getSessionUser();
  if (user) redirect(getRoleHome(roleOf(user)));
  return <ResetPasswordForm />;
}
