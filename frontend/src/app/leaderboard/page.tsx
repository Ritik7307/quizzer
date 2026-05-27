"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Search, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, API_ORIGIN } from "@/lib/api";
import type { LeaderboardEntry } from "@/types";

interface QuizOption {
  id: string;
  title: string;
  description: string;
}

export default function LeaderboardPage() {
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");

  const loadLeaderboard = useCallback(async (quizId: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (minScore) params.set("minScore", minScore);
    const data = await api<{
      quiz: { title: string } | null;
      leaderboard: LeaderboardEntry[];
    }>(`/api/leaderboard/${quizId}?${params}`);
    setQuizTitle(data.quiz?.title ?? "");
    setEntries(data.leaderboard);
  }, [search, minScore]);

  useEffect(() => {
    api<{ quizzes: QuizOption[] }>("/api/leaderboard")
      .then((d) => {
        setQuizzes(d.quizzes);
        if (d.quizzes[0]) setSelectedQuiz(d.quizzes[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedQuiz) return;
    loadLeaderboard(selectedQuiz).catch(() => {});
  }, [selectedQuiz, loadLeaderboard]);

  useEffect(() => {
    if (!selectedQuiz) return;
    const socket = io(API_ORIGIN, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
    socket.emit("leaderboard:join", selectedQuiz);
    socket.on("leaderboard:update", () => {
      loadLeaderboard(selectedQuiz);
    });
    return () => {
      socket.emit("leaderboard:leave", selectedQuiz);
      socket.disconnect();
    };
  }, [selectedQuiz, loadLeaderboard]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in">
      <div className="mb-6 text-center sm:mb-8">
        <Trophy className="mx-auto mb-2 h-10 w-10 text-amber-500 sm:h-12 sm:w-12" />
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Public Leaderboard</h1>
        <p className="text-sm text-neutral-400 sm:text-base">Live rankings — updates in real time</p>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2 sm:mb-6">
            {quizzes.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedQuiz(q.id)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                  selectedQuiz === q.id
                    ? "bg-indigo-600 text-white"
                    : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                }`}
              >
                {q.title}
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                className="pl-10"
                placeholder="Filter by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Input
              type="number"
              placeholder="Min score filter"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{quizTitle || "Select a quiz"}</CardTitle>
              <CardDescription>{entries.length} ranked submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="py-8 text-center text-neutral-500">No submissions yet.</p>
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-neutral-800 text-left text-neutral-500">
                        <th className="py-3 pr-3">Rank</th>
                        <th className="py-3 pr-3">Name</th>
                        <th className="py-3 pr-3">Score</th>
                        <th className="py-3 pr-3">%</th>
                        <th className="py-3">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e, i) => (
                        <tr
                          key={e.id}
                          className="border-b border-neutral-800 transition-colors hover:bg-neutral-800/50"
                        >
                          <td className="py-3 pr-3">
                            {e.rank === 1 ? (
                              <Badge className="bg-amber-100 text-amber-800">🥇 #{e.rank}</Badge>
                            ) : e.rank === 2 ? (
                              <Badge className="bg-neutral-200 text-neutral-700">🥈 #{e.rank}</Badge>
                            ) : e.rank === 3 ? (
                              <Badge className="bg-orange-100 text-orange-800">🥉 #{e.rank}</Badge>
                            ) : (
                              <span className="font-medium">#{e.rank ?? i + 1}</span>
                            )}
                          </td>
                          <td className="py-3 pr-3 font-medium text-white">{e.name}</td>
                          <td className="py-3 pr-3">{e.score}</td>
                          <td className="py-3 pr-3 font-semibold text-indigo-400">{e.percentage}%</td>
                          <td className="py-3 text-neutral-500">
                            {new Date(e.submittedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
