import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "Profile — Pixelspace AI Classroom",
};

export default function ProfilePage() {
  return (
    <PagePlaceholder
      title="Profile"
      description="Your profile and account details will appear here."
    />
  );
}
