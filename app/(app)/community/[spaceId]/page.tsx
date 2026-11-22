import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { spaceMembers, spaces, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-session";
import { SpaceDetail } from "@/components/spaces/space-detail";

export const metadata: Metadata = {
  title: "Spaces — Pixelspace AI Classroom",
};

/** One space: the teacher's console (sources, students, analytics). */
export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { spaceId } = await params;
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId));
  if (!space) redirect("/community");

  const isOwner = space.userId === user.id;
  if (!isOwner) {
    const [member] = await db
      .select({ id: spaceMembers.id })
      .from(spaceMembers)
      .where(
        and(
          eq(spaceMembers.spaceId, spaceId),
          eq(spaceMembers.userId, user.id),
        ),
      );
    if (!member) redirect("/community");
  }

  const [teacher] = await db
    .select({ name: users.name, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, space.userId));

  return (
    <SpaceDetail
      space={{
        id: space.id,
        name: space.name,
        level: space.level,
        description: space.description ?? "",
        accent: space.accent,
        code: space.code,
        teacher: teacher?.displayName ?? teacher?.name ?? "",
      }}
      isOwner={isOwner}
    />
  );
}
