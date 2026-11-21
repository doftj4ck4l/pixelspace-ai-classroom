import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth-session";
import { roleOf } from "@/lib/roles";
import { PagePlaceholder } from "@/components/page-placeholder";
import { HelpFeedback } from "@/components/help/help-feedback";

export const metadata: Metadata = {
  title: "Help & support — Pixelspace AI Classroom",
};

/**
 * Teachers and KPM use Help & support to send feedback to the admins —
 * identity and school come from the session, so the form only asks for the
 * subject, the message and (optionally) attachments.
 */
export default async function HelpPage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <PagePlaceholder
        title="Help & support"
        description="Guides and ways to reach us will appear here."
      />
    );
  }

  const role = roleOf(user);
  if (role === "teacher" || role === "kpm") {
    const schoolId = (user as { schoolId?: string | null }).schoolId ?? null;
    const [school] = schoolId
      ? await db.select().from(schools).where(eq(schools.id, schoolId))
      : [];
    return (
      <HelpFeedback
        name={user.name}
        role={role}
        schoolName={school?.name ?? null}
      />
    );
  }

  return (
    <PagePlaceholder
      title="Help & support"
      description="Guides and ways to reach us will appear here."
    />
  );
}
