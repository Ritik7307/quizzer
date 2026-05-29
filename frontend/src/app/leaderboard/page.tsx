"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import { Search, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, API_ORIGIN } from "@/lib/api";
import type { LeaderboardEntry } from "@/types";
import { useAuth } from "@/contexts/auth-context";

interface QuizOption {
  id: string;
  title: string;
  description: string;
}

import { ProtectedRoute } from "@/components/auth/protected-route";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function LeaderboardPage() {
  const { token, user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [friendsOnly, setFriendsOnly] = useState(false);

  const loadLeaderboard = useCallback(async (quizId: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (minScore) params.set("minScore", minScore);
    if (friendsOnly) params.set("friendsOnly", "true");
    const data = await api<{
      quiz: { title: string } | null;
      leaderboard: LeaderboardEntry[];
    }>(`/api/leaderboard/${quizId}?${params}`, { token });
    setQuizTitle(data.quiz?.title ?? "");
    setEntries(data.leaderboard);
  }, [search, minScore, friendsOnly, token]);

  useEffect(() => {
    api<{ quizzes: QuizOption[] }>("/api/leaderboard", { token })
      .then((d) => {
        setQuizzes(d.quizzes);
        if (d.quizzes[0]) setSelectedQuiz(d.quizzes[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

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

  const top1 = entries.find((e) => e.rank === 1);
  const top2 = entries.find((e) => e.rank === 2);
  const top3 = entries.find((e) => e.rank === 3);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 animate-fade-in text-foreground">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-full mb-4 shadow-inner">
            <Trophy className="h-12 w-12 text-indigo-600 dark:text-indigo-400 drop-shadow-md animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl mb-2 bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">Global Rankings</h1>
          <p className="text-base font-medium text-muted-foreground sm:text-lg">Compete with friends, climb the ranks, and prove your skills in real-time.</p>
        </div>

        {loading ? (
          <Skeleton className="h-[600px] w-full rounded-3xl" />
        ) : (
          <div className="space-y-10">
            {/* Controls Section */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl shadow-black/5">
              
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {quizzes.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedQuiz(q.id)}
                    className={`rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide transition-all duration-300 ${
                      selectedQuiz === q.id
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-105"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50 hover:scale-105"
                    }`}
                  >
                    {q.title}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative group flex-1 md:flex-none">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                  <Input
                    className="pl-10 h-11 border-border/50 bg-background/50 backdrop-blur-sm text-foreground rounded-xl focus-visible:ring-indigo-500 transition-shadow"
                    placeholder="Search challengers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Input
                  type="number"
                  className="h-11 w-24 sm:w-32 border-border/50 bg-background/50 backdrop-blur-sm text-foreground rounded-xl focus-visible:ring-indigo-500 transition-shadow"
                  placeholder="Min Pts"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                />
                {user && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/50 h-11 px-4 shadow-sm hover:border-indigo-500/50 transition-colors">
                    <input
                      id="friendsOnly"
                      type="checkbox"
                      checked={friendsOnly}
                      onChange={(e) => setFriendsOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-border/50 text-indigo-600 bg-background cursor-pointer focus:ring-indigo-500 focus:ring-2"
                    />
                    <label htmlFor="friendsOnly" className="text-sm font-bold text-foreground cursor-pointer select-none">
                      Friends
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Podium (Only when unfiltered) */}
            {entries.length > 0 && !search && !minScore && !friendsOnly && (
              <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto items-end pt-12 pb-16 select-none relative">
                
                {/* 2nd Place */}
                <div className="flex flex-col items-center group z-10 transition-transform hover:-translate-y-2 duration-300">
                  {top2 ? (
                    <>
                      <div className="relative mb-3 flex flex-col items-center">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-slate-300 dark:border-slate-500 shadow-xl shadow-slate-400/20 mb-[-16px] z-10 bg-card">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${top2.name}`} />
                          <AvatarFallback className="bg-slate-200 text-slate-700 font-bold">2</AvatarFallback>
                        </Avatar>
                        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full border-2 border-background flex items-center justify-center text-sm shadow-sm z-20">🥈</div>
                      </div>
                      <div className="text-center mb-4 px-1 w-full">
                        <Link href={`/u/${top2.userId}`} className="hover:opacity-80 transition-opacity">
                          <p className="text-sm sm:text-base font-black text-foreground truncate drop-shadow-sm">{top2.name}</p>
                        </Link>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>{top2.score} pts</span>
                        </div>
                      </div>
                      <div className="w-full bg-gradient-to-t from-slate-200/40 to-slate-200/80 dark:from-slate-800/40 dark:to-slate-700/60 border-t-2 border-x-2 border-slate-300 dark:border-slate-600/50 h-32 sm:h-40 rounded-t-3xl flex items-center justify-center shadow-inner relative overflow-hidden backdrop-blur-md">
                        <div className="absolute inset-0 bg-white/20 dark:bg-black/10 mix-blend-overlay"></div>
                        <span className="font-black text-slate-400/30 dark:text-slate-500/20 text-7xl sm:text-8xl select-none z-10">2</span>
                      </div>
                    </>
                  ) : (
                    <div className="h-32 sm:h-40 w-full bg-muted/20 border-t-2 border-dashed border-border/50 rounded-t-3xl backdrop-blur-sm" />
                  )}
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center group z-20 transition-transform hover:-translate-y-4 duration-300">
                  {top1 ? (
                    <>
                      <div className="relative mb-3 flex flex-col items-center">
                        <div className="absolute -inset-4 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-xl animate-pulse"></div>
                        <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-amber-400 shadow-2xl shadow-amber-500/30 mb-[-20px] z-10 bg-card">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${top1.name}`} />
                          <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">1</AvatarFallback>
                        </Avatar>
                        <div className="h-10 w-10 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full border-[3px] border-background flex items-center justify-center text-lg shadow-md z-20 text-white font-black">🥇</div>
                      </div>
                      <div className="text-center mb-4 px-1 w-full relative z-10">
                        <Link href={`/u/${top1.userId}`} className="hover:opacity-80 transition-opacity">
                          <p className="text-base sm:text-lg font-black text-foreground truncate drop-shadow-sm">{top1.name}</p>
                        </Link>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 shadow-sm">
                          <span>{top1.score} pts</span>
                        </div>
                      </div>
                      <div className="w-full bg-gradient-to-t from-amber-400/20 to-amber-400/40 dark:from-amber-600/20 dark:to-amber-500/30 border-t-[3px] border-x-[3px] border-amber-400 dark:border-amber-500/60 h-44 sm:h-56 rounded-t-3xl flex items-center justify-center shadow-[0_-8px_30px_rgba(245,158,11,0.15)] relative overflow-hidden backdrop-blur-md">
                        <div className="absolute inset-0 bg-white/30 dark:bg-black/20 mix-blend-overlay"></div>
                        <span className="font-black text-amber-500/25 dark:text-amber-400/15 text-8xl sm:text-9xl select-none z-10 drop-shadow-sm">1</span>
                      </div>
                    </>
                  ) : (
                    <div className="h-44 sm:h-56 w-full bg-muted/20 border-t-2 border-dashed border-border/50 rounded-t-3xl backdrop-blur-sm" />
                  )}
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center group z-10 transition-transform hover:-translate-y-2 duration-300">
                  {top3 ? (
                    <>
                      <div className="relative mb-3 flex flex-col items-center">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-4 border-orange-300 dark:border-orange-700 shadow-lg shadow-orange-400/10 mb-[-14px] z-10 bg-card">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${top3.name}`} />
                          <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">3</AvatarFallback>
                        </Avatar>
                        <div className="h-7 w-7 bg-orange-200 dark:bg-orange-800 rounded-full border-2 border-background flex items-center justify-center text-xs shadow-sm z-20">🥉</div>
                      </div>
                      <div className="text-center mb-4 px-1 w-full">
                        <Link href={`/u/${top3.userId}`} className="hover:opacity-80 transition-opacity">
                          <p className="text-sm font-black text-foreground truncate drop-shadow-sm">{top3.name}</p>
                        </Link>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/60 text-[10px] sm:text-xs font-bold text-orange-700 dark:text-orange-400">
                          <span>{top3.score} pts</span>
                        </div>
                      </div>
                      <div className="w-full bg-gradient-to-t from-orange-200/30 to-orange-200/60 dark:from-orange-900/20 dark:to-orange-800/40 border-t-2 border-x-2 border-orange-300 dark:border-orange-700/60 h-24 sm:h-32 rounded-t-3xl flex items-center justify-center shadow-inner relative overflow-hidden backdrop-blur-md">
                        <div className="absolute inset-0 bg-white/20 dark:bg-black/10 mix-blend-overlay"></div>
                        <span className="font-black text-orange-400/30 dark:text-orange-500/20 text-6xl sm:text-7xl select-none z-10">3</span>
                      </div>
                    </>
                  ) : (
                    <div className="h-24 sm:h-32 w-full bg-muted/20 border-t-2 border-dashed border-border/50 rounded-t-3xl backdrop-blur-sm" />
                  )}
                </div>

              </div>
            )}

            {/* Submissions List Card */}
            <Card className="border border-border/50 bg-card/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl shadow-black/5">
              <CardHeader className="pb-4 border-b border-border/50 bg-muted/20 px-6 sm:px-8 pt-8">
                <CardTitle className="text-2xl font-black text-foreground">{quizTitle || "Select a quiz"}</CardTitle>
                <CardDescription className="text-sm font-semibold text-muted-foreground mt-1.5 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {entries.length} ranked challengers
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {entries.length === 0 ? (
                  <div className="py-24 text-center">
                    <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-bold text-muted-foreground">No submissions found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead className="bg-muted/10">
                        <tr className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
                          <th className="py-5 px-6 sm:px-8 font-extrabold w-24">Rank</th>
                          <th className="py-5 px-4 font-extrabold">Challenger</th>
                          <th className="py-5 px-4 font-extrabold w-32">Score</th>
                          <th className="py-5 px-4 font-extrabold w-32">Accuracy</th>
                          <th className="py-5 px-6 sm:px-8 font-extrabold w-48 text-right">Time Logged</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {entries.map((e, i) => (
                          <tr
                            key={e.id}
                            className="group transition-all hover:bg-muted/30 dark:hover:bg-indigo-950/10 cursor-pointer"
                          >
                            <td className="py-4 px-6 sm:px-8">
                              {e.rank === 1 ? (
                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-black shadow-sm border border-amber-200 dark:border-amber-900/50">1</div>
                              ) : e.rank === 2 ? (
                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black shadow-sm border border-slate-200 dark:border-slate-700">2</div>
                              ) : e.rank === 3 ? (
                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-500 font-black shadow-sm border border-orange-200 dark:border-orange-900/40">3</div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-muted-foreground">{e.rank ?? i + 1}</div>
                              )}
                            </td>
                            <td className="py-4 px-4 font-black text-foreground text-base">
                              <Link href={`/u/${e.userId}`} className="flex items-center gap-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <Avatar className="h-8 w-8 border border-border/50 shadow-sm group-hover:scale-110 transition-transform">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${e.name}`} />
                                  <AvatarFallback className="bg-muted text-xs">{e.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                {e.name}
                              </Link>
                            </td>
                            <td className="py-4 px-4 font-black text-lg text-foreground">{e.score} <span className="text-xs font-bold text-muted-foreground ml-0.5 uppercase tracking-wider">pts</span></td>
                            <td className="py-4 px-4">
                              <Badge variant="outline" className="font-extrabold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 px-2.5 py-1 text-sm">{e.percentage}%</Badge>
                            </td>
                            <td className="py-4 px-6 sm:px-8 text-xs font-semibold text-muted-foreground text-right">
                              {new Date(e.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
