import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "Admin — Pixelspace AI Classroom" };

/** Superadmin console: schools, users, requests (built in the admin phase). */
export default function AdminConsolePage() {
  return (
    <PagePlaceholder
      title="Admin"
      description="Pengurusan sekolah, pengguna dan permintaan akan muncul di sini."
    />
  );
}
