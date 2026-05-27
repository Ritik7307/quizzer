"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [recoveryQuestion, setRecoveryQuestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Request recovery question for the given email
  async function handleGetQuestion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api<{ question: string }>("/api/auth/recovery-question", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setRecoveryQuestion(data.question);
      toast.success("Security question loaded!");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Answer the question and reset the password
  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const recoveryAnswer = String(fd.get("recoveryAnswer"));
    const newPassword = String(fd.get("newPassword"));
    const confirmPassword = String(fd.get("confirmPassword"));

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email,
          recoveryAnswer,
          newPassword,
        }),
      });
      toast.success("Password reset successful! You can now log in.");
      router.push("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8 sm:py-12">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader>
          <CardTitle>Recover Password</CardTitle>
          <CardDescription>
            {!recoveryQuestion
              ? "Enter your email to retrieve your security question"
              : "Answer your security question to set a new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!recoveryQuestion ? (
            /* Step 1: Input Email */
            <form onSubmit={handleGetQuestion} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading Question..." : "Retrieve Security Question"}
              </Button>
            </form>
          ) : (
            /* Step 2: Answer question & reset password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Security Question</p>
                <p className="mt-1 text-sm font-medium text-neutral-100">{recoveryQuestion}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recoveryAnswer">Your Answer</Label>
                <Input
                  id="recoveryAnswer"
                  name="recoveryAnswer"
                  required
                  placeholder="Enter your security answer"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="Repeat new password"
                  minLength={6}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/3"
                  onClick={() => setRecoveryQuestion(null)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" className="w-2/3 animate-pulse-slow" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-neutral-500">
            Remembered your password?{" "}
            <Link href="/login" className="font-medium text-indigo-400 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
