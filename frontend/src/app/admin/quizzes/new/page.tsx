"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";

export default function NewQuizPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const { quiz } = await api<{ quiz: { id: string } }>("/api/quizzes", {
        method: "POST",
        token,
        body: JSON.stringify({
          title: fd.get("title"),
          description: fd.get("description"),
          instructions: fd.get("instructions"),
          duration: Number(fd.get("duration")),
          published: false,
        }),
      });
      toast.success("Quiz created");
      router.push(`/admin/quizzes/${quiz.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create quiz");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute role="ADMIN">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea id="instructions" name="instructions" rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" name="duration" type="number" min={1} max={600} defaultValue={15} required />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create & Add Questions"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
