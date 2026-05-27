"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Code2
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
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [markingIds, setMarkingIds] = useState<Record<string, boolean>>({});

  const [leetcodeInput, setLeetcodeInput] = useState("");
  const [codeforcesInput, setCodeforcesInput] = useState("");
  const [submittingHandles, setSubmittingHandles] = useState(false);

  const handleSaveHandles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!leetcodeInput.trim() || !codeforcesInput.trim()) {
      toast.error("Please enter both LeetCode and Codeforces handles");
      return;
    }
    setSubmittingHandles(true);
    try {
      await api<{ user: any }>("/api/auth/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          leetcodeHandle: leetcodeInput.trim(),
          codeforcesHandle: codeforcesInput.trim(),
        }),
      });
      toast.success("Handles saved successfully!");
      await refreshUser();
    } catch (err) {
      toast.error("Failed to save handles: " + getApiErrorMessage(err));
    } finally {
      setSubmittingHandles(false);
    }
  };

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

        // Refresh submissions to update the activity grid immediately
        try {
          const sRes = await api<{ submissions: any[] }>("/api/coding/submissions", { token });
          setSubmissions(sRes.submissions);
        } catch (subErr) {
          console.error("Failed to update submissions activity grid:", subErr);
        }
      }
    } catch (err) {
      toast.error("Failed to mark question as solved: " + getApiErrorMessage(err));
    } finally {
      setMarkingIds((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api<{ questions: CodingQuestion[] }>("/api/coding/questions", { token }),
      api<{ submissions: any[] }>("/api/coding/submissions", { token }),
    ])
      .then(([qRes, sRes]) => {
        setQuestions(qRes.questions);
        setSubmissions(sRes.submissions);
        // Expand first 2 topics by default
        const grouped = groupQuestions(qRes.questions);
        const topics = Object.keys(grouped);
        const initialExpanded: Record<string, boolean> = {};
        topics.forEach((t, index) => {
          initialExpanded[t] = index < 2;
        });
        setExpandedTopics(initialExpanded);
      })
      .catch((err) => {
        toast.error("Failed to load details: " + getApiErrorMessage(err));
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
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-600">Loading Coding Sheet...</p>
        </div>
      </div>
    );
  }

  const hasHandles = user?.leetcodeHandle && user?.codeforcesHandle;

  if (!hasHandles) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md border-slate-200 bg-white/60 backdrop-blur-md shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-indigo-650/10 blur-2xl" />
            <CardHeader className="space-y-2 pb-4 px-0 pt-0">
              <CardTitle className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Code2 className="h-6 w-6 text-indigo-450" />
                Submit Coding Profiles
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                Before accessing the SDE Practice Sheet, please submit your LeetCode and Codeforces profile usernames. 
                This is a one-time process to sync your activity grid, streaks, and points.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={handleSaveHandles} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="leetcode" className="text-xs font-bold text-slate-700">LeetCode Username</Label>
                  <Input
                    id="leetcode"
                    required
                    placeholder="e.g. leetcode_user"
                    value={leetcodeInput}
                    onChange={(e) => setLeetcodeInput(e.target.value)}
                    className="border-slate-200 bg-slate-50/60 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codeforces" className="text-xs font-bold text-slate-700">Codeforces Username</Label>
                  <Input
                    id="codeforces"
                    required
                    placeholder="e.g. cf_user"
                    value={codeforcesInput}
                    onChange={(e) => setCodeforcesInput(e.target.value)}
                    className="border-slate-200 bg-slate-50/60 focus:border-indigo-500"
                  />
                </div>
                <Button type="submit" className="w-full bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider h-10 mt-2" disabled={submittingHandles}>
                  {submittingHandles ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "Save & Access Sheets"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  // Get user level rank styling
  const getRankDetails = () => {
    if (percentageSolved === 100) return { title: "Grandmaster", desc: "You have conquered all problems!", color: "text-red-400 bg-red-950/20 border-red-500/30" };
    if (percentageSolved >= 75) return { title: "Expert Solver", desc: "Almost finished! Keep pushing.", color: "text-amber-400 bg-amber-950/20 border-amber-500/30" };
    if (percentageSolved >= 40) return { title: "Specialist", desc: "Good logical grasp. Keep practicing.", color: "text-indigo-400 bg-indigo-950/20 border-indigo-500/30" };
    if (percentageSolved >= 10) return { title: "Apprentice", desc: "Making solid progress on fundamental tracks.", color: "text-blue-400 bg-blue-950/20 border-blue-500/30" };
    return { title: "Newbie", desc: "Welcome to the sheets! Begin your journey.", color: "text-emerald-455 bg-emerald-950/10 border-emerald-500/20" };
  };

  const rank = getRankDetails();

  const easyQuestions = questions.filter((q) => q.difficulty === "Easy");
  const easySolved = easyQuestions.filter((q) => q.solved).length;

  const mediumQuestions = questions.filter((q) => q.difficulty === "Medium");
  const mediumSolved = mediumQuestions.filter((q) => q.solved).length;

  const hardQuestions = questions.filter((q) => q.difficulty === "Hard");
  const hardSolved = hardQuestions.filter((q) => q.solved).length;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 space-y-8">
        
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-900/10 via-purple-900/5 to-transparent p-6 sm:p-8">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-40 w-40 rounded-full bg-indigo-650/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl flex items-center gap-2.5">
                <Code2 className="h-7 w-7 text-indigo-450" /> Coding Practice Sheet
              </h1>
              <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
                Curated programming lists to master data structures, algorithms, and technical interview patterns. Grouped by data structure tracks to optimize learning.
              </p>
            </div>
            <Badge className="w-fit border-indigo-500/30 text-indigo-400 bg-indigo-950/30 px-3 py-1 font-bold text-xs uppercase tracking-widest shrink-0">
              SDE Sheet Active
            </Badge>
          </div>
        </div>

        {/* Dashboard Grid (LeetCode & Codeforces Style) */}
        <div className="grid gap-6 lg:grid-cols-4">
          
          {/* Left Column: Progress & Profile Rank Details */}
          <Card className="border-slate-200 bg-white/60 backdrop-blur-md shadow-2xl lg:col-span-1 hover:border-neutral-750 transition-colors duration-300 flex flex-col justify-between p-5">
            <div className="space-y-5">
              {/* Header: Rank */}
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  Current Rank
                </span>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                    <Trophy className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-800 tracking-tight leading-tight">
                      {rank.title}
                    </h3>
                    <p className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">
                      {rank.desc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sheet Completion progress bar */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  <span>Sheet Progress</span>
                  <span className="text-indigo-400 font-extrabold">{percentageSolved}%</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{solvedCount}</span>
                  <span className="text-[10px] text-slate-500 font-bold">/ {totalCount} Solved</span>
                </div>
                <div className="w-full h-2.5 bg-white rounded-full border border-slate-200 overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-fuchsia-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                    style={{ width: `${percentageSolved}%` }}
                  />
                </div>
              </div>

              {/* Difficulty Breakdown (LeetCode style) */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                  Difficulty Breakdown
                </span>
                
                {/* Easy */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-emerald-400">Easy</span>
                    <span className="text-slate-700">{easySolved}<span className="text-neutral-550">/{easyQuestions.length}</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${easyQuestions.length > 0 ? (easySolved / easyQuestions.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Medium */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-amber-550">Medium</span>
                    <span className="text-slate-700">{mediumSolved}<span className="text-neutral-550">/{mediumQuestions.length}</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${mediumQuestions.length > 0 ? (mediumSolved / mediumQuestions.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Hard */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-red-400">Hard</span>
                    <span className="text-slate-700">{hardSolved}<span className="text-neutral-550">/{hardQuestions.length}</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${hardQuestions.length > 0 ? (hardSolved / hardQuestions.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Handles */}
            {(user?.leetcodeHandle || user?.codeforcesHandle) && (
              <div className="pt-4 mt-4 border-t border-slate-200 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                  Connected Profiles
                </span>
                <div className="flex flex-wrap gap-2">
                  {user?.leetcodeHandle && (
                    <a
                      href={`https://leetcode.com/${user.leetcodeHandle}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded bg-white hover:bg-slate-50 px-2 py-1 text-[10px] font-bold text-amber-500 border border-slate-200 transition-colors"
                    >
                      <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                        <path d="M16.102 17.93l-2.697 2.607c-.466.45-1.111.587-1.685.387-.574-.2-1.039-.677-1.25-1.252l-.317-.866c-.347-.947-.133-2.023.548-2.738l2.697-2.607c.466-.45 1.111-.587 1.685-.387.574.2 1.039.677 1.25 1.252l.317.866c.347.947.133 2.023-.548 2.738zm-3.66-8.99l-2.697 2.607c-.466.45-1.111.587-1.685.387-.574-.2-1.039-.677-1.25-1.252l-.317-.866c-.347-.947-.133-2.023.548-2.738l2.697-2.607c.466-.45 1.111-.587 1.685-.387.574.2 1.039.677 1.25 1.252l.317.866c.347.947.133 2.023-.548 2.738z"/>
                        <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zm-6.136-1.597l-2.697-2.607c-.754-.728-1.884-.967-2.884-.627-1 .34-1.802 1.155-2.158 2.156l-.317.866c-.593 1.616-.23 3.447.935 4.667l2.697 2.607c.754.728 1.884.967 2.884.627 1-.34 1.802-1.155 2.158-2.156l.317-.866c.593-1.616.23-3.447-.935-4.667z"/>
                      </svg>
                      LeetCode
                    </a>
                  )}
                  {user?.codeforcesHandle && (
                    <a
                      href={`https://codeforces.com/profile/${user.codeforcesHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded bg-white hover:bg-slate-50 px-2 py-1 text-[10px] font-bold text-red-400 border border-slate-200 transition-colors"
                    >
                      <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                        <path d="M4.5 12h3V24h-3zM10.5 0h3v24h-3zM16.5 6h3v18h-3z"/>
                      </svg>
                      Codeforces
                    </a>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Right Column: LeetCode/Codeforces style Streak Contribution Grid */}
          <Card className="border-slate-200 bg-white/60 backdrop-blur-md shadow-2xl lg:col-span-3 hover:border-neutral-750 transition-colors duration-300 p-5 flex flex-col justify-between overflow-hidden">
            <div>
              {/* Header row with streak & points stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
                    Coding Activity & Streak Grid
                  </h2>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    Track your daily solving consistency and points accumulation
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Streak widget */}
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-950/10 px-3 py-1.5 shadow-[0_0_12px_rgba(16,185,129,0.06)]">
                    <svg
                      className="h-4.5 w-4.5 text-emerald-400 shrink-0"
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
                      <p className="text-[9px] font-extrabold text-emerald-550 uppercase tracking-widest leading-none">Active Days</p>
                      <p className="text-xs font-black text-emerald-400 mt-0.5 leading-none">{user?.streak ?? 0} Days</p>
                    </div>
                  </div>

                  {/* Points widget */}
                  <div className="flex items-center gap-2 rounded-lg border border-indigo-500/15 bg-indigo-950/10 px-3 py-1.5 shadow-[0_0_12px_rgba(139,92,246,0.06)]">
                    <Award className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-widest leading-none">Total Points</p>
                      <p className="text-xs font-black text-indigo-400 mt-0.5 leading-none">{user?.points ?? 0} PTS</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* The Calendar Grid Container */}
              {(() => {
                // Generate date grid for the last 365 days (ending today)
                const data: Record<string, number> = {};
                
                // Count successful submissions per day (YYYY-MM-DD)
                submissions.forEach((sub) => {
                  if (sub.status === "Accepted") {
                    const dateStr = new Date(sub.createdAt).toLocaleDateString("en-CA");
                    data[dateStr] = (data[dateStr] || 0) + 1;
                  }
                });

                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - 364);

                // Align to Sunday column start
                const dayOfWeek = startDate.getDay();
                if (dayOfWeek > 0) {
                  startDate.setDate(startDate.getDate() - dayOfWeek);
                }

                const grid = [];
                const current = new Date(startDate);

                while (current <= endDate) {
                  const dateStr = current.toLocaleDateString("en-CA");
                  grid.push({
                    date: new Date(current),
                    dateStr,
                    count: data[dateStr] || 0,
                  });
                  current.setDate(current.getDate() + 1);
                }

                // Chunk into columns of weeks (7 days each)
                const weeksList: any[][] = [];
                let currentWeek: any[] = [];
                
                grid.forEach((day, index) => {
                  currentWeek.push(day);
                  if (currentWeek.length === 7 || index === grid.length - 1) {
                    weeksList.push(currentWeek);
                    currentWeek = [];
                  }
                });

                // Compute month labels
                const months: { text: string; colIndex: number }[] = [];
                let lastMonth = "";
                weeksList.forEach((week, wIdx) => {
                  if (week[0]) {
                    const m = week[0].date.toLocaleString("en-US", { month: "short" });
                    if (m !== lastMonth) {
                      months.push({ text: m, colIndex: wIdx });
                      lastMonth = m;
                    }
                  }
                });

                return (
                  <div className="space-y-2 overflow-visible">
                    {/* Month labels header row */}
                    <div className="flex gap-[3.5px] select-none text-[8.5px] text-slate-500 font-semibold h-4 pl-[26px]">
                      <div className="relative w-full h-full">
                        {months.map((m) => (
                          <span
                            key={`${m.text}-${m.colIndex}`}
                            className="absolute"
                            style={{ left: `${m.colIndex * 12.1}px` }}
                          >
                            {m.text}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-[3.5px] overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                      {/* Weekday labels */}
                      <div className="flex flex-col justify-between text-[8px] text-slate-500 pr-1.5 select-none pt-[1.5px] h-[80px] shrink-0 font-medium leading-none">
                        <span>Sun</span>
                        <span>Tue</span>
                        <span>Thu</span>
                        <span>Sat</span>
                      </div>

                      {/* Weeks Columns */}
                      <div className="flex gap-[3.5px]">
                        {weeksList.map((week, wIdx) => (
                          <div key={wIdx} className="flex flex-col gap-[3.5px]">
                            {week.map((day) => {
                              let colorClass = "bg-white/50 border-neutral-955";
                              if (day.count === 1) colorClass = "bg-emerald-500/20 border-emerald-500/10 shadow-[0_0_6px_rgba(16,185,129,0.05)]";
                              else if (day.count === 2) colorClass = "bg-emerald-500/40 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.15)]";
                              else if (day.count >= 3) colorClass = "bg-emerald-400 border-emerald-450 shadow-[0_0_10px_rgba(52,211,153,0.3)]";

                              return (
                                <div
                                  key={day.dateStr}
                                  className={cn(
                                    "w-[8.5px] h-[8.5px] rounded-[1.5px] border transition-all duration-150 hover:scale-125 hover:z-10 cursor-default",
                                    colorClass
                                  )}
                                  title={`${day.count} solved on ${day.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Legend & Stats footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-500 select-none">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span>Total submissions: <strong className="text-slate-600">{submissions.filter(s => s.status === "Accepted").length}</strong></span>
                <span>•</span>
                <span>Streak: <strong className="text-emerald-400">{user?.streak ?? 0} Days</strong></span>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <span>Less</span>
                <div className="w-[8.5px] h-[8.5px] rounded-[1.5px] bg-white/50 border border-neutral-950" />
                <div className="w-[8.5px] h-[8.5px] rounded-[1.5px] bg-emerald-500/20 border border-emerald-500/10" />
                <div className="w-[8.5px] h-[8.5px] rounded-[1.5px] bg-emerald-500/40 border border-emerald-500/25" />
                <div className="w-[8.5px] h-[8.5px] rounded-[1.5px] bg-emerald-400 border border-emerald-450" />
                <span>More</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Topics Accordion Feed */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-slate-600" /> Dynamic Topics Tracker
          </h2>
          
          {topics.length === 0 ? (
            <Card className="border-slate-200 bg-white/40 text-center py-16">
              <CardContent className="space-y-3">
                <Award className="h-10 w-10 text-neutral-750 mx-auto" />
                <p className="text-slate-600 font-semibold">No sheet questions configured</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
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
                      "border-slate-200/80 bg-white/40 backdrop-blur-sm transition-all duration-300 overflow-hidden shadow-md",
                      isExpanded && "border-neutral-700 bg-white/50 shadow-lg"
                    )}
                  >
                    {/* Topic Accordion Header */}
                    <div
                      onClick={() => toggleTopic(topicName)}
                      className={cn(
                        "p-4 flex items-center justify-between cursor-pointer hover:bg-white/30 select-none transition-colors border-b border-transparent",
                        isExpanded && "border-slate-200 bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-slate-800 tracking-tight">{topicName}</span>
                        <Badge
                          variant={isAllSolved ? "success" : "outline"}
                          className={cn(
                            "text-[9px] py-0.5 px-2 font-bold uppercase",
                            isAllSolved
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                              : "border-slate-200 text-slate-500"
                          )}
                        >
                          {solvedInTopic} / {totalInTopic} Solved
                        </Badge>
                      </div>
                      <div className="text-slate-500 hover:text-slate-700 transition-colors">
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-250", isExpanded && "rotate-180")} />
                      </div>
                    </div>

                    {/* Topic Questions List */}
                    {isExpanded && (
                      <div className="border-t border-slate-200/50 bg-white/10 divide-y divide-neutral-900/50">
                        {topicQuestions.map((q) => (
                          <div
                            key={q.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/20 transition-colors duration-200"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Solved Status Checkbox Icon */}
                              {q.solved ? (
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)] animate-fade-in">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-neutral-700 hover:text-slate-500 border border-slate-200 hover:border-slate-300 transition-colors duration-150">
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
                                  className="text-xs font-semibold text-slate-700 hover:text-indigo-400 transition-colors truncate leading-none flex items-center gap-1"
                                >
                                  {q.title} <span className="text-[9px] text-slate-500 font-normal uppercase tracking-wider bg-white px-1.5 py-0.5 rounded border border-slate-200">External</span>
                                </a>
                              ) : (
                                <Link
                                  href={`/coding/${q.id}`}
                                  className="text-xs font-semibold text-slate-700 hover:text-indigo-400 transition-colors truncate leading-none"
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
                                  className="text-neutral-550 hover:text-slate-600 transition-colors p-0.5 shrink-0"
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
                                      className="h-8 text-[10px] shrink-0 font-extrabold transition-all duration-150 uppercase tracking-wider border-slate-200 text-slate-600 bg-slate-50/40 hover:bg-slate-100 hover:text-slate-900"
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
                                      className="h-8 text-[10px] shrink-0 font-extrabold transition-all duration-150 uppercase tracking-wider bg-indigo-600 text-white"
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
                                      ? "text-slate-500 hover:text-indigo-400 hover:bg-indigo-50"
                                      : "border-slate-200 text-slate-500 bg-white hover:text-indigo-600"
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
