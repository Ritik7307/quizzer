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
        String(fd.get("password"))
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
