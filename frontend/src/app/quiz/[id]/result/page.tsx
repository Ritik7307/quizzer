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
  } | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    api<{ attempt: typeof data extends null ? never : NonNullable<typeof data>["attempt"] }>(
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

              <div className="flex flex-wrap gap-3 justify-center">
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
      </div>
    </ProtectedRoute>
  );
}
