import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { TextbooksPage } from "@/components/textbooks/textbooks-page";

export const metadata: Metadata = {
  title: "Buku Teks — Pixelspace AI Classroom",
};

/** The textbook library: teachers and students browse it read-only. */
export default async function TextbooksPageRoute() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <TextbooksPage />;
}
