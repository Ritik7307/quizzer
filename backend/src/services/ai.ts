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

export async function generateTopicQuiz(topic: string, count: number = 5): Promise<any> {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("AI Quiz generation is currently disabled (Missing API Key).");
    }

    const prompt = `
You are an expert Data Structures and Algorithms instructor.
Generate a ${count}-question multiple-choice quiz about "${topic}".
Output ONLY a valid JSON array of question objects, nothing else. No markdown formatting, no backticks.
Each object must have the following structure:
{
  "text": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctOptionIndex": 0 // index of the correct option (0-3)
}
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = chatCompletion.choices[0]?.message?.content || "[]";
    // Strip markdown formatting if the model still includes it
    const jsonStr = content.replace(/^```json/g, "").replace(/```$/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error generating Groq AI quiz:", error);
    throw error;
  }
}

export async function generateSystemDesignScenario(topic: string): Promise<any> {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("AI System Design generation is currently disabled (Missing API Key).");
    }

    const prompt = `
You are an expert FAANG System Design Interviewer.
Generate a mock system design interview case study about "${topic}".
Output ONLY a valid JSON object, nothing else. No markdown formatting, no backticks.
The object must have the following structure:
{
  "title": "A descriptive title for the design problem",
  "problemStatement": "The core problem to solve",
  "functionalRequirements": ["Req 1", "Req 2"],
  "nonFunctionalRequirements": ["Req 1", "Req 2"],
  "capacityEstimation": "A brief overview of scale (e.g. 100M DAU, 50K QPS)",
  "hints": ["Hint 1", "Hint 2"]
}
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const jsonStr = content.replace(/^```json/g, "").replace(/```$/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error generating Groq AI system design scenario:", error);
    throw error;
  }
}

export async function generateAptitudeTest(topic: string, count: number = 5): Promise<any> {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("AI Aptitude generation is currently disabled.");
    }

    const prompt = `
You are an expert quantitative aptitude and logical reasoning instructor.
Generate a ${count}-question multiple-choice quiz about "${topic}".
Output ONLY a valid JSON array of question objects, nothing else. No markdown formatting, no backticks.
Each object must have the following structure:
{
  "text": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctOptionIndex": 0,
  "explanation": "Step-by-step mathematical or logical explanation."
}
`;
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
    });
    const content = chatCompletion.choices[0]?.message?.content || "[]";
    const jsonStr = content.replace(/^```json/g, "").replace(/```$/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error generating Aptitude quiz:", error);
    throw error;
  }
}

export async function generateCSCoreQuiz(subject: string, count: number = 5): Promise<any> {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("AI CS Core generation is currently disabled.");
    }

    const prompt = `
You are an expert Computer Science professor.
Generate a ${count}-question multiple-choice quiz about "${subject}".
Output ONLY a valid JSON array of question objects, nothing else. No markdown formatting.
Each object must have the following structure:
{
  "text": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctOptionIndex": 0
}
`;
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
    });
    const content = chatCompletion.choices[0]?.message?.content || "[]";
    const jsonStr = content.replace(/^```json/g, "").replace(/```$/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error generating CS Core quiz:", error);
    throw error;
  }
}

export async function reviewResume(resumeText: string): Promise<any> {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("AI Resume Review is currently disabled.");
    }

    const prompt = `
You are an expert FAANG technical recruiter and ATS software simulator.
Review the following resume text and provide a structured JSON response.
Output ONLY a valid JSON object, nothing else. No markdown.

Resume Text:
${resumeText}

Output structure:
{
  "atsScore": 85, // out of 100
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "actionableFeedback": ["Action 1", "Action 2"]
}
`;
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
    });
    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const jsonStr = content.replace(/^```json/g, "").replace(/```$/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error reviewing resume:", error);
    throw error;
  }
}
