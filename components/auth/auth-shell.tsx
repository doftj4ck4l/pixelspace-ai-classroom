import type { FC, ReactNode } from "react";
import { cn } from "cn";

/** The clean app card — brand glow, rounded card (the original auth-form look). */
export const AuthShell: FC<{
  subtitle?: ReactNode;
  widthClass?: string;
  children: ReactNode;
}> = ({ subtitle, widthClass = "max-w-sm", children }) => (
  <div className="relative flex min-h-dvh items-center justify-center bg-[#fdfcfc] px-4 py-10 text-[#1f1f1f] dark:bg-[#0c0c0c] dark:text-[#e3e3e3]">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-1/2 h-[260px] w-[680px] max-w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-[140px] bg-[#8fd9c8]/60 blur-[90px] dark:bg-[#0f4f4a]/50"
    />
    <div
      className={cn(
        "relative z-10 flex w-full flex-col gap-4 rounded-3xl bg-white p-6 shadow-lg shadow-black/5 dark:bg-[#1e1f20]",
        widthClass,
      )}
    >
      <div className="flex flex-col items-center gap-1 pb-2">
        <div className="mb-2 size-11 rounded-full bg-gradient-to-br from-[#177e89] to-[#8fd9c8]" />
        <h1 className="text-lg font-semibold">Pixelspace AI Classroom</h1>
        {subtitle && (
          <p className="text-center text-sm text-[#5e6063] dark:text-[#9aa0a6]">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  </div>
);
