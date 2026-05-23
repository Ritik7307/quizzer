import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole, type AuthRequest } from "../middleware/auth.js";
import { evaluateAnswers, computeRanks } from "../utils/scoring.js";
import { isQuizActive } from "../utils/quiz.js";
import {
  formatQuestion,
  parseAnswers,
  stringifyAnswers,
} from "../utils/serialize.js";
import { queueProgressSave, flushProgressSave } from "../lib/progress-queue.js";
import { cacheDeletePrefix } from "../lib/cache.js";

const router = Router();

router.post("/start/:quizId", authenticate, requireRole(Role.CANDIDATE), async (req: AuthRequest, res) => {
  const quizId = String(req.params.quizId);
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!quiz) return res.status(404).json({ error: "Quiz not found" });
  if (!isQuizActive(quiz)) return res.status(403).json({ error: "Quiz is not active" });
  if (quiz.questions.length === 0) return res.status(400).json({ error: "Quiz has no questions" });

  const existing = await prisma.attempt.findUnique({
    where: { userId_quizId: { userId: req.user!.userId, quizId: quiz.id } },
  });

  if (existing?.submittedAt) {
    return res.status(409).json({ error: "You have already submitted this quiz" });
  }

  const expiresAt = new Date(Date.now() + quiz.duration * 60 * 1000);

  if (existing) {
    if (existing.expiresAt && new Date() > existing.expiresAt) {
      return res.status(410).json({ error: "Quiz time expired. Contact admin to reset." });
    }
    const questions = quiz.questions.map((q) => {
      const { correctOptionIndex, ...rest } = formatQuestion(q);
      return rest;
    });
    return res.json({
      attempt: existing,
      quiz: { id: quiz.id, title: quiz.title, duration: quiz.duration, instructions: quiz.instructions },
      questions,
      serverTime: new Date().toISOString(),
      expiresAt: existing.expiresAt?.toISOString(),
    });
  }

  const attempt = await prisma.attempt.create({
    data: {
      userId: req.user!.userId,
      quizId: quiz.id,
      expiresAt,
      totalQuestions: quiz.questions.length,
      answers: "{}",
    },
  });

  const questions = quiz.questions.map((q) => {
    const { correctOptionIndex, ...rest } = formatQuestion(q);
    return rest;
  });

  return res.status(201).json({
    attempt,
    quiz: { id: quiz.id, title: quiz.title, duration: quiz.duration, instructions: quiz.instructions },
    questions,
    serverTime: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
});

router.patch("/:attemptId/progress", authenticate, async (req: AuthRequest, res) => {
  const schema = z.object({ answers: z.record(z.string(), z.number().int().min(0).max(3)) });
  try {
    const { answers } = schema.parse(req.body);
    const attemptId = String(req.params.attemptId);

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true, submittedAt: true, expiresAt: true },
    });

    if (!attempt || attempt.userId !== req.user!.userId) {
      return res.status(404).json({ error: "Attempt not found" });
    }
    if (attempt.submittedAt) {
      return res.status(409).json({ error: "Already submitted" });
    }
    if (attempt.expiresAt && new Date() > attempt.expiresAt) {
      return res.status(410).json({ error: "Time expired" });
    }

    const answersJson = stringifyAnswers(answers);

    queueProgressSave(attemptId, async () => {
      await prisma.attempt.update({
        where: { id: attemptId },
        data: { answers: answersJson },
      });
    });

    return res.status(202).json({ saved: true, queued: true });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid answers" });
    return res.status(500).json({ error: "Failed to save progress" });
  }
});

router.post("/:attemptId/submit", authenticate, async (req: AuthRequest, res) => {
  const attemptId = String(req.params.attemptId);
  const bodySchema = z.object({
    answers: z.record(z.string(), z.number().int().min(0).max(3)).optional(),
  });

  await flushProgressSave(attemptId);

  let inlineAnswers: Record<string, number> | undefined;
  try {
    inlineAnswers = bodySchema.parse(req.body ?? {}).answers;
  } catch {
    return res.status(400).json({ error: "Invalid submit payload" });
  }

  if (inlineAnswers) {
    await prisma.attempt.update({
      where: { id: attemptId },
      data: { answers: stringifyAnswers(inlineAnswers) },
    });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { questions: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!attempt || attempt.userId !== req.user!.userId) {
    return res.status(404).json({ error: "Attempt not found" });
  }
  if (attempt.submittedAt) {
    return res.status(409).json({ error: "Already submitted" });
  }

  const answers = parseAnswers(attempt.answers);
  const keys = attempt.quiz.questions.map((q) => ({ id: q.id, correctOptionIndex: q.correctOptionIndex }));
  const result = evaluateAnswers(keys, answers);

  const submitted = await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      ...result,
      answers: stringifyAnswers(answers),
      submittedAt: new Date(),
    },
  });

  await computeRanks(attempt.quizId, prisma);
  cacheDeletePrefix(`leaderboard:${attempt.quizId}`);

  const ranked = await prisma.attempt.findUnique({ where: { id: submitted.id } });

  const io = req.app.get("io");
  if (io) {
    io.to(`leaderboard:${attempt.quizId}`).emit("leaderboard:update", { quizId: attempt.quizId });
  }

  return res.json({
    result: {
      score: ranked!.score,
      percentage: ranked!.percentage,
      correctCount: ranked!.correctCount,
      wrongCount: ranked!.wrongCount,
      totalQuestions: ranked!.totalQuestions,
      rank: ranked!.rank,
      submittedAt: ranked!.submittedAt,
    },
    breakdown: attempt.quiz.questions.map((q) => ({
      questionId: q.id,
      text: q.text,
      selected: answers[q.id] ?? null,
      correct: q.correctOptionIndex,
      isCorrect: answers[q.id] === q.correctOptionIndex,
    })),
  });
});

router.get("/quiz/:quizId", authenticate, requireRole(Role.ADMIN), async (req, res) => {
  const quizId = String(req.params.quizId);
  const attempts = await prisma.attempt.findMany({
    where: { quizId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { submittedAt: "desc" },
  });
  return res.json({ attempts });
});

router.get("/my/:quizId", authenticate, async (req: AuthRequest, res) => {
  const quizId = String(req.params.quizId);
  const attempt = await prisma.attempt.findUnique({
    where: { userId_quizId: { userId: req.user!.userId, quizId } },
    include: { quiz: { include: { questions: { orderBy: { order: "asc" } } } } },
  });
  if (!attempt) return res.status(404).json({ error: "No attempt found" });
  if (!attempt.submittedAt) {
    return res.status(400).json({ error: "Quiz not yet submitted" });
  }

  const answers = parseAnswers(attempt.answers);
  const breakdown = attempt.quiz.questions.map((q) => {
    const parsedOptions = JSON.parse(q.options) as string[];
    return {
      questionId: q.id,
      text: q.text,
      options: parsedOptions,
      selected: answers[q.id] ?? null,
      correct: q.correctOptionIndex,
      isCorrect: answers[q.id] === q.correctOptionIndex,
    };
  });

  const { quiz, ...attemptData } = attempt;
  return res.json({ 
    attempt: { ...attemptData, quiz: { title: quiz.title } },
    breakdown
  });
});

export default router;
