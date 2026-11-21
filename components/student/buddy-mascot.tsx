"use client";

import { Mascot } from "@/components/mascots/Mascot";
import { MascotAnimationProvider } from "@/components/mascots/MascotAnimationProvider";

/** The Pixi mascot as the student's learning buddy (greets on the Buddy page). */
export const BuddyMascot = () => (
  <MascotAnimationProvider>
    <Mascot character="pixi" state="greeting" size={150} />
  </MascotAnimationProvider>
);
