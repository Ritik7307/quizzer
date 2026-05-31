import fs from 'fs';

async function fetchProblems() {
  console.log("Fetching LeetCode problems...");
  const lcRes = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
          problemsetQuestionList: questionList(
            categorySlug: $categorySlug
            limit: $limit
            skip: $skip
            filters: $filters
          ) {
            questions: data {
              difficulty
              title
              titleSlug
              isPaidOnly
            }
          }
        }
      `,
      variables: { categorySlug: "", skip: 0, limit: 3000, filters: {} }
    })
  });
  const lcData = await lcRes.json();
  const lcQuestions = lcData?.data?.problemsetQuestionList?.questions || [];
  const leetCode = lcQuestions.filter((q) => !q.isPaidOnly).map((q) => ({
    title: q.title,
    titleSlug: q.titleSlug,
    difficulty: q.difficulty
  }));

  console.log("Fetching Codeforces problems...");
  const cfRes = await fetch("https://codeforces.com/api/problemset.problems");
  const cfData = await cfRes.json();
  let codeforces = [];
  if (cfData.status === "OK") {
    codeforces = cfData.result.problems.map((q) => ({
      contestId: q.contestId,
      index: q.index,
      name: q.name,
      rating: q.rating
    }));
  }

  const result = {
    leetCode,
    codeforces
  };

  fs.writeFileSync('data/external_problems.json', JSON.stringify(result));
  console.log("Problems saved to data/external_problems.json!");
}

fetchProblems().catch(console.error);
