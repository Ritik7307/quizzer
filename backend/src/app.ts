import express from "express";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import authRoutes from "./routes/auth.js";
import quizRoutes from "./routes/quizzes.js";
import attemptRoutes from "./routes/attempts.js";
import adminRoutes from "./routes/admin.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import notificationRoutes from "./routes/notifications.js";
import codingRoutes from "./routes/coding.js";
import feedbackRoutes from "./routes/feedback.js";
import compilerNotesRoutes from "./routes/compilerNotes.js";
import userRoutes from "./routes/users.js";
import resourcesRoutes from "./routes/resources.js";
import dailyRoutes from "./routes/daily.js";
import aiRoutes from "./routes/ai.js";
import codeforcesRoutes from "./routes/codeforces.js";
import { prisma } from "./lib/prisma.js";
import path from "path";
import { registerSocketHandlers, registerChallengeHandlers } from "./lib/socket.js";

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

const envOrigins = [process.env.FRONTEND_URLS, process.env.FRONTEND_URL]
  .filter(Boolean)
  .flatMap((v) => v!.split(","))
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const isLocalDevOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+|172\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);

const corsOrigin = function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else if (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`Origin not allowed: ${origin}`));
  }
};

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(compression());
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "15mb" }));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  const globalLimiter = rateLimit({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_MAX) || 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 40,
    message: { error: "Too many login attempts. Try again later." },
  });

  app.use("/api/", globalLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: "ok",
        service: "quizzer-api",
        uptime: process.uptime(),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      });
    } catch {
      res.status(503).json({ status: "degraded", error: "Database unavailable" });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/quizzes", quizRoutes);
  app.use("/api/attempts", attemptRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/coding", codingRoutes);
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/compiler-notes", compilerNotesRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/resources", resourcesRoutes);
  app.use("/api/daily", dailyRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/codeforces", codeforcesRoutes);

  return app;
}

export function attachSocket(httpServer: Server, app: ReturnType<typeof createApp>) {
  const io = new SocketServer(httpServer, {
    cors: { origin: corsOrigin, methods: ["GET", "POST"], credentials: true },
    pingInterval: 25_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 1e5,
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    socket.on("leaderboard:join", (quizId: string) => {
      if (typeof quizId === "string") socket.join(`leaderboard:${quizId}`);
    });
    socket.on("leaderboard:leave", (quizId: string) => {
      if (typeof quizId === "string") socket.leave(`leaderboard:${quizId}`);
    });
    
    // Register 1v1 Arena Socket Handlers
    registerSocketHandlers(io, socket);
    registerChallengeHandlers(io, socket);
  });

  return io;
}
