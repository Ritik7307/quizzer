import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole, type AuthRequest } from "../middleware/auth.js";
import { Role } from "@prisma/client";
import { compileAndRun } from "../utils/compiler.js";

const router = Router();

// Validation Schemas
const createQuestionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  inputFormat: z.string().default(""),
  outputFormat: z.string().default(""),
  constraints: z.string().default(""),
  topic: z.string().default("General"),
  sampleInput: z.string().default(""),
  sampleOutput: z.string().default(""),
  testCases: z.string().refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) && parsed.every((tc) => typeof tc.input === "string" && typeof tc.output === "string");
    } catch {
      return false;
    }
  }, "Test cases must be a valid JSON array of { input: string, output: string }"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Easy"),
  referenceUrl: z.string().url("Must be a valid URL").or(z.literal("")).nullable().optional(),
  editorial: z.string().nullable().optional(),
});

const runCodeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  language: z.enum(["cpp", "c", "java"]),
  stdin: z.string().default(""),
});

const submitCodeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  language: z.enum(["cpp", "c", "java"]),
});

// Normalize string whitespace and line breaks for comparing outputs
function normalizeOutput(str: string): string {
  return str
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, arr) => line !== "" || index !== arr.length - 1) // Allow empty lines in between but trim end
    .join("\n")
    .trim();
}

// 1. Get all coding questions (Basic info for candidates)
router.get("/questions", authenticate, async (req: AuthRequest, res) => {
  try {
    const questions = await prisma.codingQuestion.findMany({
      select: {
        id: true,
        title: true,
        difficulty: true,
        topic: true,
        referenceUrl: true,
        sampleInput: true,
        sampleOutput: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const acceptedSubmissions = await prisma.codingSubmission.findMany({
      where: {
        userId: req.user!.userId,
        status: "Accepted",
      },
      select: { codingQuestionId: true },
    });

    const solvedIds = new Set(acceptedSubmissions.map((s) => s.codingQuestionId));

    const questionsWithStatus = questions.map((q) => ({
      ...q,
      solved: solvedIds.has(q.id),
    }));

    return res.json({ questions: questionsWithStatus });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch coding questions" });
  }
});

// 2. Get specific coding question
router.get("/questions/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const questionId = String(req.params.id);
    const question = await prisma.codingQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ error: "Coding question not found" });
    }

    const isAdmin = req.user!.role === Role.ADMIN;
    let isEditorialLocked = true;

    if (isAdmin) {
      isEditorialLocked = false;
    } else {
      const solved = await prisma.codingSubmission.findFirst({
        where: {
          userId: req.user!.userId,
          codingQuestionId: questionId,
          status: "Accepted",
        },
      });
      if (solved) {
        isEditorialLocked = false;
      }
    }

    return res.json({
      question: {
        id: question.id,
        title: question.title,
        description: question.description,
        inputFormat: question.inputFormat,
        outputFormat: question.outputFormat,
        constraints: question.constraints,
        topic: question.topic,
        sampleInput: question.sampleInput,
        sampleOutput: question.sampleOutput,
        difficulty: question.difficulty,
        referenceUrl: question.referenceUrl,
        editorial: isEditorialLocked ? null : question.editorial,
        isEditorialLocked,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch coding question details" });
  }
});

// 3. Run code on custom/sample input (does not save submission history)
router.post("/questions/:id/run", authenticate, async (req, res) => {
  try {
    const { code, language, stdin } = runCodeSchema.parse(req.body);

    const result = await compileAndRun(code, language, stdin);
    return res.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
    }
    console.error(e);
    return res.status(500).json({ error: "Compilation and execution failed" });
  }
});

// 3b. Generic Run code (for standalone compiler, does not save submission history)
router.post("/run", authenticate, async (req, res) => {
  try {
    const { code, language, stdin } = runCodeSchema.parse(req.body);

    const result = await compileAndRun(code, language, stdin);
    return res.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
    }
    console.error(e);
    return res.status(500).json({ error: "Compilation and execution failed" });
  }
});

// 4. Submit code (Runs against all test cases, saves submission history)
router.post("/questions/:id/submit", authenticate, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { code, language } = submitCodeSchema.parse(req.body);

    const question = await prisma.codingQuestion.findUnique({
      where: { id },
    });

    if (!question) {
      return res.status(404).json({ error: "Coding question not found" });
    }

    let testCases: Array<{ input: string; output: string }> = [];
    try {
      testCases = JSON.parse(question.testCases);
    } catch {
      return res.status(500).json({ error: "Failed to parse question test cases" });
    }

    if (testCases.length === 0) {
      return res.status(400).json({ error: "No test cases configured for this question" });
    }

    let passedCount = 0;
    let finalStatus: "Accepted" | "Wrong Answer" | "Compile Error" | "Runtime Error" | "Time Limit Exceeded" = "Accepted";
    let firstErrorDetails = "";

    // Run compile check first
    // To check compile errors without running, we can run compiler once with empty input
    const initialRun = await compileAndRun(code, language, "");
    if (initialRun.status === "Compile Error") {
      finalStatus = "Compile Error";
      firstErrorDetails = initialRun.errorDetails || "Compilation failed";
    } else {
      // Run code against all test cases
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const tcResult = await compileAndRun(code, language, tc.input);

        if (tcResult.status === "Accepted") {
          const normalizedActual = normalizeOutput(tcResult.output);
          const normalizedExpected = normalizeOutput(tc.output);

          if (normalizedActual === normalizedExpected) {
            passedCount++;
          } else {
            if (finalStatus === "Accepted") {
              finalStatus = "Wrong Answer";
              firstErrorDetails = `Test Case ${i + 1} Failed:\nExpected: "${normalizedExpected}"\nActual:   "${normalizedActual}"`;
            }
          }
        } else {
          // Program crashed or timed out on this case
          if (finalStatus === "Accepted") {
            finalStatus = tcResult.status as any;
            firstErrorDetails = `Test Case ${i + 1} Failed with ${tcResult.status}:\n${tcResult.errorDetails || tcResult.output}`;
          }
        }
      }
    }

    // Save submission record
    const submission = await prisma.codingSubmission.create({
      data: {
        userId: req.user!.userId,
        codingQuestionId: question.id,
        code,
        language,
        status: finalStatus,
        passedCount,
        totalCount: testCases.length,
        errorDetails: firstErrorDetails || null,
      },
    });

    return res.json({
      submissionId: submission.id,
      status: finalStatus,
      passedCount,
      totalCount: testCases.length,
      errorDetails: firstErrorDetails,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
    }
    console.error(e);
    return res.status(500).json({ error: "Submission process failed" });
  }
});

// 5. Get user submission history
router.get("/submissions", authenticate, async (req: AuthRequest, res) => {
  try {
    const submissions = await prisma.codingSubmission.findMany({
      where: { userId: req.user!.userId },
      include: {
        codingQuestion: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ submissions });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch submission history" });
  }
});

// 6. Admin: Create coding question
router.post("/admin/questions", authenticate, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const body = createQuestionSchema.parse(req.body);

    const question = await prisma.codingQuestion.create({
      data: {
        title: body.title,
        description: body.description,
        inputFormat: body.inputFormat,
        outputFormat: body.outputFormat,
        constraints: body.constraints,
        topic: body.topic,
        sampleInput: body.sampleInput,
        sampleOutput: body.sampleOutput,
        testCases: body.testCases,
        difficulty: body.difficulty,
        referenceUrl: body.referenceUrl || null,
        editorial: body.editorial || null,
      },
    });

    return res.status(201).json({
      message: "Coding question created successfully",
      question,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
    }
    console.error(e);
    return res.status(500).json({ error: "Failed to create coding question" });
  }
});

export default router;
