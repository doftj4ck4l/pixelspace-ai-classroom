import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { StudentHome } from "@/components/student/student-home";

export const metadata: Metadata = { title: "Rumah — Pixelspace AI Classroom" };

/** Student home — the playful, mascot-led dashboard. */
export default async function StudentHomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const role = roleOf(user);
  if (role !== "student") redirect(getRoleHome(role));
  const displayName =
    (user as { displayName?: string | null }).displayName ?? null;
  return <StudentHome name={user.name} displayName={displayName} />;
}
