import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 12);
  const candidatePassword = await bcrypt.hash("student123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@quizzer.dev" },
    update: { role: Role.ADMIN },
    create: {
      email: "admin@quizzer.dev",
      name: "Quiz Admin",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const candidates = await Promise.all(
    [
      { email: "alice@student.dev", name: "Alice Johnson" },
      { email: "bob@student.dev", name: "Bob Smith" },
      { email: "carol@student.dev", name: "Carol Davis" },
    ].map((c) =>
      prisma.user.upsert({
        where: { email: c.email },
        update: {},
        create: {
          email: c.email,
          name: c.name,
          passwordHash: candidatePassword,
          role: Role.CANDIDATE,
        },
      })
    )
  );

  const startTime = new Date();
  startTime.setHours(startTime.getHours() - 1);
  const endTime = new Date();
  endTime.setDate(endTime.getDate() + 30);

  const quiz = await prisma.quiz.upsert({
    where: { id: "seed-quiz-js-fundamentals" },
    update: {},
    create: {
      id: "seed-quiz-js-fundamentals",
      title: "JavaScript Fundamentals",
      description: "Test your knowledge of core JavaScript concepts for the upskilling series.",
      instructions:
        "Read each question carefully. You have 15 minutes. Navigate using Next/Previous or the question palette. The quiz auto-submits when time runs out.",
      duration: 15,
      published: true,
      startTime,
      endTime,
      createdById: admin.id,
    },
  });

  await prisma.question.deleteMany({ where: { quizId: quiz.id } });

  const questions = [
    {
      text: "Which keyword declares a block-scoped variable in JavaScript?",
      options: ["var", "let", "function", "const enum"],
      correctOptionIndex: 1,
    },
    {
      text: "What does `typeof null` return in JavaScript?",
      options: ["'null'", "'undefined'", "'object'", "'number'"],
      correctOptionIndex: 2,
    },
    {
      text: "Which array method returns a new array with transformed elements?",
      options: ["forEach", "map", "push", "splice"],
      correctOptionIndex: 1,
    },
    {
      text: "What is the output of `[] + []` in JavaScript?",
      options: ["[]", "0", "'' (empty string)", "undefined"],
      correctOptionIndex: 2,
    },
    {
      text: "Which statement about `async/await` is correct?",
      options: [
        "await can only be used inside async functions",
        "async functions always run synchronously",
        "await returns a Promise immediately without waiting",
        "async functions cannot throw errors",
      ],
      correctOptionIndex: 0,
    },
  ];

  for (let i = 0; i < questions.length; i++) {
    await prisma.question.create({
      data: {
        quizId: quiz.id,
        text: questions[i].text,
        options: JSON.stringify(questions[i].options),
        correctOptionIndex: questions[i].correctOptionIndex,
        order: i,
      },
    });
  }

  const reactQuiz = await prisma.quiz.create({
    data: {
      title: "React Essentials",
      description: "Components, hooks, and rendering — draft quiz for admins.",
      instructions: "Complete all questions. No negative marking.",
      duration: 20,
      published: false,
      createdById: admin.id,
    },
  });

  await prisma.question.createMany({
    data: [
      {
        quizId: reactQuiz.id,
        text: "Which hook manages local state in a function component?",
        options: JSON.stringify(["useEffect", "useState", "useMemo", "useRef"]),
        correctOptionIndex: 1,
        order: 0,
      },
      {
        quizId: reactQuiz.id,
        text: "What is the virtual DOM primarily used for?",
        options: JSON.stringify([
          "Storing user passwords",
          "Efficient UI updates via diffing",
          "Database caching",
          "Server-side routing",
        ]),
        correctOptionIndex: 1,
        order: 1,
      },
    ],
  });

  console.log("Seed completed:");
  console.log("  Admin: admin@quizzer.dev / admin123");
  console.log("  Students: alice@student.dev, bob@student.dev, carol@student.dev / student123");
  console.log(`  Published quiz: ${quiz.title} (${questions.length} questions)`);
  console.log(`  Draft quiz: ${reactQuiz.title}`);
  console.log(`  Candidates created: ${candidates.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
