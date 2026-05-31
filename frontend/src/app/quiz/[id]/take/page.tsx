"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Send, Flag, CheckCircle2, AlertTriangle, HelpCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TakeQuizPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [comments, setComments] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const submittingRef = useRef(false);

  const submitQuiz = useCallback(async () => {
    if (submittingRef.current || !attemptId || !token) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await api(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        token,
        body: JSON.stringify({ answers }),
      });
      toast.success("Quiz submitted!");
      setFeedbackDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Submit failed");
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [attemptId, token, answers]);

  const handleFeedbackSubmit = async (skipped = false) => {
    if (!skipped && token) {
      setSubmittingFeedback(true);
      try {
        await api(`/api/attempts/${attemptId}/feedback`, {
          method: "POST",
          token,
          body: JSON.stringify({
            rating,
            difficulty,
            comments: comments.trim() || null,
          }),
        });
        toast.success("Thank you for your feedback!");
      } catch (err: any) {
        toast.error(err.message || "Failed to submit feedback");
      } finally {
        setSubmittingFeedback(false);
      }
    }
    router.push(`/quiz/${id}/result`);
  };

  // Load Quiz Attempt
  useEffect(() => {
    if (!token || !id) return;
    api<{
      attempt: { id: string; answers?: string };
      quiz: { title: string; instructions: string };
      questions: Question[];
      expiresAt: string;
      serverTime: string;
    }>(`/api/attempts/start/${id}`, { method: "POST", token })
      .then((data) => {
        setAttemptId(data.attempt.id);
        setTitle(data.quiz.title);
        setInstructions(data.quiz.instructions);
        setQuestions(data.questions);

        // Resume answers progress
        if (data.attempt.answers) {
          try {
            setAnswers(JSON.parse(data.attempt.answers));
          } catch {
            setAnswers({});
          }
        }

        // Resume flagged state from localStorage
        const localFlagged = localStorage.getItem(`quizer:attempt:${data.attempt.id}:flagged`);
        if (localFlagged) {
          try {
            setFlagged(JSON.parse(localFlagged));
          } catch {
            setFlagged({});
          }
        }

        const expires = new Date(data.expiresAt).getTime();
        const serverNow = new Date(data.serverTime).getTime();
        const offset = Date.now() - serverNow;
        setTimeLeft(Math.max(0, Math.floor((expires - (Date.now() - offset)) / 1000)));
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Cannot start quiz");
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [token, id, router]);

  // Sync Flagged state to LocalStorage
  useEffect(() => {
    if (attemptId) {
      localStorage.setItem(`quizer:attempt:${attemptId}:flagged`, JSON.stringify(flagged));
    }
  }, [flagged, attemptId]);

  // Quiz Timer
  useEffect(() => {
    if (timeLeft <= 0 || !attemptId) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft, attemptId, submitQuiz]);

  // Auto-save progress
  useEffect(() => {
    if (!attemptId || !token) return;
    setSavingStatus("saving");
    const save = setTimeout(() => {
      api(`/api/attempts/${attemptId}/progress`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ answers }),
      })
        .then(() => setSavingStatus("saved"))
        .catch(() => setSavingStatus("error"));
    }, 3000);
    return () => clearTimeout(save);
  }, [answers, attemptId, token]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showInstructions) return;
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const key = e.key.toLowerCase();

      // Navigation
      if (key === "arrowright" || key === "n") {
        e.preventDefault();
        if (current < questions.length - 1) {
          setCurrent((c) => c + 1);
        }
      } else if (key === "arrowleft" || key === "p") {
        e.preventDefault();
        if (current > 0) {
          setCurrent((c) => c - 1);
        }
      }

      // Option Selection (1-4 or A-D)
      if (["1", "2", "3", "4"].includes(key) || ["a", "b", "c", "d"].includes(key)) {
        e.preventDefault();
        let idx = -1;
        if (["1", "2", "3", "4"].includes(key)) {
          idx = parseInt(key) - 1;
        } else {
          idx = key.charCodeAt(0) - 97; // a=97, b=98...
        }

        const activeQ = questions[current];
        if (activeQ && idx >= 0 && idx < activeQ.options.length) {
          if (activeQ.type === "MULTI_SELECT") {
            setAnswers((prev) => {
              const currentSel = (prev[activeQ.id] as number[]) || [];
              let nextSel: number[];
              if (currentSel.includes(idx)) {
                nextSel = currentSel.filter((i) => i !== idx);
              } else {
                nextSel = [...currentSel, idx];
              }
              const copy = { ...prev };
              if (nextSel.length === 0) {
                delete copy[activeQ.id];
              } else {
                copy[activeQ.id] = nextSel;
              }
              return copy;
            });
          } else if (activeQ.type === "FILL_IN_BLANK") {
            // No action for keyboard selection shortcuts on free-text questions
          } else {
            setAnswers((prev) => ({ ...prev, [activeQ.id]: idx }));
          }
        }
      }

      // Mark/Flag (F or R)
      if (key === "f" || key === "r") {
        e.preventDefault();
        const activeQ = questions[current];
        if (activeQ) {
          setFlagged((prev) => ({ ...prev, [activeQ.id]: !prev[activeQ.id] }));
        }
      }

      // Clear selection (C)
      if (key === "c") {
        e.preventDefault();
        const activeQ = questions[current];
        if (activeQ) {
          setAnswers((prev) => {
            const copy = { ...prev };
            delete copy[activeQ.id];
            return copy;
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current, questions, showInstructions]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const q = questions[current];

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.keys(flagged).filter((qid) => flagged[qid]).length;
  const remainingCount = totalQuestions - answeredCount;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (loading) {
    return (
      <ProtectedRoute role="CANDIDATE">
        <div className="mx-auto max-w-4xl p-6 text-foreground bg-background">
          <Skeleton className="mb-4 h-10 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </ProtectedRoute>
    );
  }

  if (showInstructions && instructions) {
    return (
      <ProtectedRoute role="CANDIDATE">
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 text-foreground bg-background">
          <Card className="max-w-lg w-full border border-border bg-card/90 shadow-2xl rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-foreground sm:text-2xl">{title} — Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground sm:text-base">{instructions}</p>
              <Button className="w-full bg-indigo-650 text-white hover:bg-indigo-700 font-bold" onClick={() => setShowInstructions(false)}>
                I understand, start quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  // Helper render for Submit Dialog content
  const renderSubmitSummary = () => (
    <div className="space-y-4 pt-2 text-foreground">
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500 gap-1 px-3 py-1 font-bold">
          <CheckCircle2 className="h-3 w-3" /> {answeredCount} Answered
        </Badge>
        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-500 gap-1 px-3 py-1 font-bold">
          <Flag className="h-3 w-3" /> {flaggedCount} Flagged
        </Badge>
        <Badge variant="outline" className="border-border bg-muted text-muted-foreground gap-1 px-3 py-1 font-bold">
          <HelpCircle className="h-3 w-3" /> {remainingCount} Unanswered
        </Badge>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-extrabold text-muted-foreground mb-3 text-center uppercase tracking-wider">Question Review Grid</p>
        <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto px-1">
          {questions.map((question, i) => {
            const isAns = answers[question.id] !== undefined;
            const isFlg = flagged[question.id];
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => {
                  setCurrent(i);
                  setSubmitDialogOpen(false);
                }}
                className={cn(
                  "flex h-9 items-center justify-center rounded-lg text-xs font-bold border transition-all hover:scale-105 select-none",
                  isFlg
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : isAns
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-center text-muted-foreground/60 mt-2 font-medium">Click a question number to jump to it directly.</p>
      </div>

      <Button onClick={submitQuiz} disabled={isSubmitting} className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-2.5 mt-2 rounded-lg shadow-sm">
        {isSubmitting ? "Submitting..." : "Finish & Submit Exam"}
      </Button>
    </div>
  );

  return (
    <ProtectedRoute role="CANDIDATE">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 animate-fade-in text-foreground">
        
        {/* Header Section */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight leading-snug">{title}</h1>
            
            {/* Auto-save Status */}
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
              <span className={cn(
                "h-2.5 w-2.5 rounded-full inline-block transition-colors duration-300",
                savingStatus === "saving" && "bg-amber-500 animate-pulse",
                savingStatus === "saved" && "bg-emerald-500",
                savingStatus === "error" && "bg-red-500 animate-ping",
                savingStatus === "idle" && "bg-muted-foreground"
              )} />
              {savingStatus === "saving" && "Saving progress..."}
              {savingStatus === "saved" && "Progress auto-saved"}
              {savingStatus === "error" && "Offline / Save failed!"}
              {savingStatus === "idle" && "Progress saved"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer Panel */}
            <div
              className={cn(
                "w-fit rounded-xl px-4 py-2 font-mono text-lg font-bold tabular-nums shadow-md border",
                timeLeft < 60
                  ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse"
                  : "bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
              )}
            >
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>

            {/* Quick Submit Button */}
            <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-650 hover:bg-emerald-700 text-white font-extrabold shadow-md rounded-lg h-10 px-4 flex items-center gap-1">
                  <Send className="h-4 w-4" /> Submit
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border bg-card shadow-2xl max-w-sm sm:max-w-md text-foreground">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-center">Submit Quiz</DialogTitle>
                  <DialogDescription className="text-center text-muted-foreground mt-1">
                    Are you ready to submit your attempt? Here is your progress summary:
                  </DialogDescription>
                </DialogHeader>
                {renderSubmitSummary()}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mb-6 space-y-2 bg-card/45 border border-border rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm font-bold text-muted-foreground sm:text-base">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Completion Progress
            </span>
            <span>
              {answeredCount} of {totalQuestions} answered ({remainingCount} left)
            </span>
          </div>
          <div className="w-full bg-muted border border-border rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out shadow-inner"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_250px] lg:gap-6">
          
          {/* Main Question Card */}
          <Card className="order-2 animate-fade-in lg:order-1 border-border bg-card/45 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border pb-4 bg-muted/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  Question {current + 1} of {totalQuestions}
                </CardTitle>
                {flagged[q?.id] && (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20 gap-1.5 px-2.5 py-0.5 font-bold">
                    <Flag className="h-3 w-3 fill-current" /> Flagged
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <p className="text-lg leading-relaxed text-foreground sm:text-xl font-extrabold">{q?.text}</p>
              
              {/* Options list based on type */}
              {q?.type === "MULTI_SELECT" ? (
                <div className="space-y-3">
                  {q.options.map((opt, i) => {
                    const isSelected = Array.isArray(answers[q.id]) && (answers[q.id] as number[]).includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const currentSelection = (answers[q.id] as number[]) || [];
                          let nextSelection: number[];
                          if (currentSelection.includes(i)) {
                            nextSelection = currentSelection.filter((idx) => idx !== i);
                          } else {
                            nextSelection = [...currentSelection, i];
                          }
                          if (nextSelection.length === 0) {
                            const copy = { ...answers };
                            delete copy[q.id];
                            setAnswers(copy);
                          } else {
                            setAnswers({ ...answers, [q.id]: nextSelection });
                          }
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-base transition-all sm:p-4 sm:text-lg outline-none cursor-pointer",
                          isSelected
                            ? "border-indigo-500 bg-indigo-600 text-white font-bold ring-1 ring-indigo-550 shadow-md"
                            : "border-border text-foreground/90 hover:border-indigo-500/40 hover:bg-muted/40 dark:hover:bg-zinc-800/40 bg-card"
                        )}
                      >
                        <span className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-colors shadow-sm",
                          isSelected
                            ? "bg-white text-indigo-600"
                            : "bg-muted text-muted-foreground border border-border"
                        )}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="font-semibold">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : q?.type === "FILL_IN_BLANK" ? (
                <div className="space-y-3">
                  <Label htmlFor={`fill-${q.id}`} className="text-xs font-bold text-muted-foreground">Type your answer below:</Label>
                  <Input
                    id={`fill-${q.id}`}
                    value={answers[q.id] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.trim() === "") {
                        const copy = { ...answers };
                        delete copy[q.id];
                        setAnswers(copy);
                      } else {
                        setAnswers({ ...answers, [q.id]: val });
                      }
                    }}
                    placeholder="Your answer..."
                    className="bg-card border-border text-foreground h-12 text-base px-4 focus-visible:ring-indigo-500 rounded-xl"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {q?.options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: i })}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-base transition-all sm:p-4 sm:text-lg outline-none cursor-pointer",
                        answers[q.id] === i
                          ? "border-indigo-500 bg-indigo-600 text-white font-bold ring-1 ring-indigo-550 shadow-md"
                          : "border-border text-foreground/90 hover:border-indigo-500/40 hover:bg-muted/40 dark:hover:bg-zinc-800/40 bg-card"
                      )}
                    >
                      <span className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-colors shadow-sm",
                        answers[q.id] === i
                          ? "bg-white text-indigo-600"
                          : "bg-muted text-muted-foreground border border-border"
                      )}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="font-semibold">{opt}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Card Actions Footer */}
              <div className="flex flex-col gap-2 pt-6 sm:flex-row sm:justify-between border-t border-border mt-4">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="w-full sm:w-auto h-10 text-sm rounded-lg">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  
                  {answers[q?.id] !== undefined && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const newAnswers = { ...answers };
                        delete newAnswers[q.id];
                        setAnswers(newAnswers);
                      }}
                      className="w-full sm:w-auto h-10 text-sm text-muted-foreground hover:text-foreground rounded-lg"
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setFlagged((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                    className={cn(
                      "w-full sm:w-auto h-10 text-sm gap-2 rounded-lg",
                      flagged[q?.id]
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-555 dark:text-amber-400 hover:bg-amber-500/15"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Flag className={cn("h-4 w-4", flagged[q?.id] && "fill-current")} />
                    {flagged[q?.id] ? "Flagged" : "Flag for Review"}
                  </Button>

                  {current < totalQuestions - 1 ? (
                    <Button
                      onClick={() => setCurrent((c) => c + 1)}
                      className={cn(
                        "w-full sm:w-auto h-10 text-sm font-bold gap-1 rounded-lg",
                        answers[q?.id] === undefined
                          ? "bg-muted text-muted-foreground border border-border hover:bg-muted/70 hover:text-foreground"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      )}
                    >
                      {answers[q?.id] === undefined ? "Skip Question" : "Next"}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto h-10 text-sm bg-emerald-650 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-sm">
                          <Send className="h-4 w-4 mr-1" /> Submit Exam
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-border bg-card shadow-2xl max-w-sm sm:max-w-md text-foreground">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold text-center">Submit Quiz</DialogTitle>
                          <DialogDescription className="text-center text-muted-foreground mt-1">
                            Are you ready to submit your attempt? Here is your progress summary:
                          </DialogDescription>
                        </DialogHeader>
                        {renderSubmitSummary()}
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Right Column: Question Palette & Shortcuts Panel */}
          <div className="order-1 h-fit lg:order-2 lg:sticky lg:top-20 space-y-4">
            
            {/* Palette Card */}
            <Card className="border border-border bg-card/45 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2.5 border-b border-border bg-muted/5">
                <CardTitle className="text-base font-bold text-foreground">Question Palette</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Navigate between questions</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((question, i) => {
                    const isSel = current === i;
                    const isAns = answers[question.id] !== undefined;
                    const isFlg = flagged[question.id];

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => setCurrent(i)}
                        className={cn(
                          "relative flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold border transition-all duration-200 outline-none select-none cursor-pointer",
                          isSel
                            ? "ring-2 ring-indigo-500 bg-indigo-500/10 text-indigo-650 dark:text-indigo-450 border-transparent scale-105 shadow-sm"
                            : isFlg
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/20 hover:bg-amber-500/15"
                            : isAns
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20 hover:bg-emerald-500/15"
                            : "bg-card text-muted-foreground border-border hover:border-indigo-500/30"
                        )}
                      >
                        {i + 1}
                        
                        {/* Status dot indicator for flagged AND answered */}
                        {isAns && isFlg && (
                          <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Palette Legend */}
                <div className="mt-4 border-t border-border pt-3 flex flex-wrap gap-2 text-xs text-muted-foreground font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-card border border-border" />
                    <span>Unvisited</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-emerald-500/15 border border-emerald-500/20" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-amber-500/15 border border-amber-500/20" />
                    <span>Review</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts Card */}
            <Card className="border border-border bg-card/45 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2.5 border-b border-border bg-muted/5">
                <CardTitle className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest leading-none">Keyboard Controls</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-2 text-sm text-muted-foreground font-semibold">
                  <div className="flex items-center justify-between border-b border-border/40 pb-1">
                    <span className="text-xs">Select Option</span>
                    <span className="flex gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono text-muted-foreground">A-D</kbd>
                      <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono text-muted-foreground">1-4</kbd>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-1">
                    <span className="text-xs">Next / Skip</span>
                    <span className="flex gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono text-muted-foreground">N</kbd>
                      <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono text-muted-foreground">→</kbd>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-1">
                    <span className="text-xs">Previous</span>
                    <span className="flex gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono text-muted-foreground">P</kbd>
                      <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono text-muted-foreground">←</kbd>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-1">
                    <span className="text-xs">Flag for Review</span>
                    <span className="flex gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono text-muted-foreground">F</kbd>
                      <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono text-muted-foreground">R</kbd>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Clear Selection</span>
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono text-muted-foreground">C</kbd>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md border-border bg-card shadow-2xl text-foreground" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Rate this Quiz</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground mt-1">
              Your feedback helps us improve future quiz questions and difficulty scaling.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-3">
            {/* Star Rating */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block text-center">Rating</label>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="outline-none focus:outline-none transition-transform active:scale-95"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        star <= rating
                          ? "fill-amber-450 text-amber-500"
                          : "text-neutral-700 fill-transparent hover:text-slate-500"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Perceived Difficulty */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block text-center">Perceived Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Easy", "Medium", "Hard"] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={cn(
                      "rounded-lg border py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 outline-none shadow-sm",
                      difficulty === diff
                        ? "border-indigo-500 bg-indigo-650 text-white font-bold"
                        : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {diff === "Easy" ? "🟢 Easy" : diff === "Medium" ? "🟡 Medium" : "🔴 Hard"}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions Comments */}
            <div className="space-y-1.5">
              <label htmlFor="comments" className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">Comments & Suggestions (Optional)</label>
              <textarea
                id="comments"
                rows={3}
                placeholder="Tell us what you liked or what can be improved..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-muted-foreground/60 shadow-inner"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => handleFeedbackSubmit(true)}
                disabled={submittingFeedback}
                className="w-full font-bold py-2.5 rounded-lg"
              >
                Skip
              </Button>
              <Button
                onClick={() => handleFeedbackSubmit(false)}
                disabled={submittingFeedback}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-2.5 rounded-lg shadow-sm"
              >
                {submittingFeedback ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
