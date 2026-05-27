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

  // Extract Podium Entries
  const top1 = entries.find((e) => e.rank === 1);
  const top2 = entries.find((e) => e.rank === 2);
  const top3 = entries.find((e) => e.rank === 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in text-foreground">
      <div className="mb-8 text-center">
        <Trophy className="mx-auto mb-2 h-10 w-10 text-amber-550 sm:h-12 sm:w-12 animate-pulse" />
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Public Leaderboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Live rankings — updates in real time</p>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <>
          {/* Quiz Selection Tabs */}
          <div className="mb-6 flex flex-wrap gap-2.5 justify-center">
            {quizzes.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedQuiz(q.id)}
                className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 shadow-sm ${
                  selectedQuiz === q.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/10"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                }`}
              >
                {q.title}
              </button>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10 border-border bg-card text-foreground"
                placeholder="Filter by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Input
              type="number"
              className="border-border bg-card text-foreground"
              placeholder="Min score filter"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
            />
          </div>

          {/* Visual Podium (only when search and filters are empty to keep integrity) */}
          {entries.length > 0 && !search && !minScore && (
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto items-end pt-6 pb-12 select-none">
              
              {/* 2nd Place (Left) */}
              <div className="flex flex-col items-center group">
                {top2 ? (
                  <>
                    <div className="relative mb-2.5 flex h-13 w-13 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 border border-border shadow-sm text-lg font-bold text-slate-800 dark:text-zinc-150">
                      🥈
                    </div>
                    <div className="text-center mb-1.5 px-1 w-full">
                      <p className="text-xs font-extrabold text-foreground truncate">{top2.name}</p>
                      <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{top2.score} pts ({top2.percentage}%)</p>
                    </div>
                    <div className="w-full bg-gradient-to-t from-muted/40 to-muted/80 border-t border-x border-border h-24 rounded-t-2xl flex items-center justify-center font-black text-muted-foreground/40 text-4xl shadow-inner">
                      2
                    </div>
                  </>
                ) : (
                  <div className="h-24 w-full bg-muted/10 border-t border-dashed border-border rounded-t-2xl" />
                )}
              </div>

              {/* 1st Place (Center) */}
              <div className="flex flex-col items-center group -translate-y-2">
                {top1 ? (
                  <>
                    <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] text-2xl font-bold animate-bounce">
                      🥇
                    </div>
                    <div className="text-center mb-1.5 px-1 w-full">
                      <p className="text-sm font-black text-foreground truncate">{top1.name}</p>
                      <p className="text-xs font-black text-amber-550 mt-0.5">{top1.score} pts ({top1.percentage}%)</p>
                    </div>
                    <div className="w-full bg-gradient-to-t from-amber-500/5 to-amber-500/15 dark:from-amber-950/20 dark:to-amber-500/10 border-t-2 border-x-2 border-amber-400/40 dark:border-amber-500/35 h-32 rounded-t-2xl flex items-center justify-center font-black text-amber-500/50 text-6xl shadow-[0_-4px_25px_rgba(245,158,11,0.04)]">
                      1
                    </div>
                  </>
                ) : (
                  <div className="h-32 w-full bg-muted/10 border-t border-dashed border-border rounded-t-2xl" />
                )}
              </div>

              {/* 3rd Place (Right) */}
              <div className="flex flex-col items-center group">
                {top3 ? (
                  <>
                    <div className="relative mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/20 border border-orange-300 dark:border-orange-900/60 shadow-sm text-base font-bold text-orange-700">
                      🥉
                    </div>
                    <div className="text-center mb-1.5 px-1 w-full">
                      <p className="text-xs font-extrabold text-foreground truncate">{top3.name}</p>
                      <p className="text-[10px] font-extrabold text-orange-655 mt-0.5">{top3.score} pts ({top3.percentage}%)</p>
                    </div>
                    <div className="w-full bg-gradient-to-t from-muted/40 to-muted/80 border-t border-x border-border h-18 rounded-t-2xl flex items-center justify-center font-black text-muted-foreground/30 text-3xl shadow-inner">
                      3
                    </div>
                  </>
                ) : (
                  <div className="h-18 w-full bg-muted/10 border-t border-dashed border-border rounded-t-2xl" />
                )}
              </div>

            </div>
          )}

          {/* Leaderboard Table Card */}
          <Card className="border-border bg-card/45 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-muted/10">
              <CardTitle className="text-lg font-bold text-foreground">{quizTitle || "Select a quiz"}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">{entries.length} ranked submissions</CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              {entries.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">No submissions yet.</p>
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3.5 pr-3">Rank</th>
                        <th className="py-3.5 pr-3">Name</th>
                        <th className="py-3.5 pr-3">Score</th>
                        <th className="py-3.5 pr-3">%</th>
                        <th className="py-3.5">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {entries.map((e, i) => (
                        <tr
                          key={e.id}
                          className="transition-colors hover:bg-muted/15 dark:hover:bg-zinc-800/10"
                        >
                          <td className="py-3.5 pr-3">
                            {e.rank === 1 ? (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20 font-bold">🥇 #{e.rank}</Badge>
                            ) : e.rank === 2 ? (
                              <Badge className="bg-slate-500/10 text-slate-655 dark:text-zinc-300 border border-border font-bold">🥈 #{e.rank}</Badge>
                            ) : e.rank === 3 ? (
                              <Badge className="bg-orange-500/10 text-orange-655 dark:text-orange-400 border border-orange-500/20 font-bold">🥉 #{e.rank}</Badge>
                            ) : (
                              <span className="font-bold pl-2.5 text-muted-foreground">#{e.rank ?? i + 1}</span>
                            )}
                          </td>
                          <td className="py-3.5 pr-3 font-bold text-foreground">{e.name}</td>
                          <td className="py-3.5 pr-3 font-semibold">{e.score}</td>
                          <td className="py-3.5 pr-3 font-extrabold text-indigo-600 dark:text-indigo-400">{e.percentage}%</td>
                          <td className="py-3.5 text-xs text-muted-foreground font-semibold">
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
