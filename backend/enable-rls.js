import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
    for (const t of tables) {
      if (t.tablename.startsWith('_')) continue; // Skip Prisma migration tables
      await prisma.$executeRawUnsafe(`ALTER TABLE "${t.tablename}" ENABLE ROW LEVEL SECURITY`);
      console.log(`Enabled RLS on ${t.tablename}`);
    }
    console.log('Successfully enabled RLS on all tables!');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
