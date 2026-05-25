"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Play, Search, Code, History, BookOpen, Loader2, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { Quiz } from "@/types";

interface CodingQuestion {
  id: string;
  title: string;
  difficulty: string;
  sampleInput: string;
  sampleOutput: string;
  createdAt: string;
}

interface CodingSubmission {
  id: string;
  code: string;
  language: string;
  status: string;
  passedCount: number;
  totalCount: number;
  errorDetails: string | null;
  createdAt: string;
  codingQuestion: {
    title: string;
  };
}

export default function CandidateDashboard() {
  const { token, user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingCoding, setLoadingCoding] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"quizzes" | "coding" | "history">("quizzes");
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Load data based on selected tab
  useEffect(() => {
    if (!token) return;

    if (activeTab === "quizzes") {
      setLoading(true);
      api<{ quizzes: Quiz[] }>("/api/quizzes", { token })
        .then((d) => setQuizzes(d.quizzes))
        .catch(() => toast.error("Failed to load quizzes"))
        .finally(() => setLoading(false));
    } else if (activeTab === "coding") {
      setLoadingCoding(true);
      api<{ questions: CodingQuestion[] }>("/api/coding/questions", { token })
        .then((d) => setCodingQuestions(d.questions))
        .catch(() => toast.error("Failed to load coding questions"))
        .finally(() => setLoadingCoding(false));
    } else if (activeTab === "history") {
      setLoadingSubmissions(true);
      api<{ submissions: CodingSubmission[] }>("/api/coding/submissions", { token })
        .then((d) => setSubmissions(d.submissions))
        .catch(() => toast.error("Failed to load submission history"))
        .finally(() => setLoadingSubmissions(false));
    }
  }, [token, activeTab]);

  // Search logic
  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCoding = codingQuestions.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLanguageLabel = (lang: string) => {
    if (lang === "cpp") return "C++";
    if (lang === "c") return "C";
    if (lang === "java") return "Java";
    return lang.toUpperCase();
  };

  return (
    <ProtectedRoute role="CANDIDATE">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in">
        
        {/* Welcome header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-900 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Welcome, {user?.name}</h1>
            <p className="mt-1 text-sm text-neutral-450 sm:text-base">
              {activeTab === "quizzes" && "Available quizzes for the upskilling series"}
              {activeTab === "coding" && "Practice your programming logic in C++, Java, and C"}
              {activeTab === "history" && "Analyze your past code compile and run submissions"}
            </p>
          </div>

          {/* Gamification Stats */}
          {user && (
            <div className="flex items-center gap-3 shrink-0">
              {/* Active Days (Streak) */}
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-950/15 px-3.5 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.06)]">
                <svg
                  className="h-4.5 w-4.5 text-emerald-400 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14l2 2 4-4" />
                </svg>
                <div>
                  <p className="text-sm font-extrabold text-emerald-400 leading-none">{user.streak ?? 0}</p>
                  <p className="text-[8px] font-extrabold text-emerald-550 uppercase tracking-widest mt-1 leading-none">Active Days</p>
                </div>
              </div>

              {/* Points */}
              <div className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-950/20 px-3.5 py-1.5 shadow-[0_0_12px_rgba(139,92,246,0.08)]">
                <span className="text-lg">✨</span>
                <div>
                  <p className="text-sm font-extrabold text-violet-400 leading-none">{user.points ?? 0}</p>
                  <p className="text-[8px] font-extrabold text-violet-500 uppercase tracking-widest mt-1 leading-none">Total Points</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex gap-1 sm:gap-2 border-b border-neutral-800 pb-px mb-6">
          {[
            { id: "quizzes", label: "Quizzes", icon: BookOpen },
            { id: "coding", label: "Coding Practice", icon: Code },
            { id: "history", label: "Submissions History", icon: History },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setSearch("");
                setExpandedSubId(null);
              }}
              className={`flex items-center gap-1.5 border-b-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Search input (not needed for history tab) */}
        {activeTab !== "history" && (
          <div className="relative mb-6 max-w-md animate-fade-in">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              className="pl-10"
              placeholder={activeTab === "quizzes" ? "Search quizzes..." : "Search coding problems..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Tab Content Rendering */}
        {activeTab === "quizzes" && (
          /* 1. QUIZZES TAB */
          loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <Card className="border-neutral-800">
              <CardContent className="py-12 text-center text-neutral-500">No quizzes found.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredQuizzes.map((quiz) => (
                <Card key={quiz.id} className="flex flex-col transition-shadow border-neutral-800 bg-neutral-950/20 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      {quiz.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm text-neutral-500">
                      <Clock className="h-4 w-4" /> {quiz.duration} min · {quiz._count?.questions ?? 0} Qs
                    </span>
                    {quiz.attempt?.submittedAt ? (
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/quiz/${quiz.id}/result`}>View Result</Link>
                      </Button>
                    ) : (
                      <Button size="sm" disabled={!quiz.isActive} asChild={quiz.isActive}>
                        {quiz.isActive ? (
                          <Link href={`/quiz/${quiz.id}/take`}>
                            <Play className="h-4 w-4" /> Start
                          </Link>
                        ) : (
                          <span>Unavailable</span>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === "coding" && (
          /* 2. CODING PRACTICE TAB */
          loadingCoding ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : filteredCoding.length === 0 ? (
            <Card className="border-neutral-800">
              <CardContent className="py-12 text-center text-neutral-500">No coding questions found.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCoding.map((question) => (
                <Card key={question.id} className="flex flex-col transition-shadow border-neutral-800 bg-neutral-950/20 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{question.title}</CardTitle>
                      <Badge
                        className={
                          question.difficulty === "Easy"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : question.difficulty === "Medium"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }
                      >
                        {question.difficulty}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      Practice inputs: {question.sampleInput.trim() || "None"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto flex items-center justify-end">
                    <Button size="sm" asChild>
                      <Link href={`/coding/${question.id}`}>
                        <Play className="h-4 w-4" /> Practice
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === "history" && (
          /* 3. SUBMISSION HISTORY TAB */
          loadingSubmissions ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : submissions.length === 0 ? (
            <Card className="border-neutral-800">
              <CardContent className="py-12 text-center text-neutral-500">No coding attempts recorded yet.</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <Card key={sub.id} className="border-neutral-800 bg-neutral-950/20">
                  <div
                    onClick={() => setExpandedSubId(expandedSubId === sub.id ? null : sub.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 cursor-pointer hover:bg-neutral-900/10 transition-colors"
                  >
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-neutral-200">{sub.codingQuestion.title}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                        <span>Language: {getLanguageLabel(sub.language)}</span>
                        <span>•</span>
                        <span>Date: {formatDate(sub.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      {/* Score / Cases Passed */}
                      <span className="text-sm font-medium text-neutral-400">
                        {sub.passedCount}/{sub.totalCount} Cases
                      </span>

                      {/* Status Badge */}
                      <Badge
                        className={
                          sub.status === "Accepted"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : sub.status === "Compile Error"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }
                      >
                        {sub.status}
                      </Badge>

                      {/* Expand Toggle */}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {expandedSubId === sub.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Submission Detail (Code Inspection) */}
                  {expandedSubId === sub.id && (
                    <CardContent className="border-t border-neutral-900 pt-4 bg-black/40">
                      <div className="space-y-3">
                        {/* Error info (if any failed) */}
                        {sub.errorDetails && (
                          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400 flex items-start gap-2 leading-relaxed">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div className="whitespace-pre-wrap">{sub.errorDetails}</div>
                          </div>
                        )}

                        {/* Submitted Code Block */}
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-neutral-500">Submitted Code</Label>
                          <pre className="rounded-lg border border-neutral-850 bg-neutral-950 p-4 font-mono text-xs text-neutral-300 overflow-x-auto max-h-72 whitespace-pre leading-relaxed">
                            {sub.code}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
