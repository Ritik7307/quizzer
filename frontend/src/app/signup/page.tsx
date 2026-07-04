"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const { register, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace(user.role === "ADMIN" ? "/admin" : "/dashboard");
    }
  }, [user, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const user = await register(
        String(fd.get("name")),
        String(fd.get("email")),
        String(fd.get("password")),
        String(fd.get("recoveryQuestion")),
        String(fd.get("recoveryAnswer")),
        String(fd.get("leetcodeHandle")),
        String(fd.get("codeforcesHandle"))
      );
      toast.success("Account created!");
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
          <CardTitle className="text-xl font-extrabold text-foreground">Create your account</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Anyone can register with any email. You join as a <strong className="text-indigo-650 dark:text-indigo-400 font-bold">candidate</strong> automatically.
            Only emails listed in the server <code className="text-[10px] bg-muted px-1 py-0.5 rounded border border-border font-mono">ADMIN_EMAILS</code> setting get admin access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold text-foreground/80">Full name</Label>
              <Input id="name" name="name" required placeholder="Jane Doe" className="bg-card border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-foreground/80">Email</Label>
              <Input id="email" name="email" type="email" required className="bg-card border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold text-foreground/80">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} className="bg-card border-border text-foreground" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leetcodeHandle" className="text-xs font-bold text-foreground/80">LeetCode Username</Label>
                <Input id="leetcodeHandle" name="leetcodeHandle" required placeholder="leetcode_user" className="bg-card border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codeforcesHandle" className="text-xs font-bold text-foreground/80">Codeforces Username</Label>
                <Input id="codeforcesHandle" name="codeforcesHandle" required placeholder="cf_user" className="bg-card border-border text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recoveryQuestion" className="text-xs font-bold text-foreground/80">Recovery Question</Label>
              <select
                id="recoveryQuestion"
                name="recoveryQuestion"
                required
                defaultValue=""
                className="flex h-10 w-full min-h-10 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 sm:text-sm"
              >
                <option value="" disabled className="text-muted-foreground/60">Select a security question</option>
                <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                <option value="In which city were you born?">In which city were you born?</option>
                <option value="What was the make of your first car?">What was the make of your first car?</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recoveryAnswer" className="text-xs font-bold text-foreground/80">Recovery Answer</Label>
              <Input id="recoveryAnswer" name="recoveryAnswer" required placeholder="Your answer (case-insensitive)" className="bg-card border-border text-foreground" />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-lg shadow-sm transition-transform active:scale-95 duration-200 mt-2" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-muted-foreground font-semibold">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-indigo-550 dark:text-indigo-400 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
