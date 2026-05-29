import { Server, Socket } from "socket.io";
import { prisma } from "./prisma.js";

interface WaitingPlayer {
  userId: string;
  userName: string;
  socketId: string;
  difficulty: string;
}

const queues: Record<string, WaitingPlayer[]> = {
  Easy: [],
  Medium: [],
  Hard: [],
};

// socketId -> userId
const socketToUser = new Map<string, string>();
// userId -> matchId
export const activeMatches = new Map<string, string>();

export function registerSocketHandlers(io: Server, socket: Socket) {
  // 1. Arena Matchmaking Join
  socket.on("arena:join", async ({ userId, userName, difficulty }) => {
    if (!userId || !userName || !difficulty) return;

    // Normalize difficulty to Easy, Medium, Hard
    const diff = ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Easy";
    
    // Track connection
    socketToUser.set(socket.id, userId);

    console.log(`[Arena] Player ${userName} (${userId}) joined queue for ${diff}`);

    // Remove from other queues first to avoid duplicates
    removePlayerFromQueues(userId);

    // Check if player has an active match in database already in progress
    const activeDbMatch = await prisma.match.findFirst({
      where: {
        status: "IN_PROGRESS",
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: {
          include: {
            user: { select: { name: true } }
          }
        },
        codingQuestion: true
      }
    });

    if (activeDbMatch) {
      // Re-join match room
      socket.join(`match:${activeDbMatch.id}`);
      activeMatches.set(userId, activeDbMatch.id);

      const opponent = activeDbMatch.participants.find(
        (p: { userId: string; user: { name: string } }) => p.userId !== userId
      );

      socket.emit("match:restore", {
        matchId: activeDbMatch.id,
        question: activeDbMatch.codingQuestion,
        opponent: opponent ? {
          userId: opponent.userId,
          name: opponent.user.name
        } : null
      });
      return;
    }

    // Add to selected queue
    queues[diff].push({ userId, userName, socketId: socket.id, difficulty: diff });

    // Matchmaking logic
    if (queues[diff].length >= 2) {
      const p1 = queues[diff].shift()!;
      const p2 = queues[diff].shift()!;

      try {
        // Find a random coding question for matchmaking (excluding external-only sheets)
        let questions = await prisma.codingQuestion.findMany({
          where: { difficulty: diff, isExternalOnly: false },
        });

        // Fallback to any difficulty/question if none exists
        if (questions.length === 0) {
          questions = await prisma.codingQuestion.findMany({
            where: { isExternalOnly: false }
          });
        }

        if (questions.length === 0) {
          io.to(p1.socketId).emit("arena:error", { message: "No questions configured for this level." });
          io.to(p2.socketId).emit("arena:error", { message: "No questions configured for this level." });
          return;
        }

        const selectedQuestion = questions[Math.floor(Math.random() * questions.length)];

        // Create Match in DB
        const match = await prisma.match.create({
          data: {
            codingQuestionId: selectedQuestion.id,
            status: "IN_PROGRESS",
            startTime: new Date(),
            participants: {
              create: [
                { userId: p1.userId, status: "JOINED" },
                { userId: p2.userId, status: "JOINED" },
              ],
            },
          },
        });

        activeMatches.set(p1.userId, match.id);
        activeMatches.set(p2.userId, match.id);

        // Join sockets to match room
        const socket1 = io.sockets.sockets.get(p1.socketId);
        const socket2 = io.sockets.sockets.get(p2.socketId);

        if (socket1) socket1.join(`match:${match.id}`);
        if (socket2) socket2.join(`match:${match.id}`);

        // Emit match:found
        io.to(p1.socketId).emit("match:found", {
          matchId: match.id,
          question: selectedQuestion,
          opponent: { userId: p2.userId, name: p2.userName },
        });

        io.to(p2.socketId).emit("match:found", {
          matchId: match.id,
          question: selectedQuestion,
          opponent: { userId: p1.userId, name: p1.userName },
        });

        console.log(`[Arena] Created match ${match.id} between ${p1.userName} and ${p2.userName}`);
      } catch (error) {
        console.error("[Arena] Match creation failed:", error);
        io.to(p1.socketId).emit("arena:error", { message: "Matchmaking failed to start match." });
        io.to(p2.socketId).emit("arena:error", { message: "Matchmaking failed to start match." });
      }
    }
  });

  // 2. Arena Matchmaking Leave
  socket.on("arena:leave", ({ userId }) => {
    if (!userId) return;
    removePlayerFromQueues(userId);
    console.log(`[Arena] Player ${userId} left matchmaking queue`);
  });

  // 3. Disconnect cleanup
  socket.on("disconnect", async () => {
    const userId = socketToUser.get(socket.id);
    socketToUser.delete(socket.id);

    if (userId) {
      removePlayerFromQueues(userId);

      const matchId = activeMatches.get(userId);
      if (matchId) {
        try {
          // Update player participant status in Match
          await prisma.matchParticipant.update({
            where: { matchId_userId: { matchId, userId } },
            data: { status: "DISCONNECTED" },
          });

          // Inform opponent
          socket.to(`match:${matchId}`).emit("match:opponent-disconnected", { userId });
          console.log(`[Arena] Player ${userId} disconnected from active match ${matchId}`);
        } catch (err) {
          console.error("[Arena] Failed to handle match disconnect:", err);
        }
      }
    }
  });
}

function removePlayerFromQueues(userId: string) {
  for (const diff of Object.keys(queues)) {
    queues[diff] = queues[diff].filter((p) => p.userId !== userId);
  }
}
