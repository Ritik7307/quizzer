"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Award, CheckCircle2, Trophy, XCircle } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

export default function QuizResultPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    attempt: {
      score: number;
      percentage: number;
      correctCount: number;
      wrongCount: number;
      totalQuestions: number;
      rank: number | null;
      quiz: { title: string };
    };
    breakdown: Array<{
      questionId: string;
      text: string;
      options: string[];
      selected: number | null;
      correct: number;
      isCorrect: boolean;
    }>;
  } | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    api<NonNullable<typeof data>>(
      `/api/attempts/my/${id}`,
      { token }
    )
      .then(setData)
      .finally(() => setLoading(false));
  }, [token, id]);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 animate-fade-in">
        {loading ? (
          <Skeleton className="h-80 w-full" />
        ) : data ? (
          <Card>
            <CardHeader className="text-center">
              <Trophy className="mx-auto mb-2 h-12 w-12 text-amber-500" />
              <CardTitle className="text-2xl">{data.attempt.quiz.title}</CardTitle>
              <p className="text-neutral-500">Performance Summary</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-violet-600">{data.attempt.percentage}%</p>
                <p className="mt-1 text-neutral-500">
                  Score: {data.attempt.score} / {data.attempt.totalQuestions}
                </p>
                {data.attempt.rank && (
                  <p className="mt-2 flex items-center justify-center gap-1 font-semibold text-amber-600">
                    <Award className="h-5 w-5" /> Rank #{data.attempt.rank}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-950/30 p-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold">{data.attempt.correctCount}</p>
                    <p className="text-sm text-neutral-500">Correct</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-red-950/30 p-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold">{data.attempt.wrongCount}</p>
                    <p className="text-sm text-neutral-500">Wrong</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-neutral-800">
                <Button asChild>
                  <Link href="/leaderboard">View Leaderboard</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p>No result found. Complete a quiz first.</p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {data?.breakdown && (
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-bold">Detailed Review</h2>
            {data.breakdown.map((q, idx) => (
              <Card key={q.questionId} className={q.isCorrect ? "border-emerald-900/50" : "border-red-900/50"}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {q.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-400">Question {idx + 1}</p>
                      <CardTitle className="text-lg mt-1">{q.text}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pl-14">
                  <div className="space-y-2">
                    {q.options.map((opt, i) => {
                      const isSelected = q.selected === i;
                      const isCorrect = q.correct === i;
                      let optionClass = "border-neutral-800 bg-neutral-900 text-neutral-300";
                      
                      if (isCorrect) {
                        optionClass = "border-emerald-500 bg-emerald-500/10 text-emerald-500 font-medium";
                      } else if (isSelected && !isCorrect) {
                        optionClass = "border-red-500 bg-red-500/10 text-red-500 font-medium";
                      }

                      return (
                        <div
                          key={i}
                          className={`rounded-md border p-3 text-sm ${optionClass}`}
                        >
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                  {q.selected === null && (
                    <p className="mt-3 text-sm text-amber-500">You did not answer this question.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
