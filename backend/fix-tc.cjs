const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const testCases = JSON.stringify([
  {
    input: "[4,6,7,7]",
    output: "[[4,6],[4,6,7],[4,6,7,7],[4,7],[4,7,7],[6,7],[6,7,7],[7,7]]"
  },
  {
    input: "[4,4,3,2,1]",
    output: "[[4,4]]"
  }
]);

prisma.codingQuestion.update({
  where: { id: 'cmprb2o2t0000upkgivgb3dhf' },
  data: { testCases }
}).then(() => {
  console.log("Successfully fixed test cases for Non-decreasing Subsequences!");
}).finally(() => prisma.$disconnect());
