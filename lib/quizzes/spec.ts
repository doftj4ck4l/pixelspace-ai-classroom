/**
 * Shared quiz spec types + validation.
 *
 * Mirrors the harness validator (apply-flashcards-patch.mjs, quizzes block) so
 * anything the app accepts renders correctly. Generation defaults to 4-20
 * questions; the cap is 60 so users can keep asking the agent to add more.
 */

export type QuizQuestionBase = {
  question: string;
  explanation?: string;
  tags?: string[];
};

export type MultipleChoiceQuestion = QuizQuestionBase & {
  type: "multiple-choice";
  options: string[];
  answerIndex: number;
};

export type OpenEndedQuestion = QuizQuestionBase & {
  type: "open-ended";
  modelAnswer: string;
  keywords?: string[];
};

export type TrueFalseQuestion = QuizQuestionBase & {
  type: "true-false";
  answer: boolean;
};

/** `/` separates accepted alternatives, e.g. "sejatan / penyejatan". */
export type FillBlankQuestion = QuizQuestionBase & {
  type: "fill-blank";
  answer: string;
};

export type QuizQuestion =
  | MultipleChoiceQuestion
  | OpenEndedQuestion
  | TrueFalseQuestion
  | FillBlankQuestion;

export type QuizSpec = {
  title?: string;
  subject?: string;
  language?: string;
  accent?: string;
  questions: QuizQuestion[];
};

export const QUIZ_TYPES = [
  "multiple-choice",
  "open-ended",
  "true-false",
  "fill-blank",
] as const;

export const QUIZ_ACCENTS = [
  "teal",
  "blue",
  "amber",
  "violet",
  "rose",
  "emerald",
] as const;

export const QUIZ_QUESTION_MAX = 60;

export type QuizSpecValidation =
  | { ok: true; spec: QuizSpec }
  | { ok: false; error: string };

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Validates a generated or AI-edited quiz spec (1-60 questions). */
export const validateQuizSpec = (input: unknown): QuizSpecValidation => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Spec must be an object." };
  }
  const raw = input as Record<string, unknown>;
  const questionsRaw = Array.isArray(raw.questions) ? raw.questions : [];
  if (questionsRaw.length === 0) {
    return { ok: false, error: "A quiz needs at least one question." };
  }
  if (questionsRaw.length > QUIZ_QUESTION_MAX) {
    return {
      ok: false,
      error: `A quiz supports at most ${QUIZ_QUESTION_MAX} questions.`,
    };
  }

  const accent = str(raw.accent);
  if (accent && !(QUIZ_ACCENTS as readonly string[]).includes(accent)) {
    return {
      ok: false,
      error: `accent must be one of: ${QUIZ_ACCENTS.join(", ")}`,
    };
  }

  const questions: QuizQuestion[] = [];
  for (const [index, entry] of questionsRaw.entries()) {
    const at = index + 1;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: `Question ${at} must be an object.` };
    }
    const q = entry as Record<string, unknown>;
    const question = str(q.question);
    const type = str(q.type);
    if (!question) {
      return { ok: false, error: `Question ${at} needs question text.` };
    }
    if (question.length > 300) {
      return { ok: false, error: `Question ${at} exceeds 300 characters.` };
    }
    if (!(QUIZ_TYPES as readonly string[]).includes(type)) {
      return {
        ok: false,
        error: `Question ${at} type must be one of: ${QUIZ_TYPES.join(", ")}`,
      };
    }
    const explanation = str(q.explanation);
    if (explanation.length > 300) {
      return {
        ok: false,
        error: `Question ${at} explanation exceeds 300 characters.`,
      };
    }
    const tags = Array.isArray(q.tags)
      ? q.tags.map((tag) => str(tag)).filter(Boolean)
      : [];
    if (tags.length > 3) {
      return { ok: false, error: `Question ${at} supports up to 3 tags.` };
    }
    const base = {
      question,
      ...(explanation ? { explanation } : {}),
      ...(tags.length ? { tags } : {}),
    };

    if (type === "multiple-choice") {
      const options = Array.isArray(q.options)
        ? q.options.map((option) => str(option)).filter(Boolean)
        : [];
      if (options.length < 2 || options.length > 6) {
        return { ok: false, error: `Question ${at} needs 2-6 options.` };
      }
      if (options.some((option) => option.length > 120)) {
        return {
          ok: false,
          error: `Question ${at} options must be 120 characters or fewer.`,
        };
      }
      const answerIndex = q.answerIndex;
      if (
        typeof answerIndex !== "number" ||
        !Number.isInteger(answerIndex) ||
        answerIndex < 0 ||
        answerIndex >= options.length
      ) {
        return {
          ok: false,
          error: `Question ${at} answerIndex must point at one of its options.`,
        };
      }
      questions.push({
        ...base,
        type: "multiple-choice",
        options,
        answerIndex,
      });
    } else if (type === "open-ended") {
      const modelAnswer = str(q.modelAnswer);
      if (!modelAnswer) {
        return { ok: false, error: `Question ${at} needs a modelAnswer.` };
      }
      if (modelAnswer.length > 600) {
        return {
          ok: false,
          error: `Question ${at} modelAnswer exceeds 600 characters.`,
        };
      }
      const keywords = Array.isArray(q.keywords)
        ? q.keywords.map((keyword) => str(keyword)).filter(Boolean)
        : [];
      if (keywords.length > 5) {
        return {
          ok: false,
          error: `Question ${at} supports up to 5 keywords.`,
        };
      }
      if (keywords.some((keyword) => keyword.length > 40)) {
        return {
          ok: false,
          error: `Question ${at} keywords must be 40 characters or fewer.`,
        };
      }
      questions.push({
        ...base,
        type: "open-ended",
        modelAnswer,
        ...(keywords.length ? { keywords } : {}),
      });
    } else if (type === "true-false") {
      if (typeof q.answer !== "boolean") {
        return {
          ok: false,
          error: `Question ${at} answer must be true or false.`,
        };
      }
      questions.push({ ...base, type: "true-false", answer: q.answer });
    } else {
      const answer = str(q.answer);
      if (!answer) {
        return { ok: false, error: `Question ${at} needs an answer.` };
      }
      if (answer.length > 120) {
        return {
          ok: false,
          error: `Question ${at} answer exceeds 120 characters.`,
        };
      }
      questions.push({ ...base, type: "fill-blank", answer });
    }
  }

  const title = str(raw.title);
  const subject = str(raw.subject);
  const language = str(raw.language);
  return {
    ok: true,
    spec: {
      ...(title ? { title } : {}),
      ...(subject ? { subject } : {}),
      ...(language ? { language } : {}),
      ...(accent ? { accent } : {}),
      questions,
    },
  };
};
