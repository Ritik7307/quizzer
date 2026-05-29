const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const q = await prisma.notification.findMany();
    console.log('Notifications Count:', q.length);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main().finally(() => prisma.$disconnect());
