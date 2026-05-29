const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daily = await prisma.dailyChallenge.findUnique({
    where: { date: today }
  });

  if (daily) {
    await prisma.codingQuestion.update({
      where: { id: daily.codingQuestionId },
      data: { isExternalOnly: false }
    });
    console.log("Updated today's challenge to appear in practice sheet.");
  }
}

main().finally(() => prisma.$disconnect());
