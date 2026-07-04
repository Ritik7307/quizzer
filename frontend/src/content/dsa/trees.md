# Trees & Graphs: The Core of FAANG Interviews

Trees and Graphs are the most frequently asked data structures in FAANG interviews (especially Google and Amazon). Mastering them requires a deep understanding of traversal algorithms.

## Binary Trees

A Binary Tree is a tree data structure in which each node has at most two children, referred to as the left child and the right child.

### Essential Traversals:
1. **Inorder (Left, Root, Right):** Visits nodes in ascending order for a BST.
2. **Preorder (Root, Left, Right):** Useful for creating a copy of the tree.
3. **Postorder (Left, Right, Root):** Useful for deleting the tree.
4. **Level Order (BFS):** Traverses the tree level by level using a Queue.

## Graphs

A Graph consists of a finite set of vertices (or nodes) and a set of edges connecting these vertices.

### Graph Traversal Algorithms

#### 1. Depth-First Search (DFS)
Explores as far as possible along each branch before backtracking. Typically implemented using recursion (call stack).
- **Time Complexity:** O(V + E)
- **Use Case:** Finding connected components, topological sorting, solving mazes.

#### 2. Breadth-First Search (BFS)
Explores the neighbor nodes first, before moving to the next level neighbors. Implemented using a Queue.
- **Time Complexity:** O(V + E)
- **Use Case:** Finding the shortest path in an unweighted graph.

### Advanced FAANG Graph Algorithms
- **Dijkstra's Algorithm:** Shortest path in a weighted graph (no negative weights).
- **Bellman-Ford:** Shortest path in a weighted graph (handles negative weights).
- **Union-Find (Disjoint Set):** Extremely common in Amazon interviews for detecting cycles in undirected graphs or calculating minimum spanning trees (Kruskal's).

> **Interview Tip:** Always clarify if the graph is Directed or Undirected, and if it contains Cycles! If a graph has cycles, your DFS **must** use a `visited` set to prevent infinite loops.
