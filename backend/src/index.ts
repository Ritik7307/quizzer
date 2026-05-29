import "dotenv/config";
import { createServer } from "http";
import cron from "node-cron";
import { createApp, attachSocket } from "./app.js";
import { initializeDatabase } from "./lib/db-init.js";
import { prisma } from "./lib/prisma.js";
import { flushAllProgress } from "./lib/progress-queue.js";
import { fetchAndSeedExternalProblems } from "./scripts/fetch-leetcode.js";

const PORT = Number(process.env.PORT) || 4000;

export async function startServer() {
  await initializeDatabase();

  // Set up Cron Job to fetch daily external problems automatically at midnight
  cron.schedule("0 0 * * *", () => {
    console.log("Running daily problem fetcher cron job...");
    fetchAndSeedExternalProblems(10).catch(err => {
      console.error("Cron job fetch failed:", err);
    });
  });

  const app = createApp();
  const httpServer = createServer(app);

  httpServer.keepAliveTimeout = 65_000;
  httpServer.headersTimeout = 66_000;
  httpServer.maxConnections = Number(process.env.MAX_CONNECTIONS) || 512;

  attachSocket(httpServer, app);

  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, () => {
      console.log(`Quizzer API running on http://localhost:${PORT}`);
      console.log(`Max connections: ${httpServer.maxConnections}`);
      resolve();
    });
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    await flushAllProgress();
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

const shouldStart =
  process.env.NODE_CLUSTER_WORKER === "1" || !process.argv[1]?.includes("cluster");

if (shouldStart) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
