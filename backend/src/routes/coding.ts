import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole, type AuthRequest } from "../middleware/auth.js";
import { Role } from "@prisma/client";
import { compileAndRun } from "../utils/compiler.js";
import { syncUserStats } from "../utils/stats.js";
import { activeMatches } from "../lib/socket.js";

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
  testCases: z.string().default("[]").refine((val) => {
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
  isExternalOnly: z.boolean().default(false),
  defaultCodeCpp: z.string().optional(),
  defaultCodeJava: z.string().optional(),
  defaultCodeC: z.string().optional(),
  driverCodeCpp: z.string().optional(),
  driverCodeJava: z.string().optional(),
  driverCodeC: z.string().optional(),
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
        isExternalOnly: true,
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
        isExternalOnly: question.isExternalOnly,
        defaultCodeCpp: question.defaultCodeCpp,
        defaultCodeJava: question.defaultCodeJava,
        defaultCodeC: question.defaultCodeC,
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
    const id = String(req.params.id);
    const { code, language, stdin } = runCodeSchema.parse(req.body);

    const question = await prisma.codingQuestion.findUnique({
      where: { id },
    });

    let driverCode: string | undefined = undefined;
    if (question) {
      if (language === "cpp") driverCode = question.driverCodeCpp || undefined;
      else if (language === "java") driverCode = question.driverCodeJava || undefined;
      else if (language === "c") driverCode = question.driverCodeC || undefined;
    }

    const result = await compileAndRun(code, language, stdin, driverCode);
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

    let driverCode: string | undefined = undefined;
    if (language === "cpp") driverCode = question.driverCodeCpp || undefined;
    else if (language === "java") driverCode = question.driverCodeJava || undefined;
    else if (language === "c") driverCode = question.driverCodeC || undefined;

    // Run compile check first
    // To check compile errors without running, we can run compiler once with empty input
    const initialRun = await compileAndRun(code, language, "", driverCode);
    if (initialRun.status === "Compile Error") {
      finalStatus = "Compile Error";
      firstErrorDetails = initialRun.errorDetails || "Compilation failed";
    } else {
      // Run code against all test cases
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const tcResult = await compileAndRun(code, language, tc.input, driverCode);

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

    // Fetch user before sync to calculate pointsAwarded
    const userBefore = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { points: true, streak: true },
    });

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

    // Real-time 1v1 Battle Integration
    try {
      const activeMatch = await prisma.match.findFirst({
        where: {
          status: "IN_PROGRESS",
          codingQuestionId: question.id,
          participants: {
            some: { userId: req.user!.userId }
          }
        },
        include: {
          participants: true
        }
      });

      if (activeMatch) {
        // Update participant score/status
        await prisma.matchParticipant.update({
          where: {
            matchId_userId: {
              matchId: activeMatch.id,
              userId: req.user!.userId
            }
          },
          data: {
            score: passedCount,
            status: finalStatus === "Accepted" ? "SUBMITTED" : "JOINED",
            winner: finalStatus === "Accepted"
          }
        });

        const io = req.app.get("io");
        if (io) {
          io.to(`match:${activeMatch.id}`).emit("match:progress", {
            userId: req.user!.userId,
            passedCount,
            totalCount: testCases.length,
            status: finalStatus
          });
        }

        if (finalStatus === "Accepted") {
          // Update match status to completed
          await prisma.match.update({
            where: { id: activeMatch.id },
            data: {
              status: "COMPLETED",
              endTime: new Date()
            }
          });

          if (io) {
            io.to(`match:${activeMatch.id}`).emit("match:end", {
              winnerId: req.user!.userId,
              matchId: activeMatch.id
            });
          }

          // Clean up in-memory mappings
          activeMatch.participants.forEach((p: { userId: string }) => {
            activeMatches.delete(p.userId);
          });
        }
      }
    } catch (matchErr) {
      console.error("[Match submit error]:", matchErr);
    }

    let pointsAwarded = 0;
    let currentStreak = userBefore?.streak ?? 0;

    if (finalStatus === "Accepted") {
      const stats = await syncUserStats(req.user!.userId);
      pointsAwarded = Math.max(0, stats.points - (userBefore?.points ?? 0));
      currentStreak = stats.streak;
    }

    return res.json({
      submissionId: submission.id,
      status: finalStatus,
      passedCount,
      totalCount: testCases.length,
      errorDetails: firstErrorDetails,
      pointsAwarded,
      currentStreak,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
    }
    console.error(e);
    return res.status(500).json({ error: "Submission process failed" });
  }
});

// 4b. Mark an external coding question as solved manually (for external-only questions)
router.post("/questions/:id/mark-solved", authenticate, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);

    const question = await prisma.codingQuestion.findUnique({
      where: { id },
    });

    if (!question) {
      return res.status(404).json({ error: "Coding question not found" });
    }

    if (!question.isExternalOnly && !question.referenceUrl) {
      return res.status(400).json({ error: "Only questions with external references can be marked as solved" });
    }

    // Check if user already solved it
    const alreadySolved = await prisma.codingSubmission.findFirst({
      where: {
        userId: req.user!.userId,
        codingQuestionId: question.id,
        status: "Accepted",
      },
    });

    // Fetch user before sync to calculate pointsAwarded
    const userBefore = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { points: true, streak: true },
    });

    // Create a dummy submission record
    const submission = await prisma.codingSubmission.create({
      data: {
        userId: req.user!.userId,
        codingQuestionId: question.id,
        code: "// Solved externally on LeetCode/Codeforces",
        language: "external",
        status: "Accepted",
        passedCount: 1,
        totalCount: 1,
        errorDetails: null,
      },
    });

    // Sync user stats
    const stats = await syncUserStats(req.user!.userId);
    const pointsAwarded = Math.max(0, stats.points - (userBefore?.points ?? 0));
    const currentStreak = stats.streak;

    return res.json({
      success: true,
      submissionId: submission.id,
      status: "Accepted",
      pointsAwarded,
      currentStreak,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to mark question as solved" });
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
        isExternalOnly: body.isExternalOnly,
        defaultCodeCpp: body.defaultCodeCpp || null,
        defaultCodeJava: body.defaultCodeJava || null,
        defaultCodeC: body.defaultCodeC || null,
        driverCodeCpp: body.driverCodeCpp || null,
        driverCodeJava: body.driverCodeJava || null,
        driverCodeC: body.driverCodeC || null,
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

// 7. Admin: Update coding question
router.put("/admin/questions/:id", authenticate, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const body = createQuestionSchema.parse(req.body);
    const id = String(req.params.id);

    const question = await prisma.codingQuestion.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        inputFormat: body.inputFormat,
        outputFormat: body.outputFormat,
        constraints: body.constraints,
        sampleInput: body.sampleInput,
        sampleOutput: body.sampleOutput,
        testCases: body.testCases,
        difficulty: body.difficulty,
        topic: body.topic,
        referenceUrl: body.referenceUrl,
        editorial: body.editorial,
        isExternalOnly: body.isExternalOnly,
        defaultCodeCpp: body.defaultCodeCpp,
        defaultCodeJava: body.defaultCodeJava,
        defaultCodeC: body.defaultCodeC,
        driverCodeCpp: body.driverCodeCpp,
        driverCodeJava: body.driverCodeJava,
        driverCodeC: body.driverCodeC,
      },
    });
    return res.json({ question });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    console.error(e);
    return res.status(500).json({ error: "Failed to update coding question" });
  }
});

// 7. Get comments for a coding question
router.get("/questions/:id/comments", authenticate, async (req: AuthRequest, res) => {
  try {
    const comments = await prisma.questionComment.findMany({
      where: { codingQuestionId: String(req.params.id) },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, points: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ comments });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// 8. Post a comment on a coding question
router.post("/questions/:id/comments", authenticate, async (req: AuthRequest, res) => {
  try {
    const content = req.body.content;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const codingQuestionId = String(req.params.id);
    
    // Check if question exists
    const question = await prisma.codingQuestion.findUnique({ where: { id: codingQuestionId } });
    if (!question) {
      return res.status(404).json({ error: "Coding question not found" });
    }

    const comment = await prisma.questionComment.create({
      data: {
        userId: req.user!.userId,
        codingQuestionId,
        content: content.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, points: true } }
      }
    });

    return res.status(201).json({ message: "Comment posted", comment });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to post comment" });
  }
});

// 9. Get details of a match (for arena page recovery)
router.get("/matches/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: String(req.params.id) },
      include: {
        codingQuestion: true,
        participants: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    return res.json({ match });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to retrieve match details" });
  }
});

// External Problem Caches
let leetCodeCache: any[] = [];
let leetCodeCacheTime = 0;
let codeforcesCache: any[] = [];
let codeforcesCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function getLeetCodeProblems() {
  const now = Date.now();
  if (leetCodeCache.length > 0 && now - leetCodeCacheTime < CACHE_TTL) {
    return leetCodeCache;
  }
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
            problemsetQuestionList: questionList(
              categorySlug: $categorySlug
              limit: $limit
              skip: $skip
              filters: $filters
            ) {
              questions: data {
                difficulty
                title
                titleSlug
                isPaidOnly
              }
            }
          }
        `,
        variables: { categorySlug: "", skip: 0, limit: 3000, filters: {} }
      })
    });
    const data = await res.json();
    const questions = data?.data?.problemsetQuestionList?.questions || [];
    leetCodeCache = questions.filter((q: any) => !q.isPaidOnly);
    leetCodeCacheTime = now;
    return leetCodeCache;
  } catch (err) {
    console.error("Failed to fetch LeetCode problems", err);
    return leetCodeCache;
  }
}

async function getCodeforcesProblems() {
  const now = Date.now();
  if (codeforcesCache.length > 0 && now - codeforcesCacheTime < CACHE_TTL) {
    return codeforcesCache;
  }
  try {
    const res = await fetch("https://codeforces.com/api/problemset.problems");
    const data = await res.json();
    if (data.status === "OK") {
      codeforcesCache = data.result.problems;
      codeforcesCacheTime = now;
    }
    return codeforcesCache;
  } catch (err) {
    console.error("Failed to fetch Codeforces problems", err);
    return codeforcesCache;
  }
}

// 10. Generate random external problems
router.get("/external/random", authenticate, async (req: AuthRequest, res) => {
  try {
    const count = Math.min(20, Math.max(1, parseInt(String(req.query.count)) || 1));
    const difficulty = String(req.query.difficulty || "All");
    const platform = String(req.query.platform || "All");

    let pool: any[] = [];

    // Fetch LeetCode
    if (platform === "All" || platform === "LeetCode") {
      const lcProblems = await getLeetCodeProblems();
      const mappedLc = lcProblems.map((q: any) => ({
        id: `lc-${q.titleSlug}`,
        title: q.title,
        difficulty: q.difficulty, // "Easy", "Medium", "Hard"
        platform: "LeetCode",
        referenceUrl: `https://leetcode.com/problems/${q.titleSlug}/`,
        isExternalOnly: true,
        solved: false
      }));
      pool = pool.concat(mappedLc);
    }

    // Fetch Codeforces
    if (platform === "All" || platform === "Codeforces") {
      const cfProblems = await getCodeforcesProblems();
      const mappedCf = cfProblems.map((q: any) => {
        let diff = "Medium";
        if (q.rating && q.rating < 1200) diff = "Easy";
        else if (q.rating && q.rating > 1600) diff = "Hard";

        return {
          id: `cf-${q.contestId}-${q.index}`,
          title: `${q.contestId}${q.index} - ${q.name}`,
          difficulty: diff,
          platform: "Codeforces",
          referenceUrl: `https://codeforces.com/problemset/problem/${q.contestId}/${q.index}`,
          isExternalOnly: true,
          solved: false
        };
      });
      pool = pool.concat(mappedCf);
    }

    // Filter by difficulty
    if (difficulty !== "All") {
      pool = pool.filter(q => q.difficulty === difficulty);
    }

    if (pool.length === 0) {
      return res.status(404).json({ error: "No problems found for the selected criteria" });
    }

    // Pick random
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return res.json({ problems: selected });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to generate random problems" });
  }
});

export default router;
