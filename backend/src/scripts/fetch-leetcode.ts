import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

async function fetchRandomLeetcodeSlugs(limit = 10) {
  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        questions: data {
          titleSlug
        }
      }
    }
  `;
  
  const variables = {
    categorySlug: "",
    skip: Math.floor(Math.random() * 500), // Random skip to get random problems
    limit: limit,
    filters: {}
  };

  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });

  const data = await res.json();
  return data.data.problemsetQuestionList.questions.map((q: any) => q.titleSlug);
}

async function fetchQuestionDetails(slug: string) {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        content
        difficulty
        exampleTestcases
        topicTags {
          name
        }
      }
    }
  `;
  
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { titleSlug: slug } })
  });

  const data = await res.json();
  return data.data.question;
}

function parseTestcases(exampleTestcases: string) {
  if (!exampleTestcases) return "[]";
  
  // Leetcode exampleTestcases is usually a string with newlines. 
  // It's hard to parse perfectly into input/output without the metaData.
  // We'll create a generic array to satisfy the DB.
  const lines = exampleTestcases.split("\n").filter(Boolean);
  const formatted = [];
  
  // Very rough approximation: take pairs
  for (let i = 0; i < lines.length; i += 2) {
    if (lines[i] && lines[i+1]) {
      formatted.push({ input: lines[i], output: lines[i+1] });
    } else {
      formatted.push({ input: lines[i], output: "Example Output" });
    }
  }
  return JSON.stringify(formatted);
}

function cleanHtml(html: string) {
  if (!html) return "";
  // Simple regex to replace HTML tags with newlines or spaces for markdown-like display
  return html
    .replace(/<p>/g, "")
    .replace(/<\/p>/g, "\n\n")
    .replace(/<strong>/g, "**")
    .replace(/<\/strong>/g, "**")
    .replace(/<code>/g, "\`")
    .replace(/<\/code>/g, "\`")
    .replace(/<pre>/g, "\`\`\`\n")
    .replace(/<\/pre>/g, "\n\`\`\`\n")
    .replace(/<ul>/g, "")
    .replace(/<\/ul>/g, "\n")
    .replace(/<li>/g, "- ")
    .replace(/<\/li>/g, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>?/gm, ""); // strip remaining
}

export async function fetchAndSeedExternalProblems(count = 5) {
  console.log(`Fetching ${count} random problems from LeetCode...`);
  try {
    const slugs = await fetchRandomLeetcodeSlugs(count);
    
    let added = 0;
    for (const slug of slugs) {
      console.log(`Fetching details for: ${slug}`);
      const details = await fetchQuestionDetails(slug);
      
      if (!details || !details.content) continue;

      const topics = details.topicTags.map((t: any) => t.name).join(", ");
      const testCases = parseTestcases(details.exampleTestcases);
      const cleanDesc = cleanHtml(details.content);

      await prisma.codingQuestion.create({
        data: {
          title: details.title,
          description: cleanDesc,
          difficulty: details.difficulty,
          topic: topics,
          testCases: testCases,
          referenceUrl: `https://leetcode.com/problems/${slug}/`,
          isExternalOnly: true,
          inputFormat: "See description for input format",
          outputFormat: "See description for output format"
        }
      });
      added++;
    }
    
    console.log(`Successfully fetched and saved ${added} problems!`);
  } catch (error) {
    console.error("Failed to fetch external problems:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// If run directly via tsx
if (process.argv[1] && process.argv[1].includes("fetch-leetcode.ts")) {
  fetchAndSeedExternalProblems().then(() => process.exit(0));
}
