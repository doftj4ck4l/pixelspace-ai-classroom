"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STATE_DURATION, isLooping, type MascotState } from "./types";

interface Options {
  /** Fire onAnimationComplete and return to idle when a one-shot ends. */
  returnToIdle?: boolean;
  speed?: number;
  paused?: boolean;
  onAnimationComplete?: (state: MascotState) => void;
}

/**
 * Declarative state machine for mascot animation.
 * - Looping states run until replaced.
 * - One-shot states auto-complete (callback + optional return to idle).
 * - Interruption-safe: starting a new state cancels any pending completion.
 * - Pause-aware timers (remaining time is preserved).
 */
export function useMascotState(
  initial: MascotState = "idle",
  options: Options = {},
) {
  const {
    returnToIdle = true,
    speed = 1,
    paused = false,
    onAnimationComplete,
  } = options;
  const [state, setState] = useState<MascotState>(initial);
  const [nonce, setNonce] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const activeDurationRef = useRef<number>(0);
  const speedRef = useRef(speed);
  const completeRef = useRef(onAnimationComplete);
  useEffect(() => {
    speedRef.current = speed;
    completeRef.current = onAnimationComplete;
  }, [speed, onAnimationComplete]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleCompletion = useCallback(
    (s: MascotState, durationMs: number) => {
      clearTimer();
      activeDurationRef.current = durationMs;
      startedAtRef.current = performance.now();
      remainingRef.current = durationMs;
      const fire = () => {
        timerRef.current = null;
        remainingRef.current = null;
        completeRef.current?.(s);
        if (returnToIdle) {
          setState((cur) => (cur === s ? "idle" : cur));
          setNonce((n) => n + 1);
        }
      };
      timerRef.current = setTimeout(fire, durationMs);
    },
    [clearTimer, returnToIdle],
  );

  const go = useCallback(
    (next: MascotState, opts?: { replay?: boolean }) => {
      setState((cur) => {
        if (cur === next && !opts?.replay) return cur;
        clearTimer();
        remainingRef.current = null;
        setNonce((n) => n + 1);
        if (!isLooping(next)) {
          const base = STATE_DURATION[next];
          scheduleCompletion(next, base / Math.max(speedRef.current, 0.001));
        }
        return next;
      });
    },
    [clearTimer, scheduleCompletion],
  );

  const restart = useCallback(() => {
    clearTimer();
    remainingRef.current = null;
    setNonce((n) => n + 1);
    if (!isLooping(state))
      scheduleCompletion(
        state,
        STATE_DURATION[state] / Math.max(speedRef.current, 0.001),
      );
  }, [clearTimer, scheduleCompletion, state]);

  // pause / resume with remaining-time preservation
  useEffect(() => {
    if (isLooping(state)) return;
    if (paused) {
      if (timerRef.current !== null && remainingRef.current !== null) {
        const elapsed = performance.now() - startedAtRef.current;
        remainingRef.current = Math.max(remainingRef.current - elapsed, 0);
        clearTimer();
      }
      return;
    }
    if (remainingRef.current !== null && timerRef.current === null) {
      const remaining = remainingRef.current;
      const fire = () => {
        timerRef.current = null;
        remainingRef.current = null;
        completeRef.current?.(state);
        if (returnToIdle) {
          setState((cur) => (cur === state ? "idle" : cur));
          setNonce((n) => n + 1);
        }
      };
      timerRef.current = setTimeout(fire, remaining);
    }
  }, [paused, state, returnToIdle, clearTimer]);

  // cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return { state, go, restart, nonce, isLooping: isLooping(state) };
}
