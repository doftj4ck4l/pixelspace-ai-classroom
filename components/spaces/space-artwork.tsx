import { cn } from "@/lib/utils";
import s from "./space-study.module.css";

export function SpaceArtwork({
  kind = "textbook",
  className,
}: {
  kind?: "textbook" | "slides" | "note" | "video" | "link" | "other";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-kind={kind}
      className={cn(s.artwork, className)}
    />
  );
}
