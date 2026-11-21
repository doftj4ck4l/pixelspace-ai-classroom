import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { SourcesPage } from "@/components/sources/sources-page";

export const metadata: Metadata = {
  title: "Sources — Pixelspace AI Classroom",
};

/** Teacher sources: upload and manage teaching materials (teacher only). */
export default async function TeacherSourcesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const role = roleOf(user);
  if (role !== "teacher") redirect(getRoleHome(role));

  return <SourcesPage />;
}
