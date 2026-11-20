import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "KPM Dashboard — Pixelspace AI Classroom",
};

/** KPM analytics dashboard (built in the analytics phase). */
export default function KpmDashboardPage() {
  return (
    <PagePlaceholder
      title="KPM Dashboard"
      description="Analitik aktiviti guru dan pelajar mengikut sekolah akan muncul di sini."
    />
  );
}
