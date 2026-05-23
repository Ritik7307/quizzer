"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Play, Search } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { Quiz } from "@/types";

export default function CandidateDashboard() {
  const { token, user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;
    api<{ quizzes: Quiz[] }>("/api/quizzes", { token })
      .then((d) => setQuizzes(d.quizzes))
      .catch(() => toast.error("Failed to load quizzes"))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute role="CANDIDATE">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Welcome, {user?.name}</h1>
          <p className="mt-1 text-sm text-neutral-400 sm:text-base">Available quizzes for the upskilling series</p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            className="pl-10"
            placeholder="Search quizzes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">No quizzes found.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((quiz) => (
              <Card key={quiz.id} className="flex flex-col transition-shadow hover:shadow-md">
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
        )}
      </div>
    </ProtectedRoute>
  );
}
