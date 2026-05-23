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

export async function computeRanks(quizId: string, prisma: PrismaClient) {
  const submitted = await prisma.attempt.findMany({
    where: { quizId, submittedAt: { not: null } },
    orderBy: [{ score: "desc" }, { submittedAt: "asc" }],
    select: { id: true, score: true },
  });

  if (submitted.length === 0) return;

  let rank = 1;
  const updates = submitted.map((row, i) => {
    if (i > 0 && row.score < submitted[i - 1].score) {
      rank = i + 1;
    }
    return prisma.attempt.update({
      where: { id: row.id },
      data: { rank },
    });
  });

  await prisma.$transaction(updates);
}
