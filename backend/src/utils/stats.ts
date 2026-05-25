import { prisma } from "../lib/prisma.js";

export async function syncUserStats(userId: string) {
  try {
    // 1. Get all accepted submissions for this user
    const submissions = await prisma.codingSubmission.findMany({
      where: {
        userId,
        status: "Accepted",
      },
      include: {
        codingQuestion: {
          select: {
            id: true,
            difficulty: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (submissions.length === 0) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          points: 0,
          streak: 0,
          lastSolvedDate: null,
        },
      });
      return { points: 0, streak: 0, lastSolvedDate: null };
    }

    // 2. Calculate points: distinct solved questions
    const solvedQuestionIds = new Set<string>();
    let points = 0;
    for (const sub of submissions) {
      if (sub.codingQuestion && !solvedQuestionIds.has(sub.codingQuestionId)) {
        solvedQuestionIds.add(sub.codingQuestionId);
        if (sub.codingQuestion.difficulty === "Easy") points += 10;
        else if (sub.codingQuestion.difficulty === "Medium") points += 20;
        else if (sub.codingQuestion.difficulty === "Hard") points += 30;
      }
    }

    // 3. Calculate streak (Active Days)
    // Get all unique date strings (YYYY-MM-DD) in timezone-agnostic format (en-CA)
    const uniqueDates = Array.from(
      new Set(
        submissions.map((sub) => {
          const d = new Date(sub.createdAt);
          return d.toLocaleDateString("en-CA"); // YYYY-MM-DD format
        })
      )
    ).sort(); // Sort chronological ascending

    const todayStr = new Date().toLocaleDateString("en-CA");
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA");

    let streak = 0;
    let lastSolvedDate: Date | null = null;

    if (uniqueDates.length > 0) {
      const lastDateStr = uniqueDates[uniqueDates.length - 1];
      lastSolvedDate = new Date(submissions[submissions.length - 1].createdAt);

      // If the last solved date is either today or yesterday, streak is active
      if (lastDateStr === todayStr || lastDateStr === yesterdayStr) {
        streak = 1;
        const checkDate = new Date(lastDateStr === todayStr ? todayStr : yesterdayStr);
        
        while (true) {
          checkDate.setDate(checkDate.getDate() - 1);
          const checkStr = checkDate.toLocaleDateString("en-CA");
          if (uniqueDates.includes(checkStr)) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // 4. Update the user record
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        points,
        streak,
        lastSolvedDate,
      },
    });

    return {
      points: updatedUser.points,
      streak: updatedUser.streak,
      lastSolvedDate: updatedUser.lastSolvedDate,
    };
  } catch (err) {
    console.error(`Error in syncUserStats for user ${userId}:`, err);
    // Return fallback stats
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return {
      points: user?.points ?? 0,
      streak: user?.streak ?? 0,
      lastSolvedDate: user?.lastSolvedDate ?? null,
    };
  }
}
