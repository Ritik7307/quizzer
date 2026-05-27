import { Router } from "express";
import type { Request } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
// Removed computeRanks import
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

  // Calculate ranks dynamically in-memory for completed attempts
  const completedAttempts = attempts
    .filter((a) => a.submittedAt !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime();
    });

  const rankMap = new Map<string, number>();
  let currentRank = 1;
  completedAttempts.forEach((a, i) => {
    if (i > 0 && a.score < completedAttempts[i - 1].score) {
      currentRank = i + 1;
    }
    rankMap.set(a.id, currentRank);
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
      rank: a.submittedAt ? (rankMap.get(a.id) ?? null) : null,
      status: a.submittedAt ? "completed" : "in_progress",
    })),
  });
});

router.get("/quizzes/:quizId/export", async (req, res) => {
  const quizId = String(req.params.quizId);
  const attempts = await prisma.attempt.findMany({
    where: { quizId, submittedAt: { not: null } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ score: "desc" }, { submittedAt: "asc" }],
  });

  let currentRank = 1;
  const headers = ["Rank", "Name", "Email", "Score", "Percentage", "Correct", "Wrong", "Submitted At"];
  const rows = attempts.map((a, i) => {
    if (i > 0 && a.score < attempts[i - 1].score) {
      currentRank = i + 1;
    }
    return [
      currentRank,
      a.user.name,
      a.user.email,
      a.score,
      a.percentage,
      a.correctCount,
      a.wrongCount,
      a.submittedAt?.toISOString() ?? "",
    ];
  });

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

  cacheDeletePrefix(`leaderboard:${quizId}`);
  emitLeaderboardUpdate(req, quizId);

  return res.json({
    success: true,
    message: `Removed ${attempt.user.name}'s quiz data`,
  });
});

router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      leetcodeHandle: true,
      codeforcesHandle: true,
      createdAt: true,
      points: true,
      streak: true,
      lastSolvedDate: true,
      lastActiveAt: true,
      codingSubmissions: {
        where: {
          status: "Accepted"
        },
        select: {
          codingQuestion: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              isExternalOnly: true,
              referenceUrl: true
            }
          }
        }
      },
      _count: {
        select: { attempts: true, quizzes: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const processedUsers = users.map(user => {
    const solvedQuestionsMap = new Map();
    user.codingSubmissions.forEach(sub => {
      if (sub.codingQuestion) {
        solvedQuestionsMap.set(sub.codingQuestion.id, {
          id: sub.codingQuestion.id,
          title: sub.codingQuestion.title,
          difficulty: sub.codingQuestion.difficulty,
          isExternalOnly: sub.codingQuestion.isExternalOnly,
          referenceUrl: sub.codingQuestion.referenceUrl
        });
      }
    });

    const solvedQuestions = Array.from(solvedQuestionsMap.values());
    const solvedCount = solvedQuestions.length;

    // Remove codingSubmissions to avoid sending heavy raw tables
    const { codingSubmissions, ...rest } = user;

    return {
      ...rest,
      solvedCount,
      solvedQuestions
    };
  });

  return res.json({ users: processedUsers });
});

router.get("/users/export", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      role: true,
      leetcodeHandle: true,
      codeforcesHandle: true,
      createdAt: true,
      points: true,
      streak: true,
      lastActiveAt: true,
      codingSubmissions: {
        where: {
          status: "Accepted"
        },
        select: {
          codingQuestion: {
            select: {
              id: true,
              title: true
            }
          }
        }
      },
      _count: {
        select: { attempts: true, quizzes: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const headers = [
    "Name",
    "Email",
    "Role",
    "LeetCode Handle",
    "Codeforces Handle",
    "Joined Date",
    "Last Active",
    "Points",
    "Daily Streak",
    "Solved Count",
    "Solved Problems",
    "Quizzes Created",
    "Quizzes Attempted"
  ];
  
  const rows = users.map((u) => {
    const solvedQuestionsSet = new Set<string>();
    u.codingSubmissions.forEach(sub => {
      if (sub.codingQuestion) {
        solvedQuestionsSet.add(sub.codingQuestion.title);
      }
    });
    const solvedQuestions = Array.from(solvedQuestionsSet);
    const solvedCount = solvedQuestions.length;
    const solvedListString = solvedQuestions.join("; ");

    return [
      u.name,
      u.email,
      u.role,
      u.leetcodeHandle || "",
      u.codeforcesHandle || "",
      u.createdAt.toISOString(),
      u.lastActiveAt ? u.lastActiveAt.toISOString() : "",
      u.points,
      u.streak,
      solvedCount,
      solvedListString,
      u._count.quizzes,
      u._count.attempts,
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="registered-users.csv"`);
  return res.send(csv);
});

router.get("/feedback", async (_req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: { select: { name: true, email: true } },
        attempt: {
          include: {
            user: { select: { name: true, email: true } },
            quiz: { select: { title: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const normalizedFeedbacks = feedbacks.map(f => ({
      ...f,
      user: f.user || f.attempt?.user || { name: "Unknown User", email: "unknown@example.com" }
    }));

    return res.json({ feedbacks: normalizedFeedbacks });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch candidate feedbacks" });
  }
});

router.delete("/feedback/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    await prisma.feedback.delete({ where: { id } });
    return res.json({ success: true, message: "Feedback deleted" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to delete feedback" });
  }
});

router.patch("/feedback/:id/respond", async (req, res) => {
  try {
    const id = String(req.params.id);
    const { adminResponse } = req.body;
    const feedback = await prisma.feedback.update({
      where: { id },
      data: { adminResponse },
    });
    return res.json({ success: true, feedback });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to respond to feedback" });
  }
});

export default router;
