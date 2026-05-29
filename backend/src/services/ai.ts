import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateCodeHint(
  questionTitle: string,
  questionDesc: string,
  userCode: string,
  language: string
): Promise<string> {
  try {
    if (!process.env.GROQ_API_KEY) {
      return "AI Hint system is currently disabled (Missing API Key).";
    }

    const prompt = `
You are an expert coding mentor. A student is trying to solve a coding problem on a platform called Quizzer.
Problem: ${questionTitle}
Description: ${questionDesc}

Student's current code (${language}):
\`\`\`${language}
${userCode}
\`\`\`

Analyze the student's code. Provide a single, short, helpful hint.
DO NOT provide the full solution. DO NOT provide the fixed code.
Point out a potential logical flaw, syntax error, or time complexity issue.
Be extremely concise (max 3 sentences).
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 150,
    });

    return chatCompletion.choices[0]?.message?.content || "No hint could be generated at this time.";
  } catch (error) {
    console.error("Error generating Groq AI hint:", error);
    return "An error occurred while generating the hint. Please try again later.";
  }
}
