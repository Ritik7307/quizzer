import express from "express";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

router.get("/today", authenticate, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find if a challenge already exists for today
    let daily = await prisma.dailyChallenge.findUnique({
      where: { date: today },
      include: {
        codingQuestion: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            topic: true,
            referenceUrl: true,
          }
        }
      }
    });

    // If not, pick a random external question and create one
    if (!daily) {
      const allQuestions = await prisma.codingQuestion.findMany({
        where: { isExternalOnly: true },
        select: { id: true }
      });

      if (allQuestions.length === 0) {
        return res.status(404).json({ error: "No external questions available for daily challenge" });
      }

      const randomQ = allQuestions[Math.floor(Math.random() * allQuestions.length)];

      // Make the selected question visible in the regular practice sheet
      await prisma.codingQuestion.update({
        where: { id: randomQ.id },
        data: { isExternalOnly: false }
      });

      daily = await prisma.dailyChallenge.create({
        data: {
          date: today,
          codingQuestionId: randomQ.id
        },
        include: {
          codingQuestion: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              topic: true,
              referenceUrl: true,
            }
          }
        }
      });
    }

    // Check if the user has solved this question
    const submission = await prisma.codingSubmission.findFirst({
      where: {
        userId: req.user!.userId,
        codingQuestionId: daily.codingQuestionId,
        status: "Accepted"
      }
    });

    res.json({
      daily,
      isSolved: !!submission,
      timeLeft: new Date(today.getTime() + 24 * 60 * 60 * 1000).getTime() - Date.now()
    });
  } catch (error) {
    console.error("Daily Challenge fetch error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

export default router;
