import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole, type AuthRequest } from "../middleware/auth.js";
import { isQuizActive } from "../utils/quiz.js";
import { formatQuestion, stringifyOptions } from "../utils/serialize.js";

const router = Router();

const quizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  duration: z.number().int().min(1).max(600),
  published: z.boolean().optional(),
  startTime: z.string().datetime().nullable().optional(),
  endTime: z.string().datetime().nullable().optional(),
});

const questionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  order: z.number().int().optional(),
});

router.get("/public/active", async (_req, res) => {
  const now = new Date();
  const quizzes = await prisma.quiz.findMany({
    where: { published: true },
    include: { _count: { select: { questions: true, attempts: true } } },
    orderBy: { createdAt: "desc" },
  });

  const active = quizzes.filter((q) => isQuizActive(q, now));
  return res.json({ quizzes: active });
});

router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const published = req.query.published !== "false";

  const quizzes = await prisma.quiz.findMany({
    where: {
      ...(published ? { published: true } : {}),
      ...(q
        ? {
            OR: [{ title: { contains: q } }, { description: { contains: q } }],
          }
        : {}),
    },
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ quizzes });
});

router.get("/", authenticate, async (req: AuthRequest, res) => {
  const isAdmin = req.user!.role === Role.ADMIN;

  if (isAdmin) {
    const quizzes = await prisma.quiz.findMany({
      include: {
        _count: { select: { questions: true, attempts: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ quizzes });
  }

  const now = new Date();
  const quizzes = await prisma.quiz.findMany({
    where: { published: true },
    include: {
      _count: { select: { questions: true } },
      attempts: {
        where: { userId: req.user!.userId },
        select: { id: true, submittedAt: true, score: true, percentage: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const withStatus = quizzes.map((quiz) => ({
    ...quiz,
    isActive: isQuizActive(quiz, now),
    attempt: quiz.attempts[0] ?? null,
    attempts: undefined,
  }));

  return res.json({ quizzes: withStatus });
});

router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: req.params.id },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { attempts: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  const isAdmin = req.user!.role === Role.ADMIN;
  if (!isAdmin && !quiz.published) {
    return res.status(403).json({ error: "Quiz not available" });
  }

  const formatted = {
    ...quiz,
    questions: quiz.questions.map((q) => formatQuestion(q)),
  };

  if (!isAdmin) {
    const { questions, ...rest } = formatted;
    const safeQuestions = questions.map(({ correctOptionIndex, ...q }) => q);
    return res.json({ quiz: { ...rest, questions: safeQuestions } });
  }

  return res.json({ quiz: formatted });
});

router.post("/", authenticate, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    const body = quizSchema.parse(req.body);
    const quiz = await prisma.quiz.create({
      data: {
        title: body.title,
        description: body.description ?? "",
        instructions: body.instructions ?? "",
        duration: body.duration,
        published: body.published ?? false,
        startTime: body.startTime ? new Date(body.startTime) : null,
        endTime: body.endTime ? new Date(body.endTime) : null,
        createdById: req.user!.userId,
      },
    });
    return res.status(201).json({ quiz });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors[0]?.message });
    return res.status(500).json({ error: "Failed to create quiz" });
  }
});

router.patch("/:id", authenticate, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    const body = quizSchema.partial().parse(req.body);
    const quiz = await prisma.quiz.update({
      where: { id: req.params.id },
      data: {
        ...body,
        startTime: body.startTime === null ? null : body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime === null ? null : body.endTime ? new Date(body.endTime) : undefined,
      },
    });
    return res.json({ quiz });
  } catch {
    return res.status(500).json({ error: "Failed to update quiz" });
  }
});

router.delete("/:id", authenticate, requireRole(Role.ADMIN), async (req, res) => {
  await prisma.quiz.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});

router.post("/:id/questions", authenticate, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const body = questionSchema.parse(req.body);
    const count = await prisma.question.count({ where: { quizId: req.params.id } });
    const question = await prisma.question.create({
      data: {
        quizId: req.params.id,
        text: body.text,
        options: stringifyOptions(body.options),
        correctOptionIndex: body.correctOptionIndex,
        order: body.order ?? count,
      },
    });
    return res.status(201).json({ question: formatQuestion(question) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors[0]?.message });
    return res.status(500).json({ error: "Failed to add question" });
  }
});

router.patch("/:quizId/questions/:questionId", authenticate, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const body = questionSchema.partial().parse(req.body);
    const question = await prisma.question.update({
      where: { id: req.params.questionId },
      data: {
        ...body,
        ...(body.options ? { options: stringifyOptions(body.options) } : {}),
      },
    });
    return res.json({ question: formatQuestion(question) });
  } catch {
    return res.status(500).json({ error: "Failed to update question" });
  }
});

router.delete("/:quizId/questions/:questionId", authenticate, requireRole(Role.ADMIN), async (req, res) => {
  await prisma.question.delete({ where: { id: req.params.questionId } });
  return res.json({ success: true });
});

export default router;
