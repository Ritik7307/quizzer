"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, CheckCircle } from "lucide-react";

interface DailyChallengeData {
  daily: {
    id: string;
    date: string;
    codingQuestion: {
      id: string;
      title: string;
      difficulty: string;
      topic: string;
      referenceUrl: string | null;
      isExternalOnly?: boolean;
    };
  };
  isSolved: boolean;
  timeLeft: number;
}

export default function DailyChallengePage() {
  const { token } = useAuth();
  const [data, setData] = useState<DailyChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [markingSolved, setMarkingSolved] = useState(false);
  const { refresh: refreshUser } = useAuth();

  useEffect(() => {
    if (!token) return;
    
    api<DailyChallengeData>("/api/daily/today", { token })
      .then((res) => {
        setData(res);
      })
      .catch((e: any) => {
        toast.error(e.message || "Failed to load daily challenge");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (!data) return;
    
    let time = data.timeLeft;
    
    const interval = setInterval(() => {
      time -= 1000;
      if (time <= 0) {
        setTimeLeftStr("00:00:00");
        clearInterval(interval);
        return;
      }
      
      const hours = Math.floor((time / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((time / 1000 / 60) % 60);
      const seconds = Math.floor((time / 1000) % 60);
      
      setTimeLeftStr(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);
    
    return () => clearInterval(interval);
  }, [data]);

  const handleMarkSolved = async () => {
    if (!token || !data) return;
    setMarkingSolved(true);
    try {
      const res = await api<{
        success: boolean;
        pointsAwarded: number;
        currentStreak: number;
      }>(`/api/coding/questions/${data.daily.codingQuestion.id}/mark-solved`, {
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
        setData((prev) => prev ? { ...prev, isSolved: true } : prev);
        await refreshUser();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to mark as solved");
    } finally {
      setMarkingSolved(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
        <div className="mb-8 text-center">
          <Badge className="mb-4 px-3 py-1 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border-indigo-500/20">
            <Calendar className="w-3.5 h-3.5 mr-2" />
            Daily Challenge
          </Badge>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl md:text-5xl tracking-tight mb-4">
            Problem of the Day
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Solve the daily problem from LeetCode or Codeforces to maintain your streak and earn bonus points.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : !data ? (
          <Card className="border-border bg-card shadow-sm text-center py-12">
            <CardContent>
              <Swords className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-foreground mb-2">No Challenge Today</h3>
              <p className="text-muted-foreground">The admin hasn't configured external problems yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <Card className={`border-border shadow-sm md:col-span-2 relative overflow-hidden transition-all duration-300 ${data.isSolved ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card"}`}>
              {data.isSolved && (
                <div className="absolute top-0 right-0 p-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge
                    variant={
                      data.daily.codingQuestion.difficulty === "Easy"
                        ? "success"
                        : data.daily.codingQuestion.difficulty === "Medium"
                        ? "warning"
                        : "destructive"
                    }
                    className="font-bold"
                  >
                    {data.daily.codingQuestion.difficulty}
                  </Badge>
                  {data.daily.codingQuestion.topic.split(",").slice(0, 3).map((topic, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {topic.trim()}
                    </Badge>
                  ))}
                </div>
                <CardTitle className="text-2xl">{data.daily.codingQuestion.title}</CardTitle>
                <CardDescription>
                  {data.daily.codingQuestion.referenceUrl?.includes("leetcode") 
                    ? "Sourced from LeetCode" 
                    : data.daily.codingQuestion.referenceUrl?.includes("codeforces")
                    ? "Sourced from Codeforces"
                    : "Sourced externally"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  {data.daily.codingQuestion.isExternalOnly || !!data.daily.codingQuestion.referenceUrl
                    ? "Ready to test your skills? Solve this challenge on the external platform and mark it as solved here to earn your points!"
                    : "Ready to test your skills? Write your solution in our built-in compiler and get it tested automatically against sample test cases!"}
                </p>
                
                {data.isSolved ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">Challenge Completed!</p>
                        <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">You've earned your points for today.</p>
                      </div>
                    </div>
                    {data.daily.codingQuestion.isExternalOnly || !!data.daily.codingQuestion.referenceUrl ? (
                      <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                        <a href={data.daily.codingQuestion.referenceUrl!} target="_blank" rel="noopener noreferrer">
                          Reattempt on Platform
                        </a>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                        <Link href={`/coding/${data.daily.codingQuestion.id}`}>
                          Reattempt Challenge
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {data.daily.codingQuestion.isExternalOnly || !!data.daily.codingQuestion.referenceUrl ? (
                      <>
                        <Button asChild size="lg" className="w-full sm:w-auto font-bold flex items-center gap-2">
                          <a href={data.daily.codingQuestion.referenceUrl!} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                            Solve on Platform
                          </a>
                        </Button>
                        <Button 
                          onClick={handleMarkSolved} 
                          disabled={markingSolved}
                          variant="outline"
                          size="lg" 
                          className="w-full sm:w-auto font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {markingSolved ? "Marking..." : "Mark as Solved"}
                        </Button>
                      </>
                    ) : (
                      <Button asChild size="lg" className="w-full sm:w-auto font-bold">
                        <Link href={`/coding/${data.daily.codingQuestion.id}`}>
                          Solve Challenge
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card className="border-border bg-card shadow-sm text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    Time Remaining
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-2 text-3xl font-mono font-bold text-foreground">
                    <Clock className="w-6 h-6 text-indigo-500" />
                    {timeLeftStr || "--:--:--"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Until next challenge drops</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Daily Rewards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Completion</span>
                    <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/10 font-bold">+50 pts</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Streak Bonus</span>
                    <Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/10 font-bold">+10 pts</Badge>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <p className="text-xs text-muted-foreground">Keep your streak alive to unlock exclusive profile badges!</p>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
