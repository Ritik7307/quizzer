"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
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

  useEffect(() => {
    if (!token || !id) return;
    api<{
      attempt: { id: string };
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

  useEffect(() => {
    if (!attemptId || !token) return;
    const save = setTimeout(() => {
      api(`/api/attempts/${attemptId}/progress`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ answers }),
      }).catch(() => {});
    }, 4000);
    return () => clearTimeout(save);
  }, [answers, attemptId, token]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const q = questions[current];

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
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>{title} — Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-neutral-300">{instructions}</p>
              <Button className="w-full" onClick={() => setShowInstructions(false)}>
                I understand, start quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute role="CANDIDATE">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-bold text-white sm:text-xl">{title}</h1>
          <div
            className={cn(
              "w-fit rounded-lg px-4 py-2 font-mono text-lg font-bold tabular-nums",
              timeLeft < 60 ? "bg-red-900/40 text-red-300" : "bg-violet-900/40 text-violet-300"
            )}
          >
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_220px] lg:gap-6">
          <Card className="order-2 animate-fade-in lg:order-1">
            <CardHeader>
              <CardTitle>
                Question {current + 1} of {questions.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-base leading-relaxed text-neutral-100 sm:text-lg">{q?.text}</p>
              <div className="space-y-3">
                {q?.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswers({ ...answers, [q.id]: i })}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all sm:p-4 sm:text-base",
                      answers[q.id] === i
                        ? "border-violet-500 bg-violet-950/40 text-white"
                        : "border-neutral-800 text-neutral-200 hover:border-violet-500/50"
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-between">
                <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="w-full sm:w-auto">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                {current < questions.length - 1 ? (
                  <Button onClick={() => setCurrent((c) => c + 1)} className="w-full sm:w-auto">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto">
                        <Send className="h-4 w-4" /> Submit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Submit quiz?</DialogTitle>
                        <DialogDescription>
                          You answered {Object.keys(answers).length} of {questions.length} questions.
                        </DialogDescription>
                      </DialogHeader>
                      <Button onClick={submitQuiz}>Confirm Submit</Button>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="order-1 h-fit lg:order-2 lg:sticky lg:top-20">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base">Question Palette</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-5 sm:gap-2 md:grid-cols-5">
                {questions.map((question, i) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setCurrent(i)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors sm:h-10 sm:w-10 sm:text-sm",
                      current === i && "ring-2 ring-violet-500",
                      answers[question.id] !== undefined
                        ? "bg-emerald-900/50 text-emerald-300"
                        : "bg-neutral-900 text-neutral-300",
                      current === i && "bg-violet-900/50 text-violet-200"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
