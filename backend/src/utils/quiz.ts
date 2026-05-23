import type { Quiz } from "@prisma/client";

export function isQuizActive(quiz: Quiz, now = new Date()): boolean {
  if (!quiz.published) return false;
  if (quiz.startTime && now < quiz.startTime) return false;
  if (quiz.endTime && now > quiz.endTime) return false;
  return true;
}
