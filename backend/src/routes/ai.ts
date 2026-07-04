import express from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import {
  generateCodeHint,
  generateTopicQuiz,
  generateSystemDesignScenario,
  generateAptitudeTest,
  generateCSCoreQuiz,
  reviewResume,
} from "../services/ai.js";

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

const quizSchema = z.object({
  topic: z.string().min(1),
});

router.post("/generate-quiz", authenticate, async (req, res) => {
  try {
    const { topic } = quizSchema.parse(req.body);
    const quiz = await generateTopicQuiz(topic, 5);
    res.json({ quiz });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Quiz generation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/generate-system-design", authenticate, async (req, res) => {
  try {
    const { topic } = quizSchema.parse(req.body);
    const scenario = await generateSystemDesignScenario(topic);
    res.json({ scenario });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("System Design generation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/generate-aptitude", authenticate, async (req, res) => {
  try {
    const { topic } = quizSchema.parse(req.body);
    const quiz = await generateAptitudeTest(topic, 5);
    res.json({ quiz });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Aptitude generation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/generate-cs-core", authenticate, async (req, res) => {
  try {
    const { topic } = quizSchema.parse(req.body);
    const quiz = await generateCSCoreQuiz(topic, 5);
    res.json({ quiz });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("CS Core generation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const resumeSchema = z.object({
  resumeText: z.string().min(10),
});

router.post("/review-resume", authenticate, async (req, res) => {
  try {
    const { resumeText } = resumeSchema.parse(req.body);
    const review = await reviewResume(resumeText);
    res.json({ review });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Resume review error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
