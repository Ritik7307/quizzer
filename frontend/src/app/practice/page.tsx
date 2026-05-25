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
  ChevronUp,
  BookOpen,
  Award,
  ExternalLink as LinkIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CodingQuestion {
  id: string;
  title: string;
  difficulty: string;
  topic: string;
  referenceUrl?: string | null;
  solved: boolean;
}

export default function PracticeSheetPage() {
  const { token } = useAuth();
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

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

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 animate-fade-in space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-900 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-violet-400" /> Coding Practice Sheet
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Curated programming lists to master data structures, algorithms, and technical interviews.
            </p>
          </div>
        </div>

        {/* Stats Dashboard Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Progress Card */}
          <Card className="border-neutral-850 bg-neutral-950/40 backdrop-blur-sm sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-neutral-450">
                Your Completion Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">{solvedCount}</span>
                  <span className="text-xs text-neutral-500">/ {totalCount} Problems Solved</span>
                </div>
                <span className="text-sm font-bold text-violet-400 bg-violet-950/40 px-2 py-0.5 rounded border border-violet-900/30">
                  {percentageSolved}% Complete
                </span>
              </div>
              <div className="w-full h-3 bg-neutral-900 rounded-full border border-neutral-850 overflow-hidden">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all duration-500"
                  style={{ width: `${percentageSolved}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Achievement Card */}
          <Card className="border-neutral-850 bg-neutral-950/40 backdrop-blur-sm flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-neutral-450">
                Current Level
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4 py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-neutral-250">
                  {percentageSolved === 100
                    ? "Grandmaster"
                    : percentageSolved >= 75
                    ? "Expert Solver"
                    : percentageSolved >= 40
                    ? "Specialist"
                    : percentageSolved >= 10
                    ? "Apprentice"
                    : "Newbie"}
                </p>
                <p className="text-[10px] text-neutral-500">
                  Keep solving to unlock advanced titles.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topics Accordion Feed */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Structured Topics</h2>
          
          {topics.length === 0 ? (
            <Card className="border-neutral-900 bg-neutral-950/20 text-center py-12">
              <CardContent className="space-y-2">
                <Award className="h-8 w-8 text-neutral-600 mx-auto" />
                <p className="text-neutral-400 font-semibold">No sheet questions configured</p>
                <p className="text-xs text-neutral-500">Admins need to upload coding questions to build the sheet categories.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {topics.map((topicName) => {
                const topicQuestions = groupedQuestions[topicName];
                const solvedInTopic = topicQuestions.filter((q) => q.solved).length;
                const totalInTopic = topicQuestions.length;
                const isExpanded = !!expandedTopics[topicName];

                return (
                  <Card
                    key={topicName}
                    className={cn(
                      "border-neutral-850 bg-neutral-950/25 transition-all overflow-hidden",
                      isExpanded && "border-neutral-800"
                    )}
                  >
                    {/* Topic Accordion Header */}
                    <div
                      onClick={() => toggleTopic(topicName)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-900/40 select-none transition-colors border-b border-neutral-900/10"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-neutral-100">{topicName}</span>
                        <Badge
                          variant={solvedInTopic === totalInTopic ? "success" : "outline"}
                          className="text-[9px] py-0.5 px-2"
                        >
                          {solvedInTopic} / {totalInTopic} Solved
                        </Badge>
                      </div>
                      <div className="text-neutral-500">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {/* Topic Questions List */}
                    {isExpanded && (
                      <div className="border-t border-neutral-900 bg-neutral-950/15 divide-y divide-neutral-900">
                        {topicQuestions.map((q) => (
                          <div
                            key={q.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-900/10 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Solved Status Checkbox Icon */}
                              {q.solved ? (
                                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="h-4.5 w-4.5 text-neutral-800 shrink-0" />
                              )}

                              {/* Question Title */}
                              <Link
                                href={`/coding/${q.id}`}
                                className="text-xs font-semibold text-neutral-200 hover:text-violet-400 truncate"
                              >
                                {q.title}
                              </Link>

                              {/* External Reference Link */}
                              {q.referenceUrl && (
                                <a
                                  href={q.referenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View on external source"
                                  className="text-neutral-550 hover:text-white transition-colors p-0.5 shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-3 justify-between sm:justify-end">
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
                                  "text-[10px] font-semibold px-2.5 py-0.5 shrink-0",
                                  q.difficulty === "Hard" && "border-red-500/30 text-red-300 bg-red-950/20"
                                )}
                              >
                                {q.difficulty}
                              </Badge>

                              {/* Action Link Button */}
                              <Button
                                size="sm"
                                variant={q.solved ? "ghost" : "outline"}
                                asChild
                                className={cn(
                                  "h-8 text-[10px] shrink-0 font-bold",
                                  q.solved
                                    ? "text-neutral-450 hover:text-violet-400 hover:bg-violet-955/10"
                                    : "border-neutral-800 text-neutral-250 bg-black/35 hover:bg-neutral-850 hover:text-white"
                                )}
                              >
                                <Link href={`/coding/${q.id}`}>
                                  {q.solved ? "Solve again" : "Solve Problem"}
                                </Link>
                              </Button>
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
