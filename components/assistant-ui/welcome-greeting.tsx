"use client";

import { Mascot } from "@/components/mascots/Mascot";
import { MascotAnimationProvider } from "@/components/mascots/MascotAnimationProvider";
import { useT } from "@/lib/i18n";

export function WelcomeGreeting() {
  const t = useT();

  return (
    <div className="aui-welcome-greeting fade-in slide-in-from-bottom-3 motion-safe:animate-in fill-mode-both relative z-10 mb-6 flex flex-col items-center justify-center gap-1 delay-500 duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] sm:flex-row sm:gap-4">
      <MascotAnimationProvider>
        <Mascot
          character="pixi"
          state="greeting"
          loop
          ignoreReducedMotion
          size={96}
          shadow={false}
        />
      </MascotAnimationProvider>
      <p className="aui-welcome-text text-center text-4xl font-normal text-[#1f1f1f] dark:text-white">
        {t("chat.greeting")}
      </p>
    </div>
  );
}
