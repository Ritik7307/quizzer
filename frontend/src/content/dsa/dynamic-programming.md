# Dynamic Programming (DP)

Dynamic Programming is a method for solving complex problems by breaking them down into simpler subproblems. It is applicable when the subproblems overlap.

## The Two Approaches

### 1. Top-Down (Memoization)
You write a recursive function and save the answers to subproblems in a hash map or array so you never compute the same subproblem twice.
- **Pros:** Easier to write if you understand recursion. Only computes necessary states.
- **Cons:** Recursion overhead (call stack size limits).

### 2. Bottom-Up (Tabulation)
You iteratively compute the answers to subproblems starting from the base cases up to the final answer, typically using loops and a DP table (array).
- **Pros:** No recursion overhead. Often easier to optimize space.
- **Cons:** Computes all states, even if some are strictly unnecessary.

## Common FAANG DP Patterns

### 1. 1D DP (Fibonacci Sequence)
The current state depends only on a few previous states.
- **Examples:** Climbing Stairs, House Robber.
- **Optimization:** You often don't need a full array of size N; just keeping track of `prev1` and `prev2` reduces Space Complexity from O(N) to O(1).

### 2. 2D DP (Grids & Strings)
The state requires two parameters to define.
- **Examples:** Unique Paths, Longest Common Subsequence (LCS), Edit Distance.

### 3. The 0/1 Knapsack Pattern
You have a set of items, each with a weight and a value, and a knapsack with a maximum weight capacity. Determine the maximum value.
- **Examples:** Partition Equal Subset Sum, Target Sum.

\`\`\`python
# 0/1 Knapsack Tabulation
def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0 for _ in range(capacity + 1)] for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            if weights[i-1] <= w:
                # Include item or exclude item
                dp[i][w] = max(values[i-1] + dp[i-1][w-weights[i-1]], dp[i-1][w])
            else:
                dp[i][w] = dp[i-1][w]
                
    return dp[n][capacity]
\`\`\`
