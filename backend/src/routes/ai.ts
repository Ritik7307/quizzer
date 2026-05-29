import express from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { generateCodeHint } from "../services/ai.js";

const router = express.Router();

const hintSchema = z.object({
  questionId: z.string(),
  code: z.string(),
  language: z.string(),
});

router.post("/hint", authenticate, async (req, res) => {
  try {
    const { questionId, code, language } = hintSchema.parse(req.body);

    const question = await prisma.codingQuestion.findUnique({
      where: { id: questionId },
      select: { title: true, description: true },
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const hint = await generateCodeHint(
      question.title,
      question.description,
      code,
      language
    );

    res.json({ hint });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Hint generation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
