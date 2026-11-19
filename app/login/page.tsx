import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in — Pixelspace AI Classroom" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
