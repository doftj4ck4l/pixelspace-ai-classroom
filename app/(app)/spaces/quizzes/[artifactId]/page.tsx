"use client";

import { useCallback, useEffect, useState, type FC } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QuizViewer } from "@/components/assistant-ui/quiz-viewer";
import { ArtifactAiPanel } from "@/components/assistant-ui/artifact-ai-panel";
import {
  type QuizQuestion,
  type QuizSpec,
} from "@/components/assistant-ui/quiz-runner";

type ArtifactJson = {
  id: string;
  title: string;
  kind?: "file" | "spec";
  spec?: unknown;
  updatedAt?: string;
  owner?: boolean;
};

/** /spaces/quizzes/<artifactId> — a shared quiz as its own page. */
const QuizPage: FC = () => {
  const params = useParams<{ artifactId: string }>();
  const router = useRouter();
  const [spec, setSpec] = useState<QuizSpec | null>(null);
  const [version, setVersion] = useState(0);
  const [missing, setMissing] = useState(false);
  const [owner, setOwner] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrefill, setAiPrefill] = useState<{
    text: string;
    nonce: number;
  } | null>(null);
  const [focusedQuestion, setFocusedQuestion] = useState<number | null>(null);

  const artifactId = params?.artifactId;

  const load = useCallback(() => {
    if (!artifactId) return;
    fetch(`/api/pi/artifacts/${artifactId}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ArtifactJson | null) => {
        if (!data || data.kind !== "spec" || !data.spec) {
          setMissing(true);
          return;
        }
        setMissing(false);
        setOwner(data.owner !== false);
        setSpec(data.spec as QuizSpec);
        setVersion((value) => value + 1);
      })
      .catch(() => setMissing(true));
  }, [artifactId]);

  useEffect(load, [load]);

  if (missing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">
          This quiz could not be found.
        </p>
        <Link
          href="/spaces/quizzes"
          className="text-foreground text-sm underline"
        >
          Back to Quizzes
        </Link>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="bg-muted/30 m-6 h-64 animate-pulse rounded-2xl border" />
    );
  }

  const improveQuestion = (index: number, question: QuizQuestion) => {
    setFocusedQuestion(index);
    setAiPrefill({
      text: `Improve question ${index + 1} ("${question.question}"): make it clearer while keeping the same difficulty and topic.`,
      nonce: Date.now(),
    });
  };

  return (
    <>
      <QuizViewer
        key={version}
        spec={spec}
        quizId={artifactId}
        initialIndex={focusedQuestion ?? 0}
        onClose={() => router.push("/spaces/quizzes")}
        onQuestionChange={setFocusedQuestion}
        onImproveQuestion={owner ? improveQuestion : undefined}
      />
      {artifactId && owner && (
        <ArtifactAiPanel
          artifactId={artifactId}
          kind="quizzes"
          open={aiOpen}
          onOpenChange={setAiOpen}
          prefill={aiPrefill}
          focusedIndex={focusedQuestion}
          onDeckUpdated={load}
        />
      )}
    </>
  );
};

export default QuizPage;
