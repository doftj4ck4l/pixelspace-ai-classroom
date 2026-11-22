"use client";

import { useEffect, useState } from "react";
import { Mascot } from "@/components/mascots/Mascot";
import { MascotAnimationProvider } from "@/components/mascots/MascotAnimationProvider";
import { useT } from "@/lib/i18n";

const GREETING_KEYS = [
  "chat.greeting",
  "chat.greeting2",
  "chat.greeting3",
  "chat.greeting4",
  "chat.greeting5",
] as const;

const ROTATE_MS = 5000;

export function WelcomeGreeting() {
  const t = useT();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % GREETING_KEYS.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="aui-welcome-greeting fade-in slide-in-from-bottom-3 motion-safe:animate-in fill-mode-both relative z-10 mb-6 flex flex-col items-center justify-center gap-1 delay-500 duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] sm:flex-row sm:gap-4">
      <MascotAnimationProvider>
        <Mascot character="pixi" state="greeting" size={96} shadow={false} />
      </MascotAnimationProvider>
      <div className="flex min-h-[5rem] items-center justify-center">
        <p
          key={index}
          className="aui-welcome-text fade-in motion-safe:animate-in fill-mode-both text-center text-4xl font-normal text-[#1f1f1f] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:text-white"
        >
          {t(GREETING_KEYS[index])}
        </p>
      </div>
    </div>
  );
}
