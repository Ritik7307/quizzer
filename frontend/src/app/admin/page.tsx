"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, FileDown, Plus, Users, Bell, Star, MessageSquare, Award } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, exportCsvUrl } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { Quiz } from "@/types";
import { cn } from "@/lib/utils";

interface DashboardData {
  stats: { quizCount: number; attemptCount: number; userCount: number };
  recentAttempts: Array<{
    id: string;
    score: number;
    percentage: number;
    submittedAt: string;
    user: { name: string; email: string };
    quiz: { title: string };
  }>;
}

interface FeedbackItem {
  id: string;
  rating: number;
  difficulty: string;
  category: string;
  comments: string | null;
  createdAt: string;
  user: { name: string; email: string };
  attempt: {
    score: number;
    percentage: number;
    correctCount: number;
    wrongCount: number;
    totalQuestions: number;
    quiz: { title: string };
  } | null;
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab state: overview vs feedback
  const [activeTab, setActiveTab] = useState<"overview" | "feedback">("overview");

  // Feedback dashboard states
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api<DashboardData>("/api/admin/dashboard", { token }),
      api<{ quizzes: Quiz[] }>("/api/quizzes", { token }),
    ])
      .then(([dash, q]) => {
        setData(dash);
        setQuizzes(q.quizzes);
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [token]);

  // Fetch feedback reviews
  useEffect(() => {
    if (activeTab === "feedback" && token) {
      setLoadingFeedback(true);
      api<{ feedbacks: FeedbackItem[] }>("/api/admin/feedback", { token })
        .then((res) => {
          setFeedbacks(res.feedbacks);
        })
        .catch(() => toast.error("Failed to load feedback reviews"))
        .finally(() => setLoadingFeedback(false));
    }
  }, [activeTab, token]);

  // Compute feedback summary statistics
  const totalReviews = feedbacks.length;
  const avgRating =
    totalReviews > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews).toFixed(1)
      : "0.0";

  const diffCounts = feedbacks.reduce(
    (acc, f) => {
      acc[f.difficulty] = (acc[f.difficulty] || 0) + 1;
      return acc;
    },
    { Easy: 0, Medium: 0, Hard: 0 } as Record<string, number>
  );

  return (
    <ProtectedRoute role="ADMIN">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in">
        
        {/* Title and Controls Header */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-900 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Admin Control Center</h1>
            <p className="text-sm text-neutral-400 sm:text-base">Manage quizzes, coding problems, notifications, and candidate reviews.</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button asChild variant="outline" className="w-full sm:w-auto border-neutral-800 text-neutral-300 hover:bg-neutral-800">
              <Link href="/admin/notifications">
                <Bell className="mr-2 h-4 w-4" /> Send Notification
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto border-neutral-800 text-neutral-300 hover:bg-neutral-800">
              <Link href="/admin/coding/new">
                <Plus className="mr-2 h-4 w-4" /> New Coding Problem
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto bg-violet-600 hover:bg-violet-750 text-white font-semibold">
              <Link href="/admin/quizzes/new">
                <Plus className="mr-2 h-4 w-4" /> New Quiz
              </Link>
            </Button>
          </div>
        </div>

        {/* Tab Navigation buttons */}
        <div className="flex border-b border-neutral-900 mb-6 gap-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "text-sm font-bold uppercase tracking-wider pb-2 outline-none border-b-2 transition-all select-none",
              activeTab === "overview"
                ? "text-violet-400 border-violet-500"
                : "text-neutral-500 border-transparent hover:text-neutral-300"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("feedback")}
            className={cn(
              "text-sm font-bold uppercase tracking-wider pb-2 outline-none border-b-2 transition-all select-none flex items-center gap-1.5",
              activeTab === "feedback"
                ? "text-violet-400 border-violet-500"
                : "text-neutral-500 border-transparent hover:text-neutral-300"
            )}
          >
            Candidate Reviews
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === "overview" ? (
              <>
                {/* Stats row */}
                <div className="mb-8 grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Total Quizzes", value: data?.stats.quizCount, icon: BarChart3 },
                    { label: "Submissions", value: data?.stats.attemptCount, icon: Users },
                    { label: "Candidates", value: data?.stats.userCount, icon: Users },
                  ].map((s) => (
                    <Card key={s.label} className="border-neutral-800 bg-neutral-950/40">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-550">{s.label}</CardTitle>
                        <s.icon className="h-4 w-4 text-violet-500" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{s.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Quizzes & Recent Submissions Cards */}
                <div className="grid gap-8 lg:grid-cols-2">
                  <Card className="border-neutral-800 bg-neutral-950/40">
                    <CardHeader>
                      <CardTitle>Your Quizzes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {quizzes.map((q) => (
                        <div
                          key={q.id}
                          className="flex flex-col gap-3 rounded-xl border border-neutral-850 p-4 sm:flex-row sm:items-center sm:justify-between bg-neutral-900/10"
                        >
                          <div>
                            <p className="font-medium text-white">{q.title}</p>
                            <p className="text-xs text-neutral-500">
                              {q._count?.questions ?? 0} questions · {q.duration} min
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={q.published ? "success" : "warning"}>
                              {q.published ? "Published" : "Draft"}
                            </Badge>
                            <Button variant="outline" size="sm" asChild className="border-neutral-750 text-neutral-350 hover:bg-neutral-800">
                              <Link href={`/admin/quizzes/${q.id}`}>Manage</Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="text-neutral-400 hover:text-neutral-200">
                              <a
                                href={exportCsvUrl(q.id)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  fetch(exportCsvUrl(q.id), {
                                    headers: { Authorization: `Bearer ${token}` },
                                  })
                                    .then((r) => r.blob())
                                    .then((blob) => {
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = `quiz-${q.id}-results.csv`;
                                      a.click();
                                    })
                                    .catch(() => toast.error("Export failed"));
                                }}
                              >
                                <FileDown className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-neutral-800 bg-neutral-950/40">
                    <CardHeader>
                      <CardTitle>Recent Submissions</CardTitle>
                      <CardDescription>Latest candidate attempts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data?.recentAttempts.length === 0 && (
                        <p className="text-sm text-neutral-500">No submissions yet.</p>
                      )}
                      {data?.recentAttempts.map((a) => (
                        <div key={a.id} className="flex justify-between text-sm border-b border-neutral-900/60 pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium text-neutral-200">{a.user.name}</p>
                            <p className="text-xs text-neutral-500">{a.quiz.title}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-violet-500">{a.percentage}%</p>
                            <p className="text-xs text-neutral-500">{a.score} pts</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              // Feedback Review tab
              <div className="space-y-6">
                
                {/* Feedback statistics summary row */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <Card className="border-neutral-800 bg-neutral-950/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold text-neutral-550 uppercase tracking-wider">Average Rating</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-baseline gap-2">
                      <p className="text-4xl font-extrabold text-amber-500">{avgRating}</p>
                      <div className="flex items-center text-amber-500">
                        <Star className="h-5 w-5 fill-amber-500" />
                        <span className="text-xs text-neutral-455 ml-1">/ 5.0</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-neutral-800 bg-neutral-950/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold text-neutral-555 uppercase tracking-wider">Total Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-extrabold text-white">{totalReviews}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-neutral-800 bg-neutral-950/40 sm:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold text-neutral-555 uppercase tracking-wider">Quiz Difficulty Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4 h-10">
                      <div className="flex-1 flex gap-1 h-3 rounded-full overflow-hidden bg-neutral-900 border border-neutral-850">
                        <div
                          className="bg-green-500 h-full transition-all"
                          style={{
                            width: `${
                              totalReviews > 0 ? (diffCounts.Easy / totalReviews) * 100 : 0
                            }%`,
                          }}
                          title={`Easy: ${diffCounts.Easy}`}
                        />
                        <div
                          className="bg-yellow-500 h-full transition-all"
                          style={{
                            width: `${
                              totalReviews > 0 ? (diffCounts.Medium / totalReviews) * 100 : 0
                            }%`,
                          }}
                          title={`Medium: ${diffCounts.Medium}`}
                        />
                        <div
                          className="bg-red-500 h-full transition-all"
                          style={{
                            width: `${
                              totalReviews > 0 ? (diffCounts.Hard / totalReviews) * 100 : 0
                            }%`,
                          }}
                          title={`Hard: ${diffCounts.Hard}`}
                        />
                      </div>
                      <div className="flex gap-3 text-xs font-semibold text-neutral-400 shrink-0">
                        <span className="flex items-center gap-1">🟢 {diffCounts.Easy}</span>
                        <span className="flex items-center gap-1">🟡 {diffCounts.Medium}</span>
                        <span className="flex items-center gap-1">🔴 {diffCounts.Hard}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Feedbacks list */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white tracking-tight">Candidate Comments & Reviews</h2>
                  
                  {loadingFeedback ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                      ))}
                    </div>
                  ) : feedbacks.length === 0 ? (
                    <Card className="border-neutral-800 bg-neutral-955/40 text-center py-12">
                      <CardContent className="space-y-2">
                        <MessageSquare className="h-8 w-8 text-neutral-600 mx-auto" />
                        <p className="text-neutral-400 font-semibold">No feedback reviews submitted yet</p>
                        <p className="text-xs text-neutral-500">Feedback will appear here once candidates complete quizzes or submit navbar reviews.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {feedbacks.map((f) => {
                        const isQuizFeedback = f.attempt !== null;

                        return (
                          <Card key={f.id} className="border-neutral-800 bg-neutral-950/30 shadow-md">
                            <CardHeader className="pb-3 border-b border-neutral-900/50">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-bold text-white text-sm">{f.user.name}</p>
                                  <p className="text-[10px] text-neutral-500">{f.user.email}</p>
                                </div>
                                {isQuizFeedback ? (
                                  <Badge
                                    variant={
                                      f.difficulty === "Easy"
                                        ? "success"
                                        : f.difficulty === "Medium"
                                        ? "warning"
                                        : "outline"
                                    }
                                    className={cn(
                                      "text-[10px] py-0.5 px-2 font-semibold",
                                      f.difficulty === "Hard" && "border-red-500/30 text-red-300 bg-red-950/20"
                                    )}
                                  >
                                    Difficulty: {f.difficulty}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant={
                                      f.category === "Bug"
                                        ? "outline"
                                        : f.category === "Suggestion"
                                        ? "warning"
                                        : "default"
                                    }
                                    className={cn(
                                      "text-[10px] py-0.5 px-2 font-semibold uppercase tracking-wider",
                                      f.category === "Bug" && "border-red-500/30 text-red-300 bg-red-950/20"
                                    )}
                                  >
                                    {f.category === "Bug" ? "🐛 Bug" : f.category === "Suggestion" ? "💡 Suggestion" : "💬 General"}
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                              {isQuizFeedback ? (
                                <div className="flex items-center justify-between text-xs text-neutral-450 border-b border-neutral-900/30 pb-2">
                                  <span className="font-semibold text-neutral-300 truncate max-w-[180px]">
                                    Quiz: {f.attempt!.quiz.title}
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] font-bold text-violet-400">
                                    <Award className="h-3.5 w-3.5" /> {f.attempt!.percentage}% ({f.attempt!.score} pts)
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-xs text-neutral-450 border-b border-neutral-900/30 pb-2">
                                  <span className="font-semibold text-violet-450">Platform Review</span>
                                </div>
                              )}

                              {/* Stars rating */}
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      "h-4 w-4",
                                      star <= f.rating
                                        ? "fill-amber-500 text-amber-500"
                                        : "text-neutral-800 fill-transparent"
                                    )}
                                  />
                                ))}
                              </div>

                              {f.comments ? (
                                <div className="rounded-lg bg-neutral-900/40 border border-neutral-850 p-3 font-sans text-xs text-neutral-300 leading-relaxed italic whitespace-pre-wrap">
                                  "{f.comments}"
                                </div>
                              ) : (
                                <p className="text-[10px] text-neutral-550 italic">No comments left.</p>
                              )}

                              <div className="text-[9px] text-neutral-500 text-right">
                                Submitted: {new Date(f.createdAt).toLocaleDateString()} at{" "}
                                {new Date(f.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
