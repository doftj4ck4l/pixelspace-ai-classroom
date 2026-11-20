import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "Pixelspace AI Classroom — Belajar lebih pintar, bersama AI.",
  description:
    "Platform pembelajaran berasaskan AI untuk murid, guru dan sekolah. Hasilkan bahan pembelajaran, ulang kaji, latihan dan penilaian dalam satu ruang yang mudah.",
};

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect(getRoleHome(roleOf(user)));
  return <Landing />;
}
