import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "Rumah — Pixelspace AI Classroom" };

/** Student home — the playful, mascot-led dashboard (built in the student phase). */
export default function StudentHomePage() {
  return (
    <PagePlaceholder
      title="Rumah"
      description="Rumah pelajar dengan maskot, rentetan dan kemajuan akan muncul di sini."
    />
  );
}
