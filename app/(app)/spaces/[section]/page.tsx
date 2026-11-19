import { notFound } from "next/navigation";
import {
  SpaceGallery,
  type ModuleKind,
} from "@/components/assistant-ui/space-gallery";

const MODULES = new Set<string>([
  "flashcards",
  "quizzes",
  "mindmaps",
  "slides",
  "reports",
  "infographics",
  "podcasts",
  "notes",
  "transformations",
]);

export default async function SpacesPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (section === "all") return <SpaceGallery mode="all" />;
  if (!MODULES.has(section)) notFound();
  return <SpaceGallery mode={section as ModuleKind} />;
}
