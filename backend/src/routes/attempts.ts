import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole, type AuthRequest } from "../middleware/auth.js";
import { evaluateAnswers } from "../utils/scoring.js";
import { isQuizActive } from "../utils/quiz.js";
import {
  formatQuestion,
  parseAnswers,
  stringifyAnswers,
} from "../utils/serialize.js";
import { queueProgressSave, flushProgressSave } from "../lib/progress-queue.js";
import { cacheDeletePrefix } from "../lib/cache.js";

function isAnswerCorrect(type: string, selected: any, correctOptionIndex: number | null, correctAnswers: string | null): boolean {
  if (selected === undefined || selected === null) return false;
  if (type === "MULTI_SELECT") {
    try {
      const correctArray = JSON.parse(correctAnswers || "[]");
      if (Array.isArray(selected) && Array.isArray(correctArray)) {
        const sortedAns = [...selected].sort();
        const sortedCorrect = [...correctArray].sort();
        return JSON.stringify(sortedAns) === JSON.stringify(sortedCorrect);
      }
    } catch (e) {}
    return false;
  } else if (type === "FILL_IN_BLANK") {
    if (typeof selected === "string" && typeof correctAnswers === "string") {
      return selected.trim().toLowerCase() === correctAnswers.trim().toLowerCase();
    }
    return false;
  } else {
    return selected === correctOptionIndex;
  }
}

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
      const { correctOptionIndex, correctAnswers, ...rest } = formatQuestion(q);
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
    const { correctOptionIndex, correctAnswers, ...rest } = formatQuestion(q);
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
  const schema = z.object({ answers: z.record(z.string(), z.any()) });
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
    answers: z.record(z.string(), z.any()).optional(),
  });

  let inlineAnswers: Record<string, unknown> | undefined;
  try {
    inlineAnswers = bodySchema.parse(req.body ?? {}).answers;
  } catch {
    return res.status(400).json({ error: "Invalid submit payload" });
  }

  await flushProgressSave(attemptId);

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

  const baseAnswers = parseAnswers(attempt.answers);
  const answers = inlineAnswers ? { ...baseAnswers, ...inlineAnswers } : baseAnswers;
  
  const keys = attempt.quiz.questions.map((q) => ({ id: q.id, type: q.type, correctOptionIndex: q.correctOptionIndex, correctAnswers: q.correctAnswers }));
  const result = evaluateAnswers(keys, answers);

  const submitted = await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      ...result,
      answers: stringifyAnswers(answers),
      submittedAt: new Date(),
    },
  });

  cacheDeletePrefix(`leaderboard:${attempt.quizId}`);

  const rankCount = await prisma.attempt.count({
    where: {
      quizId: attempt.quizId,
      submittedAt: { not: null },
      score: { gt: submitted.score }
    }
  });
  const currentRank = rankCount + 1;

  const io = req.app.get("io");
  if (io) {
    io.to(`leaderboard:${attempt.quizId}`).emit("leaderboard:update", { quizId: attempt.quizId });
  }

  return res.json({
    result: {
      score: submitted.score,
      percentage: submitted.percentage,
      correctCount: submitted.correctCount,
      wrongCount: submitted.wrongCount,
      totalQuestions: submitted.totalQuestions,
      rank: currentRank,
      submittedAt: submitted.submittedAt,
    },
    breakdown: attempt.quiz.questions.map((q) => {
      const selected = answers[q.id] ?? null;
      let correct: any = q.correctOptionIndex;
      if (q.type === "MULTI_SELECT") {
        try {
          correct = JSON.parse(q.correctAnswers || "[]");
        } catch {
          correct = [];
        }
      } else if (q.type === "FILL_IN_BLANK") {
        correct = q.correctAnswers;
      }
      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        selected,
        correct,
        isCorrect: isAnswerCorrect(q.type, selected, q.correctOptionIndex, q.correctAnswers),
      };
    }),
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
    include: {
      quiz: { include: { questions: { orderBy: { order: "asc" } } } },
      feedback: true,
    },
  });
  if (!attempt) return res.status(404).json({ error: "No attempt found" });
  if (!attempt.submittedAt) {
    return res.status(400).json({ error: "Quiz not yet submitted" });
  }

  const rankCount = await prisma.attempt.count({
    where: {
      quizId,
      submittedAt: { not: null },
      score: { gt: attempt.score }
    }
  });
  const rank = rankCount + 1;

  const answers = parseAnswers(attempt.answers);
  const breakdown = attempt.quiz.questions.map((q) => {
    const parsedOptions = JSON.parse(q.options) as string[];
    const selected = answers[q.id] ?? null;
    let correct: any = q.correctOptionIndex;
    if (q.type === "MULTI_SELECT") {
      try {
        correct = JSON.parse(q.correctAnswers || "[]");
      } catch {
        correct = [];
      }
    } else if (q.type === "FILL_IN_BLANK") {
      correct = q.correctAnswers;
    }
    return {
      questionId: q.id,
      text: q.text,
      type: q.type,
      options: parsedOptions,
      selected,
      correct,
      isCorrect: isAnswerCorrect(q.type, selected, q.correctOptionIndex, q.correctAnswers),
    };
  });

  const { quiz, ...attemptData } = attempt;
  return res.json({ 
    attempt: { ...attemptData, rank, quiz: { title: quiz.title } },
    breakdown
  });
});

router.post("/:attemptId/feedback", authenticate, async (req: AuthRequest, res) => {
  const attemptId = String(req.params.attemptId);
  const schema = z.object({
    rating: z.number().int().min(1).max(5),
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    comments: z.string().optional().nullable(),
  });

  try {
    const { rating, difficulty, comments } = schema.parse(req.body);
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt || attempt.userId !== req.user!.userId) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    if (!attempt.submittedAt) {
      return res.status(400).json({ error: "Quiz must be submitted before providing feedback" });
    }

    const existingFeedback = await prisma.feedback.findUnique({
      where: { attemptId }
    });
    if (existingFeedback) {
      return res.status(409).json({ error: "Feedback already submitted for this attempt" });
    }

    const feedback = await prisma.feedback.create({
      data: {
        attemptId,
        rating,
        difficulty,
        comments: comments || null,
      }
    });

    return res.status(201).json({ success: true, feedback });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid feedback data" });
    }
    console.error(e);
    return res.status(500).json({ error: "Failed to submit feedback" });
  }
});

export default router;
