"use client";

import type { ReactNode } from "react";

export type StageBackground =
  | "transparent"
  | "cream"
  | "white"
  | "sky"
  | "dark"
  | "mint";

export const STAGE_BACKGROUNDS: Record<
  StageBackground,
  { label: string; css: string }
> = {
  transparent: {
    label: "Transparent",
    css: "repeating-conic-gradient(#e7e0d2 0% 25%, #fdfbf6 0% 50%) 50% / 22px 22px",
  },
  cream: { label: "Cream", css: "linear-gradient(#f8f2e6, #f1e9d8)" },
  white: { label: "White", css: "#ffffff" },
  sky: { label: "Sky", css: "linear-gradient(#dff3f2, #fdf8ef)" },
  dark: { label: "Dark", css: "linear-gradient(#241e17, #17130e)" },
  mint: { label: "Mint", css: "linear-gradient(#e4f2ef, #d7ebe6)" },
};

/** Presentation surface for a mascot: background, alignment, optional caption. */
export function MascotStage({
  background = "cream",
  height,
  children,
  caption,
  footer,
}: {
  background?: StageBackground;
  height?: number;
  children: ReactNode;
  caption?: string;
  footer?: ReactNode;
}) {
  return (
    <div
      className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-[#e5dccb] shadow-[0_10px_30px_-18px_rgba(58,35,18,0.35)]"
      style={{
        background: STAGE_BACKGROUNDS[background].css,
        minHeight: height,
      }}
    >
      <div className="flex flex-1 items-end justify-center px-6 pt-8 pb-0">
        {children}
      </div>
      {(caption || footer) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-4 text-[13px] text-[#6b5843]">
          <span className="font-medium">{caption}</span>
          {footer}
        </div>
      )}
    </div>
  );
}
