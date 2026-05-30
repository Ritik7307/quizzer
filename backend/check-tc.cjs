const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.codingQuestion.findUnique({where: {id: 'cmprb2o2t0000upkgivgb3dhf'}}).then(res => {
  console.log(res.testCases);
}).finally(() => prisma.$disconnect());
