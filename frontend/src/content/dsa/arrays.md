# Arrays: The Foundation of DSA

An array is a collection of items stored at contiguous memory locations. The idea is to store multiple items of the same type together, making it easier to calculate the position of each element by simply adding an offset to a base value (the memory location of the first element).

## Time Complexities
| Operation | Time Complexity |
|-----------|-----------------|
| Access    | O(1)            |
| Search    | O(N)            |
| Insertion | O(N)            |
| Deletion  | O(N)            |

## FAANG & CP Concepts

To solve FAANG array questions, you must master the following patterns:

### 1. Two Pointers
Used when searching for pairs in a sorted array or reversing structures.
\`\`\`cpp
// Example: Two Sum on a Sorted Array
bool hasPairSum(vector<int>& arr, int target) {
    int left = 0;
    int right = arr.size() - 1;
    
    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) return true;
        if (sum < target) left++;
        else right--;
    }
    return false;
}
\`\`\`

### 2. Sliding Window
Used for finding subarrays with specific properties (e.g., maximum sum of size K).

### 3. Prefix Sum
Used for answering range sum queries in O(1) time after O(N) preprocessing.

> **Pro Tip for CP:** Always check constraints! If $N \le 10^5$, an $O(N \log N)$ or $O(N)$ solution is required. If $N \le 10^3$, $O(N^2)$ might pass!
