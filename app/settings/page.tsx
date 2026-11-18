import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "Settings — Pixelspace AI Classroom",
};

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Settings"
      description="Preferences for your account and classroom will appear here."
    />
  );
}
