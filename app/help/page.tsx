import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "Help & support — Pixelspace AI Classroom",
};

export default function HelpPage() {
  return (
    <PagePlaceholder
      title="Help & support"
      description="Guides and ways to reach us will appear here."
    />
  );
}
