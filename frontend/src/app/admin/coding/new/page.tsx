"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Code, Loader2, Plus } from "lucide-react";

export default function AdminNewCodingQuestionPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const defaultTestCases = JSON.stringify(
    [
      {
        input: "5 7\n",
        output: "12\n",
      },
      {
        input: "10 -3\n",
        output: "7\n",
      },
    ],
    null,
    2
  );

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [description, setDescription] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [constraints, setConstraints] = useState("");
  const [sampleInput, setSampleInput] = useState("");
  const [sampleOutput, setSampleOutput] = useState("");
  const [testCasesJson, setTestCasesJson] = useState(defaultTestCases);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [editorial, setEditorial] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    // Validate test cases JSON structure
    try {
      const parsed = JSON.parse(testCasesJson);
      if (!Array.isArray(parsed)) {
        throw new Error("Test cases must be a JSON array");
      }
      if (!parsed.every((tc) => typeof tc.input === "string" && typeof tc.output === "string")) {
        throw new Error("Each test case must have an 'input' string and an 'output' string");
      }
    } catch (err: any) {
      toast.error("Invalid Test Cases format: " + err.message);
      return;
    }

    // Validate URL if present
    if (referenceUrl.trim()) {
      try {
        new URL(referenceUrl.trim());
      } catch {
        toast.error("Please enter a valid Reference URL");
        return;
      }
    }

    setSubmitting(true);
    try {
      await api("/api/coding/admin/questions", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          inputFormat: inputFormat.trim(),
          outputFormat: outputFormat.trim(),
          constraints: constraints.trim(),
          sampleInput: sampleInput.trim(),
          sampleOutput: sampleOutput.trim(),
          testCases: testCasesJson.trim(),
          difficulty,
          referenceUrl: referenceUrl.trim() || null,
          editorial: editorial.trim() || null,
        }),
        token,
      });

      toast.success("Coding question created successfully!");
      router.push("/admin");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 animate-fade-in">
      <Card className="border-neutral-800 bg-neutral-950/40 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
              <Code className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Add Coding Question</CardTitle>
              <CardDescription>
                Create a new programming problem for candidates to solve and practice.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Title */}
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="title">Problem Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Sum of Two Numbers"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="flex h-11 w-full min-h-11 rounded-lg border border-neutral-800 bg-black px-3 py-2 text-base text-neutral-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:h-10 sm:text-sm"
                >
                  <option value="Easy">🟢 Easy</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Hard">🔴 Hard</option>
                </select>
              </div>
            </div>

            {/* Reference URL */}
            <div className="space-y-2">
              <Label htmlFor="referenceUrl">Reference Question URL (LeetCode / Codeforces) — Optional</Label>
              <Input
                id="referenceUrl"
                type="url"
                placeholder="e.g. https://leetcode.com/problems/two-sum/ or https://codeforces.com/problemset/problem/..."
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                className="bg-black border-neutral-800 text-neutral-100 focus-visible:ring-2 focus-visible:ring-violet-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Problem Statement</Label>
              <Textarea
                id="description"
                placeholder="Describe the problem, requirements, logic, and output constraints..."
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="bg-black border-neutral-800 text-neutral-100 focus-visible:ring-2 focus-visible:ring-violet-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Input Format */}
              <div className="space-y-2">
                <Label htmlFor="inputFormat">Input Format</Label>
                <Textarea
                  id="inputFormat"
                  placeholder="e.g. Two space-separated integers, a and b."
                  rows={3}
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  className="bg-black border-neutral-800 text-neutral-100 focus-visible:ring-2 focus-visible:ring-violet-500"
                />
              </div>

              {/* Output Format */}
              <div className="space-y-2">
                <Label htmlFor="outputFormat">Output Format</Label>
                <Textarea
                  id="outputFormat"
                  placeholder="e.g. Print a single integer representing the sum."
                  rows={3}
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="bg-black border-neutral-800 text-neutral-100 focus-visible:ring-2 focus-visible:ring-violet-500"
                />
              </div>
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <Label htmlFor="constraints">Constraints</Label>
              <Textarea
                id="constraints"
                placeholder="e.g. 1 <= N <= 10^5, Time Limit: 1.0s, Memory Limit: 256MB"
                rows={3}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                className="bg-black border-neutral-800 text-neutral-100 focus-visible:ring-2 focus-visible:ring-violet-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Sample Input */}
              <div className="space-y-2">
                <Label htmlFor="sampleInput">Sample Input</Label>
                <Textarea
                  id="sampleInput"
                  placeholder="5 7"
                  rows={3}
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  className="bg-black border-neutral-800 text-neutral-100 font-mono focus-visible:ring-2 focus-visible:ring-violet-500"
                />
              </div>

              {/* Sample Output */}
              <div className="space-y-2">
                <Label htmlFor="sampleOutput">Sample Output</Label>
                <Textarea
                  id="sampleOutput"
                  placeholder="12"
                  rows={3}
                  value={sampleOutput}
                  onChange={(e) => setSampleOutput(e.target.value)}
                  className="bg-black border-neutral-800 text-neutral-100 font-mono focus-visible:ring-2 focus-visible:ring-violet-500"
                />
              </div>
            </div>

            {/* Test Cases */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="testCases">Test Cases (JSON Format)</Label>
                <span className="text-[10px] text-neutral-500 font-mono">[{`{input: string, output: string}`}...]</span>
              </div>
              <Textarea
                id="testCases"
                rows={6}
                value={testCasesJson}
                onChange={(e) => setTestCasesJson(e.target.value)}
                required
                className="bg-black border-neutral-800 text-neutral-100 font-mono text-xs leading-relaxed focus-visible:ring-2 focus-visible:ring-violet-500"
              />
            </div>

            {/* Editorial Solution */}
            <div className="space-y-2">
              <Label htmlFor="editorial">Editorial / Solution Explanation (Markdown/Text) — Optional</Label>
              <Textarea
                id="editorial"
                placeholder="Provide a detailed explanation of the solution, algorithm approach, and the solution code..."
                rows={6}
                value={editorial}
                onChange={(e) => setEditorial(e.target.value)}
                className="bg-black border-neutral-800 text-neutral-100 focus-visible:ring-2 focus-visible:ring-violet-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-1/3 border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="w-2/3 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-750 text-white font-semibold">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating question...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Question
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
