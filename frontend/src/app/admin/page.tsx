"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  FileDown,
  Plus,
  Users,
  Bell,
  Star,
  MessageSquare,
  Award,
  Brain,
  ClipboardList,
  ChevronRight,
  TrendingUp,
  Code,
  BookOpen,
} from "lucide-react";
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
  adminResponse: string | null;
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
  const { token, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab state: overview vs feedback
  const [activeTab, setActiveTab] = useState<"overview" | "feedback">("overview");

  // Feedback dashboard states
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== "ADMIN") return;
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
  }, [token, user]);

  // Fetch feedback reviews
  useEffect(() => {
    if (activeTab === "feedback" && token && user?.role === "ADMIN") {
      setLoadingFeedback(true);
      api<{ feedbacks: FeedbackItem[] }>("/api/admin/feedback", { token })
        .then((res) => {
          setFeedbacks(res.feedbacks);
        })
        .catch(() => toast.error("Failed to load feedback reviews"))
        .finally(() => setLoadingFeedback(false));
    }
  }, [activeTab, token, user]);

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

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    try {
      await api(`/api/admin/feedback/${id}`, { method: "DELETE", token });
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      toast.success("Feedback deleted");
    } catch (err) {
      toast.error("Failed to delete feedback");
    }
  };

  const handleRespondFeedback = async (id: string) => {
    const response = prompt("Enter your response:");
    if (response === null) return;
    try {
      const res = await api<{ feedback: FeedbackItem }>(`/api/admin/feedback/${id}/respond`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ adminResponse: response }),
      });
      setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, adminResponse: res.feedback.adminResponse } : f)));
      toast.success("Response saved");
    } catch (err) {
      toast.error("Failed to save response");
    }
  };

  return (
    <ProtectedRoute role="ADMIN">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 space-y-8 animate-fade-in">
        
        {/* Title and Controls Header */}
        <div className="mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <span className="bg-indigo-600 w-2 h-8 rounded-full inline-block"></span>
              Admin Control Center
            </h1>
            <p className="text-sm font-medium text-muted-foreground pl-4 sm:text-base">Manage quizzes, coding problems, notifications, and candidate reviews.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <Button asChild variant="outline" className="w-full sm:w-auto shadow-sm transition-all border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400">
              <Link href="/learn">
                <BookOpen className="mr-2 h-4 w-4" /> Learn Library
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto shadow-sm transition-all">
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" /> Users
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto shadow-sm transition-all">
              <Link href="/admin/notifications">
                <Bell className="mr-2 h-4 w-4" /> Notifications
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto shadow-sm transition-all">
              <Link href="/admin/resources">
                <Brain className="mr-2 h-4 w-4" /> Resources
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto shadow-sm transition-all">
              <Link href="/admin/coding/new">
                <Code className="mr-2 h-4 w-4" /> New Problem
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 transition-all">
              <Link href="/admin/quizzes/new">
                <Plus className="mr-2 h-4 w-4" /> New Quiz
              </Link>
            </Button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-4 border-b border-border pb-px">
          {[
            { id: "overview", label: "System Overview", icon: BarChart3 },
            { id: "feedback", label: "Candidate Reviews", icon: MessageSquare },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                "group flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all select-none focus:outline-none",
                activeTab === t.id
                  ? "border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <t.icon className={cn("h-4.5 w-4.5 transition-colors", activeTab === t.id ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground group-hover:text-foreground")} />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl border border-border" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === "overview" ? (
              <div className="space-y-8">
                
                {/* Stats Dashboard Grid */}
                <div className="grid gap-6 sm:grid-cols-3">
                  {[
                    {
                      label: "Total Quizzes",
                      value: data?.stats.quizCount,
                      icon: ClipboardList,
                      desc: "Constructed evaluation models",
                      color: "text-indigo-400 border-indigo-500/10 bg-indigo-950/10 shadow-[0_0_20px_rgba(139,92,246,0.03)]",
                    },
                    {
                      label: "Total Submissions",
                      value: data?.stats.attemptCount,
                      icon: Award,
                      desc: "Completed test runs & quizzes",
                      color: "text-amber-400 border-amber-500/10 bg-amber-950/10 shadow-[0_0_20px_rgba(245,158,11,0.03)]",
                    },
                    {
                      label: "Active Candidates",
                      value: data?.stats.userCount,
                      icon: Users,
                      desc: "Registered profile candidates",
                      color: "text-emerald-400 border-emerald-500/10 bg-emerald-950/10 shadow-[0_0_20px_rgba(16,185,129,0.03)]",
                    },
                  ].map((s) => (
                    <Card
                      key={s.label}
                      className={cn(
                        "border border-border bg-card/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50",
                        s.color.split(" ").slice(1).join(" ")
                      )}
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs lg:text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                          {s.label}
                        </CardTitle>
                        <s.icon className={cn("h-4.5 w-4.5", s.color.split(" ")[0])} />
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="text-4xl font-extrabold text-foreground tracking-tight">{s.value}</p>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Quizzes & Recent Submissions Section */}
                <div className="grid gap-8 lg:grid-cols-2">
                  
                  {/* Quizzes list */}
                  <Card className="border-border bg-card/40 backdrop-blur-md shadow-xl">
                    <CardHeader className="border-b border-border pb-4 mb-4">
                      <CardTitle className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-indigo-400" /> Managed Quizzes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {quizzes.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-6 text-center">No quizzes configured yet.</p>
                      ) : (
                        quizzes.map((q) => (
                          <div
                            key={q.id}
                            className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between bg-accent/20 hover:bg-accent/40 hover:border-border/80 transition-all duration-200 shadow-sm"
                          >
                            <div className="space-y-1">
                              <p className="font-extrabold text-base text-foreground tracking-tight">{q.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {q._count?.questions ?? 0} questions · {q.duration} min
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5 justify-between sm:justify-end">
                              <Badge
                                variant={q.published ? "success" : "warning"}
                                className="text-xs uppercase font-extrabold tracking-wider py-0.5 px-2"
                              >
                                {q.published ? "Published" : "Draft"}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-8 border-border text-xs font-extrabold uppercase text-muted-foreground bg-secondary/50 hover:bg-secondary hover:text-foreground"
                              >
                                <Link href={`/admin/quizzes/${q.id}`}>Manage</Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                                title="Export results to CSV"
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
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent attempts feed */}
                  <Card className="border-border bg-card/40 backdrop-blur-md shadow-xl">
                    <CardHeader className="border-b border-border pb-4 mb-4">
                      <CardTitle className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-400" /> Recent Quiz Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {data?.recentAttempts.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-6 text-center">No quiz submissions recorded yet.</p>
                      ) : (
                        <div className="divide-y divide-border">
                          {data?.recentAttempts.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between text-sm py-3 px-2 rounded-lg hover:bg-accent/50 transition-colors"
                            >
                              <div className="space-y-0.5">
                                <p className="font-extrabold text-foreground text-sm leading-tight flex items-center gap-1.5">
                                  {a.user.name} <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                </p>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                  Quiz: {a.quiz.title}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-extrabold text-indigo-400 text-base">{a.percentage}%</p>
                                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{a.score} pts</p>
                                </div>
                                <div className="text-xs text-muted-foreground font-semibold bg-secondary border border-border px-2 py-0.5 rounded shrink-0">
                                  {new Date(a.submittedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              // Feedback Review tab
              <div className="space-y-8">
                
                {/* Feedback statistics summary row */}
                <div className="grid gap-6 sm:grid-cols-4">
                  {/* Rating Card */}
                  <Card className="border-border bg-card/40 backdrop-blur-md shadow-xl hover:border-indigo-500/50 transition-colors duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">Average Rating</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-baseline gap-2 py-1">
                      <p className="text-5xl font-extrabold text-amber-500 tracking-tight">{avgRating}</p>
                      <div className="flex items-center text-amber-500">
                        <Star className="h-4.5 w-4.5 fill-amber-500" />
                        <span className="text-xs text-muted-foreground ml-1 font-bold">/ 5.0</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Reviews Card */}
                  <Card className="border-border bg-card/40 backdrop-blur-md shadow-xl hover:border-indigo-500/50 transition-colors duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">Total Reviews</CardTitle>
                    </CardHeader>
                    <CardContent className="py-1">
                      <p className="text-5xl font-extrabold text-foreground tracking-tight">{totalReviews}</p>
                    </CardContent>
                  </Card>

                  {/* Difficulty Distribution Card */}
                  <Card className="border-border bg-card/40 backdrop-blur-md shadow-xl sm:col-span-2 hover:border-indigo-500/50 transition-colors duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">Difficulty Rating Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4 py-2 mt-auto">
                      <div className="flex-1 flex gap-1 h-3 rounded-full overflow-hidden bg-secondary border border-border p-0.5">
                        <div
                          className="bg-emerald-500 h-full rounded-l transition-all shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          style={{
                            width: `${
                              totalReviews > 0 ? (diffCounts.Easy / totalReviews) * 100 : 0
                            }%`,
                          }}
                          title={`Easy: ${diffCounts.Easy}`}
                        />
                        <div
                          className="bg-amber-500 h-full transition-all shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                          style={{
                            width: `${
                              totalReviews > 0 ? (diffCounts.Medium / totalReviews) * 100 : 0
                            }%`,
                          }}
                          title={`Medium: ${diffCounts.Medium}`}
                        />
                        <div
                          className="bg-red-500 h-full rounded-r transition-all shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                          style={{
                            width: `${
                              totalReviews > 0 ? (diffCounts.Hard / totalReviews) * 100 : 0
                            }%`,
                          }}
                          title={`Hard: ${diffCounts.Hard}`}
                        />
                      </div>
                      <div className="flex gap-3 text-xs font-extrabold tracking-wider text-muted-foreground shrink-0">
                        <span className="flex items-center gap-1">🟢 {diffCounts.Easy}</span>
                        <span className="flex items-center gap-1">🟡 {diffCounts.Medium}</span>
                        <span className="flex items-center gap-1">🔴 {diffCounts.Hard}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Feedbacks Comments Feed */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" /> Candidate Comments & Reviews
                  </h2>
                  
                  {loadingFeedback ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl border border-border" />
                      ))}
                    </div>
                  ) : feedbacks.length === 0 ? (
                    <Card className="transition-all duration-300 border-border bg-card/40 backdrop-blur-md hover:border-indigo-500/50 text-center py-16">
                      <CardContent className="space-y-3">
                        <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-foreground font-semibold">No feedback reviews submitted yet</p>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                          Reviews will populate here once candidates submit quiz ratings or log suggestions via the navigation feedback forms.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      {feedbacks.map((f) => {
                        const isQuizFeedback = f.attempt !== null;

                        return (
                          <Card key={f.id} className="transition-all duration-300 border-border bg-card/40 backdrop-blur-md shadow-xl hover:border-indigo-500/50 flex flex-col justify-between overflow-hidden">
                            <CardHeader className="pb-3.5 border-b border-border/40 bg-muted/10">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-0.5">
                                  <p className="font-extrabold text-foreground text-sm tracking-tight">{f.user.name}</p>
                                  <p className="text-sm text-muted-foreground font-medium">{f.user.email}</p>
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
                                      "text-xs py-0.5 px-2.5 font-extrabold uppercase tracking-wider",
                                      f.difficulty === "Hard" && "border-red-500/30 text-red-400 bg-red-950/20"
                                    )}
                                  >
                                    Diff: {f.difficulty}
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
                                      "text-xs py-0.5 px-2.5 font-extrabold uppercase tracking-widest",
                                      f.category === "Bug" && "border-red-500/30 text-red-450 bg-red-955/20"
                                    )}
                                  >
                                    {f.category === "Bug" ? "🐛 Bug" : f.category === "Suggestion" ? "💡 Suggestion" : "💬 General"}
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
                              <div className="space-y-3.5">
                                {isQuizFeedback ? (
                                  <div className="flex items-center justify-between text-sm text-muted-foreground border-b border-border/40 pb-2">
                                    <span className="font-bold text-foreground truncate max-w-[200px]">
                                      Quiz: {f.attempt!.quiz.title}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-extrabold text-indigo-400 uppercase tracking-wider">
                                      <Award className="h-3.5 w-3.5" /> {f.attempt!.percentage}% ({f.attempt!.score} pts)
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between text-sm border-b border-border/40 pb-2">
                                    <span className="font-extrabold text-indigo-450 uppercase tracking-widest text-xs">Platform Feedback Review</span>
                                  </div>
                                )}

                                {/* Stars Rating */}
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={cn(
                                        "h-4 w-4 transition-all duration-200",
                                        star <= f.rating
                                          ? "fill-amber-500 text-amber-500 scale-100"
                                          : "text-muted-foreground/50 fill-transparent scale-90"
                                      )}
                                    />
                                  ))}
                                </div>

                                {f.comments ? (
                                  <div className="rounded-lg bg-muted/30 border border-border/50 p-3.5 font-sans text-sm text-foreground/80 leading-relaxed italic whitespace-pre-wrap">
                                    "{f.comments}"
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">No textual comments provided.</p>
                                )}
                                {f.adminResponse && (
                                  <div className="rounded-lg bg-indigo-900/30 border border-indigo-500/20 p-3.5 font-sans text-sm text-indigo-200 leading-relaxed italic whitespace-pre-wrap">
                                    <strong>Admin Response:</strong> {f.adminResponse}
                                  </div>
                                )}
                                <div className="flex gap-2 mt-2">
                                  <Button size="sm" variant="outline" className="text-xs h-7 py-0 bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground" onClick={() => handleRespondFeedback(f.id)}>
                                    {f.adminResponse ? "Edit Response" : "Respond"}
                                  </Button>
                                  <Button size="sm" variant="destructive" className="text-xs h-7 py-0 bg-red-900/50 hover:bg-red-900 text-red-200" onClick={() => handleDeleteFeedback(f.id)}>
                                    Delete
                                  </Button>
                                </div>
                              </div>

                              <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-right">
                                Submitted: {new Date(f.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
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
