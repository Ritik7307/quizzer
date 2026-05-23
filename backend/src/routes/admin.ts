import { Router } from "express";
import type { Request } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { computeRanks } from "../utils/scoring.js";
import { cacheDeletePrefix } from "../lib/cache.js";

const router = Router();

function emitLeaderboardUpdate(req: Request, quizId: string) {
  const io = req.app.get("io");
  if (io) {
    io.to(`leaderboard:${quizId}`).emit("leaderboard:update", { quizId });
  }
}

router.use(authenticate, requireRole(Role.ADMIN));

router.get("/dashboard", async (_req, res) => {
  const [quizCount, attemptCount, userCount, recentAttempts] = await Promise.all([
    prisma.quiz.count(),
    prisma.attempt.count({ where: { submittedAt: { not: null } } }),
    prisma.user.count({ where: { role: Role.CANDIDATE } }),
    prisma.attempt.findMany({
      where: { submittedAt: { not: null } },
      take: 10,
      orderBy: { submittedAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        quiz: { select: { title: true } },
      },
    }),
  ]);

  return res.json({
    stats: { quizCount, attemptCount, userCount },
    recentAttempts,
  });
});

router.get("/quizzes/:quizId/analytics", async (req, res) => {
  const quizId = String(req.params.quizId);
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { _count: { select: { questions: true } } },
  });

  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  const attempts = await prisma.attempt.findMany({
    where: { quizId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const submitted = attempts.filter((a) => a.submittedAt);
  const totalParticipants = attempts.length;
  const completedCount = submitted.length;
  const completionRate =
    totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 10000) / 100 : 0;

  const scores = submitted.map((a) => a.score);
  const averageScore =
    scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

  return res.json({
    analytics: {
      totalParticipants,
      completedCount,
      completionRate,
      averageScore,
      highestScore,
      questionCount: quiz._count.questions,
    },
    participants: attempts.map((a) => ({
      attemptId: a.id,
      userId: a.user.id,
      name: a.user.name,
      email: a.user.email,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      score: a.score,
      percentage: a.percentage,
      rank: a.rank,
      status: a.submittedAt ? "completed" : "in_progress",
    })),
  });
});

router.get("/quizzes/:quizId/export", async (req, res) => {
  const quizId = String(req.params.quizId);
  const attempts = await prisma.attempt.findMany({
    where: { quizId, submittedAt: { not: null } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ rank: "asc" }, { score: "desc" }],
  });

  const headers = ["Rank", "Name", "Email", "Score", "Percentage", "Correct", "Wrong", "Submitted At"];
  const rows = attempts.map((a) => [
    a.rank ?? "",
    a.user.name,
    a.user.email,
    a.score,
    a.percentage,
    a.correctCount,
    a.wrongCount,
    a.submittedAt?.toISOString() ?? "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="quiz-${req.params.quizId}-results.csv"`);
  return res.send(csv);
});

router.delete("/quizzes/:quizId/leaderboard", async (req, res) => {
  const quizId = String(req.params.quizId);
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  const result = await prisma.attempt.deleteMany({ where: { quizId } });

  cacheDeletePrefix(`leaderboard:${quizId}`);
  emitLeaderboardUpdate(req, quizId);

  return res.json({
    success: true,
    deletedCount: result.count,
    message: `Removed ${result.count} participant record(s) from the leaderboard`,
  });
});

router.delete("/quizzes/:quizId/attempts/:attemptId", async (req, res) => {
  const quizId = String(req.params.quizId);
  const attemptId = String(req.params.attemptId);

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, quizId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!attempt) {
    return res.status(404).json({ error: "Attempt not found for this quiz" });
  }

  await prisma.attempt.delete({ where: { id: attemptId } });

  const remainingSubmitted = await prisma.attempt.count({
    where: { quizId, submittedAt: { not: null } },
  });
  if (remainingSubmitted > 0) {
    await computeRanks(quizId, prisma);
  }

  cacheDeletePrefix(`leaderboard:${quizId}`);
  emitLeaderboardUpdate(req, quizId);

  return res.json({
    success: true,
    message: `Removed ${attempt.user.name}'s quiz data`,
  });
});

export default router;
