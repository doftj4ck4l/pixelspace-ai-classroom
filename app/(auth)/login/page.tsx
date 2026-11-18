import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — Pixelspace AI Classroom",
  description: "Sign in to Pixelspace AI Classroom",
};

export default function LoginPage() {
  return <LoginForm />;
}
