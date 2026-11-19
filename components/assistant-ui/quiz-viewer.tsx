"use client";

import type { FC } from "react";
import {
  QuizRunner,
  type QuizQuestion,
  type QuizSpec,
} from "@/components/assistant-ui/quiz-runner";

/**
 * Full-area quiz view used from Spaces. The quiz itself owns the experience
 * (answering, feedback, review rounds); this only frames it.
 */
export const QuizViewer: FC<{
  spec: QuizSpec;
  quizId?: string;
  onClose: () => void;
  onQuestionChange?: (index: number) => void;
  onImproveQuestion?: (index: number, question: QuizQuestion) => void;
  initialIndex?: number;
}> = ({
  spec,
  quizId,
  onClose,
  onQuestionChange,
  onImproveQuestion,
  initialIndex,
}) => (
  <div className="bg-background h-full overflow-hidden">
    <QuizRunner
      spec={spec}
      variant="full"
      quizId={quizId}
      onClose={onClose}
      onQuestionChange={onQuestionChange}
      onImproveQuestion={onImproveQuestion}
      initialIndex={initialIndex}
    />
  </div>
);
