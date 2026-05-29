const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const q = await prisma.codingQuestion.findMany({ where: { isExternalOnly: true } });
  console.log('Count:', q.length);
}

main().finally(() => prisma.$disconnect());
