import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { SpacesPage } from "@/components/spaces/spaces-page";

export const metadata: Metadata = { title: "Spaces — Pixelspace AI Classroom" };

/** Subject spaces: teachers add the subjects they teach; students see them. */
export default async function CommunityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const role = roleOf(user);
  if (role !== "teacher" && role !== "student") redirect(getRoleHome(role));

  return <SpacesPage role={role} />;
}
