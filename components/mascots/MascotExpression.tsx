"use client";

import { useEffect, useState } from "react";
import type { MascotState } from "./types";

export type FaceMode =
  | "normal"
  | "blink"
  | "closed"
  | "squint"
  | "wide"
  | "look-up"
  | "happy";
export type MouthMode = "normal" | "open" | "small" | "o";
export type RaysMode = "on" | "off";

interface ExpressionPlan {
  face: FaceMode;
  mouth: MouthMode;
  rays: RaysMode;
  /** loop states with periodic blinking */
  blinkable: boolean;
  /** approved expression set from the sheet (joyful | surprised | thinking | sparkle | sleeping) */
  expression?: string;
}

const PLANS: Record<MascotState, ExpressionPlan> = {
  idle: { face: "normal", mouth: "normal", rays: "on", blinkable: true },
  sleeping: {
    face: "closed",
    mouth: "normal",
    rays: "off",
    blinkable: false,
    expression: "sleeping",
  },
  waking: { face: "normal", mouth: "open", rays: "off", blinkable: false }, // eyes pop open via CSS timeline
  thinking: {
    face: "normal",
    mouth: "normal",
    rays: "off",
    blinkable: false,
    expression: "thinking",
  },
  processing: {
    face: "normal",
    mouth: "normal",
    rays: "off",
    blinkable: false,
    expression: "thinking",
  },
  working: { face: "normal", mouth: "normal", rays: "off", blinkable: true },
  explaining: { face: "normal", mouth: "normal", rays: "off", blinkable: true },
  happy: {
    face: "happy",
    mouth: "open",
    rays: "off",
    blinkable: false,
    expression: "joyful",
  },
  greeting: {
    face: "happy",
    mouth: "open",
    rays: "off",
    blinkable: false,
    expression: "joyful",
  },
  celebrating: {
    face: "happy",
    mouth: "open",
    rays: "off",
    blinkable: false,
    expression: "sparkle",
  },
  confused: {
    face: "normal",
    mouth: "small",
    rays: "off",
    blinkable: false,
    expression: "thinking",
  },
  error: {
    face: "wide",
    mouth: "small",
    rays: "off",
    blinkable: false,
    expression: "surprised",
  },
  success: {
    face: "happy",
    mouth: "open",
    rays: "off",
    blinkable: false,
    expression: "sparkle",
  },
};

/**
 * Drives the face (eyes/mouth/rays) using ONLY the original cut pixels:
 * blink = vertical squash of the original eye art; no replacement face art is drawn.
 */
export function MascotExpression({
  state,
  paused,
  speed,
}: {
  state: MascotState;
  paused: boolean;
  speed: number;
}) {
  const plan = PLANS[state];
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    setBlink(false);
    if (!plan.blinkable || paused) return;
    let timer: ReturnType<typeof setTimeout>;
    let closeTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const wait = 2600 + Math.random() * 2600;
      timer = setTimeout(() => {
        setBlink(true);
        closeTimer = setTimeout(
          () => {
            setBlink(false);
            schedule();
          },
          150 / Math.max(speed, 0.25),
        );
      }, wait);
    };
    schedule();
    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [plan.blinkable, paused, speed, state]);

  const face: FaceMode = blink ? "blink" : plan.face;
  return {
    face,
    mouth: plan.mouth,
    rays: plan.rays,
    expression: plan.expression,
  };
}
