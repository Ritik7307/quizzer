"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, FileDown, Plus, Users, Bell } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, exportCsvUrl } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { Quiz } from "@/types";

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

export default function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <ProtectedRoute role="ADMIN">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Admin Dashboard</h1>
            <p className="text-sm text-neutral-400 sm:text-base">Manage quizzes, participants, and analytics</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row w-full sm:w-auto">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/admin/notifications">
                <Bell className="mr-2 h-4 w-4" /> Send Notification
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/admin/quizzes/new">
                <Plus className="mr-2 h-4 w-4" /> New Quiz
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Total Quizzes", value: data?.stats.quizCount, icon: BarChart3 },
                { label: "Submissions", value: data?.stats.attemptCount, icon: Users },
                { label: "Candidates", value: data?.stats.userCount, icon: Users },
              ].map((s) => (
                <Card key={s.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-500">{s.label}</CardTitle>
                    <s.icon className="h-4 w-4 text-violet-600" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Your Quizzes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quizzes.map((q) => (
                    <div
                      key={q.id}
                      className="flex flex-col gap-3 rounded-lg border border-neutral-800 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{q.title}</p>
                        <p className="text-xs text-neutral-500">
                          {q._count?.questions ?? 0} questions · {q.duration} min
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={q.published ? "success" : "warning"}>
                          {q.published ? "Published" : "Draft"}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/quizzes/${q.id}`}>Manage</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
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

              <Card>
                <CardHeader>
                  <CardTitle>Recent Submissions</CardTitle>
                  <CardDescription>Latest candidate attempts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data?.recentAttempts.length === 0 && (
                    <p className="text-sm text-neutral-500">No submissions yet.</p>
                  )}
                  {data?.recentAttempts.map((a) => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{a.user.name}</p>
                        <p className="text-neutral-500">{a.quiz.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-violet-600">{a.percentage}%</p>
                        <p className="text-xs text-neutral-500">{a.score} pts</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
