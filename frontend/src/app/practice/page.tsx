"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { api, getApiErrorMessage } from "@/lib/api";
import {
  Trophy,
  Loader2,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronDown,
  BookOpen,
  Award,
  Zap,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CodingQuestion {
  id: string;
  title: string;
  difficulty: string;
  topic: string;
  referenceUrl?: string | null;
  solved: boolean;
  isExternalOnly?: boolean;
}

export default function PracticeSheetPage() {
  const { token, user, refresh: refreshUser } = useAuth();
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [markingIds, setMarkingIds] = useState<Record<string, boolean>>({});

  const handleMarkSolved = async (questionId: string) => {
    if (!token) return;
    setMarkingIds((prev) => ({ ...prev, [questionId]: true }));
    try {
      const res = await api<{
        success: boolean;
        pointsAwarded: number;
        currentStreak: number;
      }>(`/api/coding/questions/${questionId}/mark-solved`, {
        method: "POST",
        token,
      });

      if (res.success) {
        const pts = res.pointsAwarded;
        const streak = res.currentStreak;
        if (pts > 0) {
          toast.success(`Correct! Marked as solved. +${pts} points earned. Active Days: ${streak}`);
        } else {
          toast.success(`Correct! Marked as solved. Active Days: ${streak}`);
        }

        // Update local state to show as solved
        setQuestions((prev) =>
          prev.map((q) => (q.id === questionId ? { ...q, solved: true } : q))
        );

        // Refresh global user stats
        await refreshUser();
      }
    } catch (err) {
      toast.error("Failed to mark question as solved: " + getApiErrorMessage(err));
    } finally {
      setMarkingIds((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  useEffect(() => {
    if (!token) return;
    api<{ questions: CodingQuestion[] }>("/api/coding/questions", { token })
      .then((res) => {
        setQuestions(res.questions);
        // Expand first 2 topics by default
        const grouped = groupQuestions(res.questions);
        const topics = Object.keys(grouped);
        const initialExpanded: Record<string, boolean> = {};
        topics.forEach((t, index) => {
          initialExpanded[t] = index < 2;
        });
        setExpandedTopics(initialExpanded);
      })
      .catch((err) => {
        toast.error("Failed to load questions: " + getApiErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Group questions by topic
  const groupQuestions = (items: CodingQuestion[]) => {
    return items.reduce((acc, q) => {
      const topic = q.topic || "General";
      if (!acc[topic]) acc[topic] = [];
      acc[topic].push(q);
      return acc;
    }, {} as Record<string, CodingQuestion[]>);
  };

  const groupedQuestions = groupQuestions(questions);
  const topics = Object.keys(groupedQuestions).sort();

  // Stats calculation
  const totalCount = questions.length;
  const solvedCount = questions.filter((q) => q.solved).length;
  const percentageSolved = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topic]: !prev[topic],
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-neutral-400">Loading Coding Sheet...</p>
        </div>
      </div>
    );
  }

  // Get user level rank styling
  const getRankDetails = () => {
    if (percentageSolved === 100) return { title: "Grandmaster", desc: "You have conquered all problems!", color: "text-red-400 bg-red-950/20 border-red-500/30" };
    if (percentageSolved >= 75) return { title: "Expert Solver", desc: "Almost finished! Keep pushing.", color: "text-amber-400 bg-amber-950/20 border-amber-500/30" };
    if (percentageSolved >= 40) return { title: "Specialist", desc: "Good logical grasp. Keep practicing.", color: "text-violet-400 bg-violet-950/20 border-violet-500/30" };
    if (percentageSolved >= 10) return { title: "Apprentice", desc: "Making solid progress on fundamental tracks.", color: "text-blue-400 bg-blue-950/20 border-blue-500/30" };
    return { title: "Newbie", desc: "Welcome to the sheets! Begin your journey.", color: "text-emerald-455 bg-emerald-950/10 border-emerald-500/20" };
  };

  const rank = getRankDetails();

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 space-y-8">
        
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-r from-violet-900/10 via-purple-900/5 to-transparent p-6 sm:p-8">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-40 w-40 rounded-full bg-violet-650/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2.5">
                <Sparkles className="h-7 w-7 text-violet-450 animate-pulse" /> Coding Practice Sheet
              </h1>
              <p className="text-neutral-400 text-sm max-w-2xl leading-relaxed">
                Curated programming lists to master data structures, algorithms, and technical interview patterns. Grouped by data structure tracks to optimize learning.
              </p>
            </div>
            <Badge className="w-fit border-violet-500/30 text-violet-400 bg-violet-950/30 px-3 py-1 font-bold text-xs uppercase tracking-widest shrink-0">
              SDE Sheet Active
            </Badge>
          </div>
        </div>

        {/* Stats Dashboard Row */}
        <div className="grid gap-6 sm:grid-cols-4">
          {/* Progress Card */}
          <Card className="border-neutral-800 bg-neutral-950/60 backdrop-blur-md shadow-2xl sm:col-span-2 hover:border-neutral-750 transition-colors duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-violet-450" />
                Sheet Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white tracking-tight">{solvedCount}</span>
                  <span className="text-xs text-neutral-500 font-medium">/ {totalCount} Problems Solved</span>
                </div>
                <span className="text-xs font-bold text-violet-400 bg-violet-950/50 px-2.5 py-1 rounded-lg border border-violet-900/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]">
                  {percentageSolved}% Complete
                </span>
              </div>
              <div className="w-full h-3.5 bg-neutral-900 rounded-full border border-neutral-850 overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 via-purple-550 to-fuchsia-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                  style={{ width: `${percentageSolved}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Achievement Card */}
          <Card className="border-neutral-800 bg-neutral-950/60 backdrop-blur-md shadow-2xl flex flex-col justify-between hover:border-neutral-750 transition-colors duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                User Ranking Title
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4 py-2 mt-auto">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-xs text-neutral-200 tracking-tight">
                  {rank.title}
                </p>
                <p className="text-[9px] text-neutral-500 leading-normal">
                  {rank.desc}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Gamification Stats Card */}
          <Card className="border-neutral-800 bg-neutral-950/60 backdrop-blur-md shadow-2xl hover:border-neutral-750 transition-colors duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                Coding Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 py-1.5 mt-auto">
              {/* Active Days */}
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/15 bg-emerald-950/10 px-2.5 py-1.5 shadow-[0_0_10px_rgba(16,185,129,0.04)]">
                <svg
                  className="h-4 w-4 text-emerald-400 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14l2 2 4-4" />
                </svg>
                <div>
                  <p className="text-xs font-extrabold text-emerald-400 leading-none">{user?.streak ?? 0}</p>
                  <p className="text-[8px] font-extrabold text-emerald-550 uppercase tracking-widest mt-1 leading-none">Active Days</p>
                </div>
              </div>

              {/* Points */}
              <div className="flex items-center gap-2.5 rounded-lg border border-violet-500/15 bg-violet-950/10 px-2.5 py-1.5 shadow-[0_0_10px_rgba(139,92,246,0.04)]">
                <Sparkles className="h-4 w-4 text-violet-400 shrink-0 animate-pulse" />
                <div>
                  <p className="text-xs font-extrabold text-violet-400 leading-none">{user?.points ?? 0}</p>
                  <p className="text-[8px] font-extrabold text-violet-500 uppercase tracking-widest mt-1 leading-none">Total Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topics Accordion Feed */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-neutral-400" /> Dynamic Topics Tracker
          </h2>
          
          {topics.length === 0 ? (
            <Card className="border-neutral-800 bg-neutral-950/40 text-center py-16">
              <CardContent className="space-y-3">
                <Award className="h-10 w-10 text-neutral-750 mx-auto" />
                <p className="text-neutral-400 font-semibold">No sheet questions configured</p>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                  Coding sheet sections will render dynamically once admins upload questions tagged with topics in the admin console.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {topics.map((topicName) => {
                const topicQuestions = groupedQuestions[topicName];
                const solvedInTopic = topicQuestions.filter((q) => q.solved).length;
                const totalInTopic = topicQuestions.length;
                const isExpanded = !!expandedTopics[topicName];
                const isAllSolved = solvedInTopic === totalInTopic;

                return (
                  <Card
                    key={topicName}
                    className={cn(
                      "border-neutral-800/80 bg-neutral-950/40 backdrop-blur-sm transition-all duration-300 overflow-hidden shadow-md",
                      isExpanded && "border-neutral-700 bg-neutral-950/50 shadow-lg"
                    )}
                  >
                    {/* Topic Accordion Header */}
                    <div
                      onClick={() => toggleTopic(topicName)}
                      className={cn(
                        "p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-900/30 select-none transition-colors border-b border-transparent",
                        isExpanded && "border-neutral-900 bg-neutral-900/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-neutral-200 tracking-tight">{topicName}</span>
                        <Badge
                          variant={isAllSolved ? "success" : "outline"}
                          className={cn(
                            "text-[9px] py-0.5 px-2 font-bold uppercase",
                            isAllSolved
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                              : "border-neutral-850 text-neutral-450"
                          )}
                        >
                          {solvedInTopic} / {totalInTopic} Solved
                        </Badge>
                      </div>
                      <div className="text-neutral-500 hover:text-neutral-300 transition-colors">
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-250", isExpanded && "rotate-180")} />
                      </div>
                    </div>

                    {/* Topic Questions List */}
                    {isExpanded && (
                      <div className="border-t border-neutral-900/50 bg-neutral-950/10 divide-y divide-neutral-900/50">
                        {topicQuestions.map((q) => (
                          <div
                            key={q.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-900/20 transition-colors duration-200"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Solved Status Checkbox Icon */}
                              {q.solved ? (
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)] animate-fade-in">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-neutral-700 hover:text-neutral-500 border border-neutral-850 hover:border-neutral-700 transition-colors duration-150">
                                  <Circle className="h-3 w-3" />
                                </div>
                              )}

                              {/* Question Title */}
                              {/* Question Title */}
                              {q.isExternalOnly && q.referenceUrl ? (
                                <a
                                  href={q.referenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-neutral-300 hover:text-violet-400 transition-colors truncate leading-none flex items-center gap-1"
                                >
                                  {q.title} <span className="text-[9px] text-neutral-500 font-normal uppercase tracking-wider bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-850">External</span>
                                </a>
                              ) : (
                                <Link
                                  href={`/coding/${q.id}`}
                                  className="text-xs font-semibold text-neutral-300 hover:text-violet-400 transition-colors truncate leading-none"
                                >
                                  {q.title}
                                </Link>
                              )}

                              {/* External Reference Link */}
                              {q.referenceUrl && !q.isExternalOnly && (
                                <a
                                  href={q.referenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View on original LeetCode / Codeforces page"
                                  className="text-neutral-550 hover:text-neutral-350 transition-colors p-0.5 shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-4 justify-between sm:justify-end">
                              {/* Difficulty Badge */}
                              <Badge
                                variant={
                                  q.difficulty === "Easy"
                                    ? "success"
                                    : q.difficulty === "Medium"
                                    ? "warning"
                                    : "outline"
                                }
                                className={cn(
                                  "text-[10px] font-bold px-2.5 py-0.5 shrink-0 tracking-wider",
                                  q.difficulty === "Hard" && "border-red-500/30 text-red-300 bg-red-950/20"
                                )}
                              >
                                {q.difficulty}
                              </Badge>

                              {/* Action Button */}
                              {q.isExternalOnly ? (
                                <div className="flex items-center gap-2">
                                  {q.referenceUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      asChild
                                      className="h-8 text-[10px] shrink-0 font-extrabold transition-all duration-150 uppercase tracking-wider border-neutral-800 text-neutral-350 bg-black/40 hover:bg-neutral-800 hover:text-white"
                                    >
                                      <a href={q.referenceUrl} target="_blank" rel="noopener noreferrer">
                                        Solve Link
                                      </a>
                                    </Button>
                                  )}

                                  {q.solved ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled
                                      className="h-8 text-[10px] shrink-0 font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/10 border border-emerald-900/20"
                                    >
                                      Solved
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleMarkSolved(q.id)}
                                      disabled={markingIds[q.id]}
                                      className="h-8 text-[10px] shrink-0 font-extrabold transition-all duration-150 uppercase tracking-wider bg-violet-600 hover:bg-violet-750 text-white"
                                    >
                                      {markingIds[q.id] ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        "Mark Solved"
                                      )}
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant={q.solved ? "ghost" : "outline"}
                                  asChild
                                  className={cn(
                                    "h-8 text-[10px] shrink-0 font-extrabold transition-all duration-150 uppercase tracking-wider",
                                    q.solved
                                      ? "text-neutral-500 hover:text-violet-400 hover:bg-violet-955/15"
                                      : "border-neutral-800 text-neutral-350 bg-black/40 hover:bg-neutral-800 hover:text-white"
                                  )}
                                >
                                  <Link href={`/coding/${q.id}`}>
                                    {q.solved ? "Solve Again" : "Solve Problem"}
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
