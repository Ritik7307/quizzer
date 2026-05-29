import type { PrismaClient } from "@prisma/client";

export interface QuestionAnswerKey {
  id: string;
  type?: "SINGLE_CHOICE" | "MULTI_SELECT" | "FILL_IN_BLANK" | string;
  correctOptionIndex: number | null;
  correctAnswers?: string | null;
}

export interface ScoreResult {
  score: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
}

export function evaluateAnswers(
  questions: QuestionAnswerKey[],
  answers: Record<string, any>
): ScoreResult {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return { score: 0, percentage: 0, correctCount: 0, wrongCount: 0, totalQuestions: 0 };
  }

  let correctCount = 0;
  for (const q of questions) {
    const ans = answers[q.id];
    if (ans === undefined || ans === null) continue;

    if (q.type === "MULTI_SELECT") {
      try {
        const correctArray = JSON.parse(q.correctAnswers || "[]");
        if (Array.isArray(ans) && Array.isArray(correctArray)) {
          const sortedAns = [...ans].sort();
          const sortedCorrect = [...correctArray].sort();
          if (JSON.stringify(sortedAns) === JSON.stringify(sortedCorrect)) {
            correctCount++;
          }
        }
      } catch (e) { }
    } else if (q.type === "FILL_IN_BLANK") {
      if (typeof ans === "string" && typeof q.correctAnswers === "string") {
        if (ans.trim().toLowerCase() === q.correctAnswers.trim().toLowerCase()) {
          correctCount++;
        }
      }
    } else {
      // SINGLE_CHOICE fallback
      if (ans === q.correctOptionIndex) {
        correctCount++;
      }
    }
  }

  const wrongCount = totalQuestions - correctCount;
  const percentage = Math.round((correctCount / totalQuestions) * 10000) / 100;
  const score = correctCount;

  return { score, percentage, correctCount, wrongCount, totalQuestions };
}


