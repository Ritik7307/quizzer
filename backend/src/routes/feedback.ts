import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";

const router = Router();

const platformFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  category: z.enum(["General", "Bug", "Suggestion"]),
  comments: z.string().min(1, "Feedback comments are required"),
});

router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { rating, category, comments } = platformFeedbackSchema.parse(req.body);

    const feedback = await prisma.feedback.create({
      data: {
        userId: req.user!.userId,
        rating,
        category,
        comments: comments.trim(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully!",
      feedback,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid feedback data" });
    }
    console.error(e);
    return res.status(500).json({ error: "Failed to submit platform feedback" });
  }
});

export default router;
