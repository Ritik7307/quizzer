import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { cacheGet, cacheSet, cacheDeletePrefix } from "../lib/cache.js";

const router = Router();
const LEADERBOARD_TTL_MS = Number(process.env.LEADERBOARD_CACHE_MS) || 5000;

router.get("/:quizId", async (req, res) => {
  const quizId = req.params.quizId;
  const search = String(req.query.search ?? "").trim().toLowerCase();
  const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;
  const cacheKey = `leaderboard:${quizId}:${search}:${minScore ?? ""}`;

  const cached = cacheGet<{ quiz: unknown; leaderboard: unknown[] }>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const entries = await prisma.attempt.findMany({
    where: {
      quizId,
      submittedAt: { not: null },
      ...(minScore !== undefined && !Number.isNaN(minScore) ? { score: { gte: minScore } } : {}),
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ rank: "asc" }, { score: "desc" }, { submittedAt: "asc" }],
    take: 500,
  });

  let filtered = entries;
  if (search) {
    filtered = entries.filter(
      (e) =>
        e.user.name.toLowerCase().includes(search) ||
        e.user.email.toLowerCase().includes(search)
    );
  }

  const leaderboard = filtered.map((e) => ({
    id: e.id,
    name: e.user.name,
    score: e.score,
    rank: e.rank,
    percentage: e.percentage,
    submittedAt: e.submittedAt,
  }));

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { id: true, title: true, published: true },
  });

  const payload = { quiz, leaderboard };
  cacheSet(cacheKey, payload, LEADERBOARD_TTL_MS);

  return res.json(payload);
});

router.get("/", async (_req, res) => {
  const cacheKey = "leaderboard:quizzes";
  const cached = cacheGet<unknown>(cacheKey);
  if (cached) return res.json(cached);

  const quizzes = await prisma.quiz.findMany({
    where: { published: true },
    select: { id: true, title: true, description: true },
    orderBy: { createdAt: "desc" },
  });

  const payload = { quizzes };
  cacheSet(cacheKey, payload, 30_000);
  return res.json(payload);
});

export default router;
