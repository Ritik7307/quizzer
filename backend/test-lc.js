fetch('https://leetcode.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList: questionList(
          categorySlug: $categorySlug
          limit: $limit
          skip: $skip
          filters: $filters
        ) {
          total: totalNum
          questions: data {
            difficulty
            title
            titleSlug
            isPaidOnly
          }
        }
      }
    `,
    variables: {
      categorySlug: "",
      skip: 0,
      limit: 50,
      filters: {}
    }
  })
}).then(r => r.json()).then(data => {
  console.log(data.data.problemsetQuestionList.questions.slice(0, 3));
}).catch(console.error);
