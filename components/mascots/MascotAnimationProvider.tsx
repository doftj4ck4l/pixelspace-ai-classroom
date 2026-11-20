"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface MascotAnimationContextValue {
  speed: number;
  setSpeed: (s: number) => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (r: boolean) => void;
  systemReducedMotion: boolean;
}

const MascotAnimationContext =
  createContext<MascotAnimationContextValue | null>(null);

export function MascotAnimationProvider({
  children,
  defaultSpeed = 1,
  defaultReducedMotion = false,
}: {
  children: ReactNode;
  defaultSpeed?: number;
  defaultReducedMotion?: boolean;
}) {
  const [speed, setSpeed] = useState(defaultSpeed);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(defaultReducedMotion);
  const [systemReducedMotion, setSystemReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) =>
      setSystemReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(
    () => ({
      speed,
      setSpeed,
      paused,
      setPaused,
      reducedMotion: reducedMotion || systemReducedMotion,
      setReducedMotion,
      systemReducedMotion,
    }),
    [speed, paused, reducedMotion, systemReducedMotion],
  );

  return (
    <MascotAnimationContext.Provider value={value}>
      {children}
    </MascotAnimationContext.Provider>
  );
}

export function useMascotAnimationSettings(): MascotAnimationContextValue {
  const ctx = useContext(MascotAnimationContext);
  if (!ctx) {
    // Standalone usage outside the provider still works with sensible defaults.
    return {
      speed: 1,
      setSpeed: () => {},
      paused: false,
      setPaused: () => {},
      reducedMotion: false,
      setReducedMotion: () => {},
      systemReducedMotion: false,
    };
  }
  return ctx;
}
