"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Send, Flag, CheckCircle2, AlertTriangle, HelpCircle, Save } from "lucide-react";
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

export default function TakeQuizPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const submittingRef = useRef(false);

  const submitQuiz = useCallback(async () => {
    if (submittingRef.current || !attemptId || !token) return;
    submittingRef.current = true;
    try {
      await api(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        token,
        body: JSON.stringify({ answers }),
      });
      toast.success("Quiz submitted!");
      router.push(`/quiz/${id}/result`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Submit failed");
      submittingRef.current = false;
    }
  }, [attemptId, token, answers, id, router]);

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
        if (activeQ && idx >= 0 && idx < 4) {
          setAnswers((prev) => ({ ...prev, [activeQ.id]: idx }));
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
        <div className="mx-auto max-w-4xl p-6">
          <Skeleton className="mb-4 h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ProtectedRoute>
    );
  }

  if (showInstructions && instructions) {
    return (
      <ProtectedRoute role="CANDIDATE">
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
          <Card className="max-w-lg w-full border-slate-200 bg-white/90 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 sm:text-2xl">{title} — Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 sm:text-base">{instructions}</p>
              <Button className="w-full bg-indigo--white hover:bg-indigo-750" onClick={() => setShowInstructions(false)}>
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
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge variant="outline" className="border-emerald-500/50 bg-emerald-950/20 text-emerald-400 gap-1 px-3 py-1">
          <CheckCircle2 className="h-3 w-3" /> {answeredCount} Answered
        </Badge>
        <Badge variant="outline" className="border-amber-500/50 bg-amber-950/20 text-amber-400 gap-1 px-3 py-1">
          <Flag className="h-3 w-3" /> {flaggedCount} Flagged
        </Badge>
        <Badge variant="outline" className="border-neutral-700 bg-slate-100 text-slate-700 gap-1 px-3 py-1">
          <HelpCircle className="h-3 w-3" /> {remainingCount} Unanswered
        </Badge>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold text-slate-600 mb-3 text-center uppercase tracking-wider">Question Review Grid</p>
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
                  "flex h-9 items-center justify-center rounded-lg text-xs font-medium border transition-all hover:scale-105",
                  isFlg
                    ? "bg-amber-950/30 text-amber-300 border-amber-500/40"
                    : isAns
                    ? "bg-emerald-950/30 text-emerald-300 border-emerald-800/40"
                    : "bg-white text-slate-600 border-slate-200"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-center text-slate-500 mt-2">Click a question number to jump to it directly.</p>
      </div>

      <Button onClick={submitQuiz} className="w-full bg-indigo--white font-semibold py-2.5 mt-2">
        Finish & Submit Exam
      </Button>
    </div>
  );

  return (
    <ProtectedRoute role="CANDIDATE">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 animate-fade-in">
        
        {/* Header Section */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl tracking-tight">{title}</h1>
            
            {/* Auto-save Status */}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
              <span className={cn(
                "h-2.5 w-2.5 rounded-full inline-block transition-colors duration-300",
                savingStatus === "saving" && "bg-amber-500 animate-pulse",
                savingStatus === "saved" && "bg-emerald-500",
                savingStatus === "error" && "bg-red-500 animate-ping",
                savingStatus === "idle" && "bg-neutral-600"
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
                "w-fit rounded-lg px-4 py-2 font-mono text-lg font-bold tabular-nums shadow-md border",
                timeLeft < 60
                  ? "bg-red-950/40 text-red-300 border-red-500/30 animate-pulse"
                  : "bg-indigo-950/40 text-indigo-300 border-indigo-500/20"
              )}
            >
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>

            {/* Quick Submit Button */}
            <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-slate-900 font-semibold shadow-md">
                  <Send className="h-4 w-4 mr-1.5" /> Submit
                </Button>
              </DialogTrigger>
              <DialogContent className="border-slate-200 bg-white shadow-2xl max-w-sm sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-center">Submit Quiz</DialogTitle>
                  <DialogDescription className="text-center text-slate-600">
                    Are you ready to submit your attempt? Here is your progress summary:
                  </DialogDescription>
                </DialogHeader>
                {renderSubmitSummary()}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mb-6 space-y-2 bg-white/40 border border-slate-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 sm:text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Completion Progress
            </span>
            <span>
              {answeredCount} of {totalQuestions} answered ({remainingCount} left)
            </span>
          </div>
          <div className="w-full bg-slate-100 border border-neutral-700/30 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_250px] lg:gap-6">
          
          {/* Main Question Card */}
          <Card className="order-2 animate-fade-in lg:order-1 border-slate-200 bg-white/40 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <CardHeader className="border-b border-slate-200/50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                  Question {current + 1} of {totalQuestions}
                </CardTitle>
                {flagged[q?.id] && (
                  <Badge className="bg-amber-950/60 text-amber-300 border border-amber-500/30 gap-1.5 px-2.5 py-0.5">
                    <Flag className="h-3 w-3 fill-amber-300" /> Flagged
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <p className="text-base leading-relaxed text-slate-900 sm:text-lg font-medium">{q?.text}</p>
              
              {/* Options list */}
              <div className="space-y-3">
                {q?.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswers({ ...answers, [q.id]: i })}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all sm:p-4 sm:text-base outline-none",
                      answers[q.id] === i
                        ? "border-indigo-500 bg-indigo--white font-medium ring-1 ring-indigo-500"
                        : "border-slate-200 text-slate-700 hover:border-indigo-500/50 hover:bg-slate-100/20"
                    )}
                  >
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                      answers[q.id] === i
                        ? "bg-indigo--white"
                        : "bg-white text-slate-600"
                    )}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

              {/* Card Actions Footer */}
              <div className="flex flex-col gap-2 pt-6 sm:flex-row sm:justify-between border-t border-slate-200/50">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-100">
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
                      className="w-full sm:w-auto text-slate-600 hover:text-slate-800 hover:bg-slate-50/50"
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
                      "w-full sm:w-auto gap-2 border-slate-200",
                      flagged[q?.id]
                        ? "border-amber-500/50 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Flag className={cn("h-4 w-4", flagged[q?.id] && "fill-amber-300")} />
                    {flagged[q?.id] ? "Flagged" : "Flag for Review"}
                  </Button>

                  {current < totalQuestions - 1 ? (
                    <Button
                      onClick={() => setCurrent((c) => c + 1)}
                      className={cn(
                        "w-full sm:w-auto font-semibold gap-1",
                        answers[q?.id] === undefined
                          ? "bg-slate-100 text-slate-700 border border-neutral-700 hover:bg-neutral-700"
                          : "bg-indigo--white"
                      )}
                    >
                      {answers[q?.id] === undefined ? "Skip Question" : "Next"}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-slate-900 font-semibold">
                          <Send className="h-4 w-4 mr-1" /> Submit Exam
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-slate-200 bg-white shadow-2xl max-w-sm sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold text-center">Submit Quiz</DialogTitle>
                          <DialogDescription className="text-center text-slate-600">
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
            <Card className="border-slate-200 bg-white/40 backdrop-blur-sm shadow-xl">
              <CardHeader className="pb-2 sm:pb-3 border-b border-slate-200/50">
                <CardTitle className="text-base font-bold text-slate-800">Question Palette</CardTitle>
                <CardDescription className="text-xs text-slate-600">Navigate between questions</CardDescription>
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
                          "relative flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold border transition-all duration-200 outline-none select-none",
                          isSel
                            ? "ring-2 ring-indigo-500 bg-indigo-950/40 text-indigo-200 border-transparent scale-105"
                            : isFlg
                            ? "bg-amber-950/20 text-amber-300 border-amber-500/30 hover:bg-amber-950/30"
                            : isAns
                            ? "bg-emerald-950/20 text-emerald-300 border-emerald-800/30 hover:bg-emerald-950/30"
                            : "bg-white/50 text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {i + 1}
                        
                        {/* Status dot indicator for flagged AND answered */}
                        {isAns && isFlg && (
                          <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Palette Legend */}
                <div className="mt-4 border-t border-slate-200/50 pt-3 flex flex-wrap gap-2 text-[10px] text-slate-600">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-white border border-slate-200" />
                    <span>Unvisited</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-emerald-950/20 border border-emerald-800/30" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-amber-950/20 border border-amber-500/30" />
                    <span>Review</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts Card */}
            <Card className="border-slate-200 bg-white/40 backdrop-blur-sm shadow-xl">
              <CardHeader className="pb-2 border-b border-slate-200/50">
                <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">Keyboard Controls</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between border-b border-slate-200/30 pb-1">
                    <span className="text-[11px]">Select Option</span>
                    <span className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-neutral-750 rounded text-[9px] font-mono text-slate-700">A-D</kbd>
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-neutral-750 rounded text-[9px] font-mono text-slate-700">1-4</kbd>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/30 pb-1">
                    <span className="text-[11px]">Next / Skip</span>
                    <span className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-neutral-750 rounded text-[9px] font-mono text-slate-700">N</kbd>
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-neutral-750 rounded text-[9px] font-mono text-slate-700">→</kbd>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/30 pb-1">
                    <span className="text-[11px]">Previous</span>
                    <span className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-neutral-750 rounded text-[9px] font-mono text-slate-700">P</kbd>
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-neutral-750 rounded text-[9px] font-mono text-slate-700">←</kbd>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/30 pb-1">
                    <span className="text-[11px]">Flag for Review</span>
                    <span className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-neutral-750 rounded text-[9px] font-mono text-slate-700">F</kbd>
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-neutral-750 rounded text-[9px] font-mono text-slate-700">R</kbd>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">Clear Selection</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-neutral-750 rounded text-[9px] font-mono text-slate-700">C</kbd>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
