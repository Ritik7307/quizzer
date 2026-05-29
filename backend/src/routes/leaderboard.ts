import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { cacheGet, cacheSet, cacheDeletePrefix } from "../lib/cache.js";
import { verifyToken } from "../utils/jwt.js";

const router = Router();
const LEADERBOARD_TTL_MS = Number(process.env.LEADERBOARD_CACHE_MS) || 5000;

router.get("/:quizId", async (req, res) => {
  const quizId = req.params.quizId;
  const search = String(req.query.search ?? "").trim().toLowerCase();
  const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;
  
  const friendsOnly = req.query.friendsOnly === "true";
  let currentUserId: string | null = null;

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") 
    ? header.slice(7) 
    : (req.cookies?.token || (req.query.token as string));
  
  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded) {
        currentUserId = decoded.userId;
      }
    } catch (e) {}
  }

  let followedUserIds: string[] = [];
  if (friendsOnly && currentUserId) {
    const following = await prisma.follows.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true }
    });
    followedUserIds = following.map(f => f.followingId);
    followedUserIds.push(currentUserId);
  }

  const cacheKey = `leaderboard:${quizId}:${search}:${minScore ?? ""}:${friendsOnly ? currentUserId : ""}`;

  const cached = cacheGet<{ quiz: unknown; leaderboard: unknown[] }>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const entries = await prisma.attempt.findMany({
    where: {
      quizId,
      submittedAt: { not: null },
      ...(minScore !== undefined && !Number.isNaN(minScore) ? { score: { gte: minScore } } : {}),
      ...(friendsOnly && currentUserId ? { userId: { in: followedUserIds } } : {}),
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ score: "desc" }, { submittedAt: "asc" }],
    take: 500,
  });

  // Calculate ranks dynamically in-memory on the ordered list
  let currentRank = 1;
  const entriesWithRank = entries.map((e, i) => {
    if (i > 0 && e.score < entries[i - 1].score) {
      currentRank = i + 1;
    }
    return { ...e, computedRank: currentRank };
  });

  let filtered = entriesWithRank;
  if (search) {
    filtered = entriesWithRank.filter(
      (e) =>
        e.user.name.toLowerCase().includes(search) ||
        e.user.email.toLowerCase().includes(search)
    );
  }

  const leaderboard = filtered.map((e) => ({
    id: e.id,
    userId: e.userId,
    name: e.user.name,
    score: e.score,
    rank: e.computedRank,
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
