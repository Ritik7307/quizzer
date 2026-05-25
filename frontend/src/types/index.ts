export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: "ADMIN" | "CANDIDATE";
  leetcodeHandle?: string | null;
  codeforcesHandle?: string | null;
  createdAt?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  instructions: string;
  duration: number;
  published: boolean;
  startTime?: string | null;
  endTime?: string | null;
  createdAt: string;
  _count?: { questions: number; attempts?: number };
  isActive?: boolean;
  attempt?: AttemptSummary | null;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex?: number;
  order: number;
}

export interface AttemptSummary {
  id: string;
  submittedAt?: string | null;
  score?: number;
  percentage?: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number | null;
  percentage: number;
  submittedAt: string;
}

export interface QuizResult {
  score: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  rank: number | null;
  submittedAt: string;
}
