import { prisma } from "./prisma.js";

export async function initializeDatabase() {
  const url = process.env.DATABASE_URL ?? "";

  if (url.startsWith("file:")) {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
    await prisma.$queryRawUnsafe("PRAGMA cache_size = -64000;");
    console.log("[db] SQLite WAL mode enabled (dev only — use PostgreSQL for 150+ users)");
  }

  if (url.startsWith("postgres") && process.env.NODE_ENV === "production") {
    console.log("[db] PostgreSQL connected (recommended for production load)");
  }
}
