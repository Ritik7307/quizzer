import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "@node-rs/bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const candidatePassword = await bcrypt.hash("student123", 10);

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

  // Seed coding questions
  await prisma.codingQuestion.deleteMany({});
  const sumQuestion = await prisma.codingQuestion.create({
    data: {
      title: "Sum of Two Numbers",
      description: "Write a program that takes two integers as input and prints their sum. Both integers will be provided on a single line, separated by a space.",
      inputFormat: "Two space-separated integers, a and b.",
      outputFormat: "Print a single integer representing the sum of a and b.",
      sampleInput: "5 7\n",
      sampleOutput: "12\n",
      difficulty: "Easy",
      testCases: JSON.stringify([
        { input: "5 7\n", output: "12\n" },
        { input: "10 -3\n", output: "7\n" },
        { input: "-100 -200\n", output: "-300\n" },
        { input: "0 0\n", output: "0\n" },
        { input: "999999999 1\n", output: "1000000000\n" }
      ])
    }
  });

  const evenOddQuestion = await prisma.codingQuestion.create({
    data: {
      title: "Even or Odd",
      description: "Write a program that reads an integer and prints 'Even' if it is even, and 'Odd' if it is odd.",
      inputFormat: "A single integer, n.",
      outputFormat: "Print 'Even' or 'Odd'.",
      sampleInput: "4\n",
      sampleOutput: "Even\n",
      difficulty: "Easy",
      testCases: JSON.stringify([
        { input: "4\n", output: "Even\n" },
        { input: "7\n", output: "Odd\n" },
        { input: "0\n", output: "Even\n" },
        { input: "-5\n", output: "Odd\n" }
      ])
    }
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
