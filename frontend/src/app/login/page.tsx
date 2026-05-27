"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const user = await login(String(fd.get("email")), String(fd.get("password")));
      toast.success("Welcome back!");
      router.push(user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8 sm:py-12 text-foreground">
      <Card className="w-full max-w-md animate-fade-in border border-border bg-card/45 backdrop-blur-md shadow-2xl rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-extrabold text-foreground">Sign in to Quizzer</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-foreground/80">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" className="bg-card border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold text-foreground/80">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-indigo-550 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required className="bg-card border-border text-foreground" />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-lg shadow-sm transition-transform active:scale-95 duration-200 mt-2" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-muted-foreground font-semibold">
            No account?{" "}
            <Link href="/signup" className="font-bold text-indigo-550 dark:text-indigo-400 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
