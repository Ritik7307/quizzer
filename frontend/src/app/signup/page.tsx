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

export default function SignupPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
        String(fd.get("recoveryAnswer"))
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
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8 sm:py-12">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Anyone can register with any email. You join as a <strong>candidate</strong> automatically.
            Only emails listed in the server <code className="text-xs">ADMIN_EMAILS</code> setting get admin access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recoveryQuestion">Recovery Question</Label>
              <select
                id="recoveryQuestion"
                name="recoveryQuestion"
                required
                defaultValue=""
                className="flex h-11 w-full min-h-11 rounded-lg border border-neutral-800 bg-black px-3 py-2 text-base text-neutral-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:h-10 sm:text-sm"
              >
                <option value="" disabled>Select a security question</option>
                <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                <option value="In which city were you born?">In which city were you born?</option>
                <option value="What was the make of your first car?">What was the make of your first car?</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recoveryAnswer">Recovery Answer</Label>
              <Input id="recoveryAnswer" name="recoveryAnswer" required placeholder="Your answer (case-insensitive)" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-violet-400 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
