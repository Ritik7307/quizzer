"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Award, CheckCircle2, Trophy, XCircle, Star, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface FeedbackData {
  id: string;
  rating: number;
  difficulty: string;
  comments?: string | null;
}

export default function QuizResultPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState<{
    attempt: {
      id: string;
      score: number;
      percentage: number;
      correctCount: number;
      wrongCount: number;
      totalQuestions: number;
      rank: number | null;
      quiz: { title: string };
      feedback?: FeedbackData | null;
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

  // Feedback states
  const [rating, setRating] = useState(5);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [comments, setComments] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    api<NonNullable<typeof data>>(
      `/api/attempts/my/${id}`,
      { token }
    )
      .then((res) => {
        setData(res);
        if (res.attempt.feedback) {
          setFeedbackSubmitted(true);
        }
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleSubmitFeedback = async () => {
    if (!data?.attempt?.id || !token) return;
    setSubmittingFeedback(true);
    try {
      await api(`/api/attempts/${data.attempt.id}/feedback`, {
        method: "POST",
        token,
        body: JSON.stringify({
          rating,
          difficulty,
          comments: comments.trim() || null,
        }),
      });
      toast.success("Thank you for your feedback!");
      setFeedbackSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 animate-fade-in">
        {loading ? (
          <Skeleton className="h-80 w-full" />
        ) : data ? (
          <div className="space-y-6">
            
            {/* Results card */}
            <Card className="border-neutral-800 bg-neutral-950/40 backdrop-blur-sm shadow-xl">
              <CardHeader className="text-center border-b border-neutral-900/50 pb-6">
                <Trophy className="mx-auto mb-2 h-12 w-12 text-amber-500" />
                <CardTitle className="text-2xl font-extrabold text-white tracking-tight">{data.attempt.quiz.title}</CardTitle>
                <p className="text-neutral-400 text-sm">Performance Summary</p>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="text-center">
                  <p className="text-5xl font-extrabold text-violet-500">{data.attempt.percentage}%</p>
                  <p className="mt-1.5 text-neutral-300 text-sm font-medium">
                    Score: {data.attempt.score} / {data.attempt.totalQuestions}
                  </p>
                  {data.attempt.rank !== null && (
                    <p className="mt-2 flex items-center justify-center gap-1.5 font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 w-fit mx-auto px-3 py-1 rounded-full text-sm">
                      <Award className="h-4 w-4" /> Rank #{data.attempt.rank}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-950/20 border border-emerald-900/20 p-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">{data.attempt.correctCount}</p>
                      <p className="text-xs text-neutral-400 font-medium">Correct</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-red-950/20 border border-red-900/20 p-4">
                    <XCircle className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-red-400">{data.attempt.wrongCount}</p>
                      <p className="text-xs text-neutral-400 font-medium">Wrong</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-neutral-900/50">
                  <Button asChild className="bg-violet-600 hover:bg-violet-750 text-white font-semibold">
                    <Link href="/leaderboard">View Leaderboard</Link>
                  </Button>
                  <Button variant="outline" asChild className="border-neutral-750 text-neutral-300 hover:bg-neutral-850">
                    <Link href="/dashboard">Back to Dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Feedback form */}
            {!feedbackSubmitted ? (
              <Card className="border-violet-900/30 bg-neutral-900/20 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-neutral-100">Rate this Quiz</CardTitle>
                  <CardDescription className="text-xs text-neutral-400">
                    Your feedback helps Kode Club improve future quiz questions and difficulty scaling.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Star Rating */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Rating</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="outline-none focus:outline-none transition-transform active:scale-95"
                        >
                          <Star
                            className={cn(
                              "h-7 w-7 transition-colors",
                              star <= rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-neutral-700 fill-transparent hover:text-neutral-500"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Perceived Difficulty */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Perceived Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Easy", "Medium", "Hard"] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setDifficulty(diff)}
                          className={cn(
                            "rounded-lg border py-2 text-xs font-semibold transition-all outline-none",
                            difficulty === diff
                              ? "border-violet-500 bg-violet-950/40 text-white font-bold"
                              : "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-750"
                          )}
                        >
                          {diff === "Easy" ? "🟢 Easy" : diff === "Medium" ? "🟡 Medium" : "🔴 Hard"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suggestions Comments */}
                  <div className="space-y-1.5">
                    <label htmlFor="comments" className="text-xs font-bold uppercase tracking-wider text-neutral-400">Comments & Suggestions</label>
                    <textarea
                      id="comments"
                      rows={3}
                      placeholder="Tell us what you liked or what can be improved in this quiz..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full rounded-lg border border-neutral-800 bg-black/40 p-3 text-sm text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>

                  <Button
                    onClick={handleSubmitFeedback}
                    disabled={submittingFeedback}
                    className="w-full bg-violet-600 hover:bg-violet-750 text-white font-semibold py-2.5"
                  >
                    {submittingFeedback ? "Submitting Review..." : "Submit Review"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-emerald-900/30 bg-emerald-950/5 shadow-md">
                <CardContent className="py-6 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <h3 className="font-bold text-neutral-100">Thank you for your feedback!</h3>
                  <p className="text-xs text-neutral-400">Your review helps us curate better quality questions for Kode Club events.</p>
                </CardContent>
              </Card>
            )}

          </div>
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

        {/* Detailed Breakdown Review */}
        {data?.breakdown && (
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Detailed Review</h2>
            {data.breakdown.map((q, idx) => (
              <Card key={q.questionId} className={q.isCorrect ? "border-emerald-950 bg-emerald-950/5" : "border-red-950 bg-red-950/5"}>
                <CardHeader className="pb-3 border-b border-neutral-900/20">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {q.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-450 uppercase tracking-wider">Question {idx + 1}</p>
                      <CardTitle className="text-base font-semibold text-neutral-100 mt-1 leading-snug">{q.text}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pl-11 pt-4">
                  <div className="space-y-2">
                    {q.options.map((opt, i) => {
                      const isSelected = q.selected === i;
                      const isCorrect = q.correct === i;
                      let optionClass = "border-neutral-850 bg-neutral-900/30 text-neutral-300";
                      
                      if (isCorrect) {
                        optionClass = "border-emerald-550/40 bg-emerald-950/20 text-emerald-400 font-medium";
                      } else if (isSelected && !isCorrect) {
                        optionClass = "border-red-550/40 bg-red-950/20 text-red-400 font-medium";
                      }

                      return (
                        <div
                          key={i}
                          className={`rounded-lg border p-3.5 text-sm transition-colors ${optionClass}`}
                        >
                          <span className="font-semibold mr-1.5">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                  {q.selected === null && (
                    <p className="mt-3 text-xs text-amber-500 font-medium flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5" /> You did not answer this question.
                    </p>
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
