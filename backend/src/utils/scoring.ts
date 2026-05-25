import type { PrismaClient } from "@prisma/client";

export interface QuestionAnswerKey {
  id: string;
  correctOptionIndex: number;
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
  answers: Record<string, number>
): ScoreResult {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return { score: 0, percentage: 0, correctCount: 0, wrongCount: 0, totalQuestions: 0 };
  }

  let correctCount = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correctOptionIndex) {
      correctCount++;
    }
  }

  const wrongCount = totalQuestions - correctCount;
  const percentage = Math.round((correctCount / totalQuestions) * 10000) / 100;
  const score = correctCount;

  return { score, percentage, correctCount, wrongCount, totalQuestions };
}


