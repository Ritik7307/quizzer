const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.codingQuestion.findMany();
  let updated = 0;

  for (const q of questions) {
    if (q.description) {
      const cleanDesc = q.description
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      if (cleanDesc !== q.description) {
        await prisma.codingQuestion.update({
          where: { id: q.id },
          data: { description: cleanDesc }
        });
        updated++;
      }
    }
  }

  console.log(`Cleaned HTML entities in ${updated} questions.`);
}

main().finally(() => prisma.$disconnect());
