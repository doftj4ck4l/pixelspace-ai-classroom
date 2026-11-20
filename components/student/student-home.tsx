"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MascotAnimationProvider } from "@/components/mascots/MascotAnimationProvider";
import { STATE_DURATION, type MascotState } from "@/components/mascots/types";
import { Achievements } from "./achievements";
import { ContinueLearning } from "./continue-learning";
import { HeroCard } from "./hero-card";
import { QuickCreate } from "./quick-create";

export type StudentSummary = {
  streakDays: number;
  xp: number;
  level: number;
  todayActive: boolean;
  cardsMastered: number;
  quizzesDone: number;
  mapsMastered: number;
  checklistDone: number;
  achievements: { id: string; label: string; earned: boolean }[];
};

const IDLE_SLEEP_MS = 45_000;

export const StudentHome = ({
  name,
  displayName,
}: {
  name: string;
  displayName: string | null;
}) => {
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [baseState, setBaseState] = useState<MascotState>("greeting");
  const [celebrating, setCelebrating] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/student/summary")
      .then((res) => res.json())
      .then((data: StudentSummary) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const wake = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setBaseState((current) => (current === "sleeping" ? "waking" : current));
    idleTimer.current = setTimeout(
      () => setBaseState("sleeping"),
      IDLE_SLEEP_MS,
    );
  }, []);

  useEffect(() => {
    wake();
    const onActivity = () => wake();
    window.addEventListener("pointermove", onActivity);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      window.removeEventListener("pointermove", onActivity);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [wake]);

  useEffect(() => {
    if (!summary?.todayActive || celebrated.current) return;
    celebrated.current = true;
    setCelebrating(true);
    const timer = setTimeout(
      () => setCelebrating(false),
      STATE_DURATION.celebrating + 400,
    );
    return () => clearTimeout(timer);
  }, [summary?.todayActive]);

  const mascotState: MascotState = generating
    ? "working"
    : celebrating
      ? "celebrating"
      : baseState;

  return (
    <MascotAnimationProvider>
      <div className="bg-background h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
          <HeroCard
            name={name}
            displayName={displayName}
            summary={summary}
            mascotState={mascotState}
          />
          <QuickCreate onGeneratingChange={setGenerating} />
          <ContinueLearning />
          <Achievements achievements={summary?.achievements ?? null} />
        </div>
      </div>
    </MascotAnimationProvider>
  );
};
