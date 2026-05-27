"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Question, Quiz } from "@/types";

interface Analytics {
  analytics: {
    totalParticipants: number;
    completedCount: number;
    completionRate: number;
    averageScore: number;
    highestScore: number;
    questionCount: number;
  };
  participants: Array<{
    attemptId: string;
    userId: string;
    name: string;
    email: string;
    status: string;
    score: number;
    percentage: number;
    rank: number | null;
  }>;
}

export default function AdminQuizManagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [quiz, setQuiz] = useState<Quiz & { questions: Question[] } | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const [qForm, setQForm] = useState({
    text: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
  });

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [quizRes, analyticsRes] = await Promise.all([
        api<{ quiz: Quiz & { questions: Question[] } }>(`/api/quizzes/${id}`, { token }),
        api<Analytics>(`/api/admin/quizzes/${id}/analytics`, { token }),
      ]);
      setQuiz(quizRes.quiz);
      setAnalytics(analyticsRes);
    } catch {
      toast.error("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateQuiz(patch: Partial<Quiz>) {
    try {
      const { quiz: updated } = await api<{ quiz: Quiz }>(`/api/quizzes/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(patch),
      });
      setQuiz((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success("Quiz updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/quizzes/${id}/questions`, {
        method: "POST",
        token,
        body: JSON.stringify(qForm),
      });
      toast.success("Question added");
      setQForm({ text: "", options: ["", "", "", ""], correctOptionIndex: 0 });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add question");
    }
  }

  async function deleteQuestion(questionId: string) {
    if (!confirm("Delete this question?")) return;
    await api(`/api/quizzes/${id}/questions/${questionId}`, { method: "DELETE", token });
    toast.success("Question deleted");
    load();
  }

  async function deleteQuiz() {
    if (!confirm("Are you sure you want to permanently delete this quiz? All attempts and questions will be lost.")) return;
    try {
      await api(`/api/quizzes/${id}`, { method: "DELETE", token });
      toast.success("Quiz deleted");
      router.push("/admin");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete quiz");
    }
  }

  async function deleteParticipant(attemptId: string, name: string) {
    if (!confirm(`Remove ${name} from the leaderboard? They can take the quiz again.`)) return;
    try {
      await api(`/api/admin/quizzes/${id}/attempts/${attemptId}`, { method: "DELETE", token });
      toast.success(`Removed ${name} from leaderboard`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  async function clearLeaderboard() {
    if (
      !confirm(
        "Clear the entire leaderboard for this quiz? All participant scores and attempts will be permanently deleted."
      )
    ) {
      return;
    }
    try {
      const res = await api<{ deletedCount: number; message: string }>(
        `/api/admin/quizzes/${id}/leaderboard`,
        { method: "DELETE", token }
      );
      toast.success(res.message);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to clear leaderboard");
    }
  }

  if (loading) {
    return (
      <ProtectedRoute role="ADMIN">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-60 w-full" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!quiz) return null;

  return (
    <ProtectedRoute role="ADMIN">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <Badge className="mt-2" variant={quiz.published ? "success" : "warning"}>
              {quiz.published ? "Published" : "Draft"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => updateQuiz({ published: !quiz.published })}
            >
              {quiz.published ? "Unpublish" : "Publish"}
            </Button>
            <Button
              variant="destructive"
              onClick={deleteQuiz}
            >
              Delete
            </Button>
          </div>
        </div>

        {analytics && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Participants", analytics.analytics.totalParticipants],
              ["Avg Score", analytics.analytics.averageScore],
              ["Highest", analytics.analytics.highestScore],
              ["Completion %", analytics.analytics.completionRate],
            ].map(([label, val]) => (
              <Card key={String(label)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{val}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Schedule & Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input
                type="datetime-local"
                defaultValue={quiz.startTime ? quiz.startTime.slice(0, 16) : ""}
                onBlur={(e) =>
                  updateQuiz({ startTime: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End time</Label>
              <Input
                type="datetime-local"
                defaultValue={quiz.endTime ? quiz.endTime.slice(0, 16) : ""}
                onBlur={(e) =>
                  updateQuiz({ endTime: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
              />
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                defaultValue={quiz.description || ""}
                onBlur={(e) => updateQuiz({ description: e.target.value })}
                placeholder="Brief description of the quiz"
              />
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label>Instructions</Label>
              <Textarea
                defaultValue={quiz.instructions || ""}
                onBlur={(e) => updateQuiz({ instructions: e.target.value })}
                placeholder="Instructions for participants"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions ({quiz.questions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quiz.questions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex justify-between gap-2">
                  <p className="font-medium">
                    {idx + 1}. {q.text}
                  </p>
                  <Button variant="destructive" size="sm" onClick={() => deleteQuestion(q.id)}>
                    Delete
                  </Button>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {q.options.map((opt, i) => (
                    <li key={i} className={i === q.correctOptionIndex ? "font-semibold text-emerald-600" : ""}>
                      {String.fromCharCode(65 + i)}. {opt}
                      {i === q.correctOptionIndex && " ✓"}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <form onSubmit={addQuestion} className="mt-6 space-y-4 rounded-lg border border-dashed border-neutral-700 p-4">
              <h3 className="font-semibold">Add Question</h3>
              <Textarea
                placeholder="Question text"
                value={qForm.text}
                onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
                required
              />
              {qForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={qForm.correctOptionIndex === i}
                    onChange={() => setQForm({ ...qForm, correctOptionIndex: i })}
                  />
                  <Input
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    value={opt}
                    onChange={(e) => {
                      const options = [...qForm.options];
                      options[i] = e.target.value;
                      setQForm({ ...qForm, options });
                    }}
                    required
                  />
                </div>
              ))}
              <Button type="submit">Add Question</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Leaderboard & Participants</CardTitle>
            {(analytics?.participants.length ?? 0) > 0 && (
              <Button variant="destructive" size="sm" onClick={clearLeaderboard} className="w-full sm:w-auto">
                <Trash2 className="h-4 w-4" />
                Clear all
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {analytics?.participants.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No participant data yet.</p>
            ) : (
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Rank</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.participants.map((p) => (
                      <tr key={p.attemptId} className="border-b border-slate-200">
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2 text-slate-500">{p.email}</td>
                        <td>{p.status}</td>
                        <td>{p.status === "completed" ? `${p.percentage}%` : "—"}</td>
                        <td>{p.rank ?? "—"}</td>
                        <td className="py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:bg-red-950/30 hover:text-red-300"
                            onClick={() => deleteParticipant(p.attemptId, p.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Deleting a participant removes their attempt so they can retake the quiz. Clear all resets the
              entire leaderboard for this quiz.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
