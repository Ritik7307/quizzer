"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Code, Loader2, Save } from "lucide-react";

export default function AdminEditCodingQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [description, setDescription] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [constraints, setConstraints] = useState("");
  const [topic, setTopic] = useState("General");
  const [sampleInput, setSampleInput] = useState("");
  const [sampleOutput, setSampleOutput] = useState("");
  const [testCasesJson, setTestCasesJson] = useState("[]");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [editorial, setEditorial] = useState("");
  const [isExternalOnly, setIsExternalOnly] = useState(false);
  
  const [defaultCodeCpp, setDefaultCodeCpp] = useState("");
  const [driverCodeCpp, setDriverCodeCpp] = useState("");
  const [defaultCodePython, setDefaultCodePython] = useState("");
  const [driverCodePython, setDriverCodePython] = useState("");

  useEffect(() => {
    if (!token) return;
    api<any>(`/api/coding/questions/${id}`, { token })
      .then((data) => {
        const q = data.question;
        setTitle(q.title || "");
        setDifficulty(q.difficulty || "Easy");
        setDescription(q.description || "");
        setInputFormat(q.inputFormat || "");
        setOutputFormat(q.outputFormat || "");
        setConstraints(q.constraints || "");
        setTopic(q.topic || "General");
        setSampleInput(q.sampleInput || "");
        setSampleOutput(q.sampleOutput || "");
        setTestCasesJson(q.testCases || "[]");
        setReferenceUrl(q.referenceUrl || "");
        setEditorial(q.editorial || "");
        setIsExternalOnly(q.isExternalOnly || false);
        setDefaultCodeCpp(q.defaultCodeCpp || "");
        setDriverCodeCpp(q.driverCodeCpp || "");
        setDefaultCodePython(q.defaultCodePython || "");
        setDriverCodePython(q.driverCodePython || "");
      })
      .catch((err) => {
        toast.error("Failed to load question");
        router.push("/admin");
      })
      .finally(() => setLoading(false));
  }, [id, token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    let finalDescription = description.trim();
    let finalTestCases = testCasesJson.trim();

    if (isExternalOnly) {
      if (!referenceUrl.trim()) {
        toast.error("Reference URL is required for external-only questions");
        return;
      }
      if (!finalDescription) {
        finalDescription = "Solve this question on the external platform using the link provided.";
      }
      finalTestCases = "[]";
    } else {
      if (!finalDescription) {
        toast.error("Description is required");
        return;
      }
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
    }

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
      await api(`/api/coding/admin/questions/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: title.trim(),
          description: finalDescription,
          inputFormat: isExternalOnly ? "" : inputFormat.trim(),
          outputFormat: isExternalOnly ? "" : outputFormat.trim(),
          constraints: isExternalOnly ? "" : constraints.trim(),
          sampleInput: isExternalOnly ? "" : sampleInput.trim(),
          sampleOutput: isExternalOnly ? "" : sampleOutput.trim(),
          testCases: finalTestCases,
          difficulty,
          topic,
          referenceUrl: referenceUrl.trim() || null,
          editorial: editorial.trim() || null,
          isExternalOnly,
          defaultCodeCpp: defaultCodeCpp.trim() || undefined,
          driverCodeCpp: driverCodeCpp.trim() || undefined,
          defaultCodePython: defaultCodePython.trim() || undefined,
          driverCodePython: driverCodePython.trim() || undefined,
        }),
        token,
      });

      toast.success("Coding question updated successfully!");
      router.push("/admin");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-12 text-center">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 animate-fade-in">
      <Card className="border-slate-200 bg-white/40 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
              <Code className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Edit Coding Question</CardTitle>
              <CardDescription>
                Update problem statements, test cases, and hidden driver code.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Problem Title</Label>
              <Input
                id="title"
                placeholder="e.g. Sum of Two Numbers"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="flex h-11 w-full min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:h-10 sm:text-sm"
                >
                  <option value="Easy">🟢 Easy</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Hard">🔴 Hard</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">Topic / Category</Label>
                <select
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="flex h-11 w-full min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:h-10 sm:text-sm"
                >
                  <option value="Arrays">Arrays</option>
                  <option value="Strings">Strings</option>
                  <option value="Linked Lists">Linked Lists</option>
                  <option value="Stacks & Queues">Stacks & Queues</option>
                  <option value="Trees">Trees</option>
                  <option value="Graphs">Graphs</option>
                  <option value="Dynamic Programming">Dynamic Programming</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-slate-200 bg-white/60 p-4">
              <input
                id="isExternalOnly"
                type="checkbox"
                checked={isExternalOnly}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsExternalOnly(checked);
                }}
                className="h-4 w-4 rounded border-slate-200 bg-white text-indigo-600 focus:ring-indigo-500 focus:ring-offset-black"
              />
              <div className="space-y-0.5">
                <Label htmlFor="isExternalOnly" className="text-sm font-semibold text-slate-800 cursor-pointer">
                  External-Only Problem (Solved on LeetCode / Codeforces)
                </Label>
                <p className="text-[11px] text-slate-500">
                  Checking this disables the inline compiler workspace. Candidates will solve the question on the external site.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceUrl">Reference Question URL {isExternalOnly ? "— Required" : "— Optional"}</Label>
              <Input
                id="referenceUrl"
                type="url"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                required={isExternalOnly}
                className="bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Problem Statement</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            {!isExternalOnly && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="inputFormat">Input Format</Label>
                    <Textarea
                      id="inputFormat"
                      rows={3}
                      value={inputFormat}
                      onChange={(e) => setInputFormat(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outputFormat">Output Format</Label>
                    <Textarea
                      id="outputFormat"
                      rows={3}
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="constraints">Constraints</Label>
                  <Textarea
                    id="constraints"
                    rows={3}
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sampleInput">Sample Input</Label>
                    <Textarea
                      id="sampleInput"
                      rows={3}
                      value={sampleInput}
                      onChange={(e) => setSampleInput(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 font-mono focus-visible:ring-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sampleOutput">Sample Output</Label>
                    <Textarea
                      id="sampleOutput"
                      rows={3}
                      value={sampleOutput}
                      onChange={(e) => setSampleOutput(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 font-mono focus-visible:ring-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="testCases">Test Cases (JSON Format)</Label>
                    <span className="text-[10px] text-slate-500 font-mono">[{`{input: string, output: string}`}...]</span>
                  </div>
                  <Textarea
                    id="testCases"
                    rows={6}
                    value={testCasesJson}
                    onChange={(e) => setTestCasesJson(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-200 text-slate-900 font-mono text-xs leading-relaxed focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultCodeCpp">Default Boilerplate Code (C++)</Label>
                  <Textarea
                    id="defaultCodeCpp"
                    placeholder="class Solution { ... }"
                    rows={4}
                    value={defaultCodeCpp}
                    onChange={(e) => setDefaultCodeCpp(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 font-mono focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="driverCodeCpp">Hidden Driver Code (C++)</Label>
                    <span className="text-[10px] text-slate-500">Includes main() and parsing</span>
                  </div>
                  <Textarea
                    id="driverCodeCpp"
                    placeholder="int main() { ... }"
                    rows={8}
                    value={driverCodeCpp}
                    onChange={(e) => setDriverCodeCpp(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 font-mono text-xs leading-relaxed focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultCodePython">Default Boilerplate Code (Python)</Label>
                  <Textarea
                    id="defaultCodePython"
                    placeholder="def solve(): ..."
                    rows={4}
                    value={defaultCodePython}
                    onChange={(e) => setDefaultCodePython(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 font-mono focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="driverCodePython">Hidden Driver Code (Python)</Label>
                    <span className="text-[10px] text-slate-500">Appended to user code</span>
                  </div>
                  <Textarea
                    id="driverCodePython"
                    placeholder="if __name__ == '__main__': ..."
                    rows={8}
                    value={driverCodePython}
                    onChange={(e) => setDriverCodePython(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 font-mono text-xs leading-relaxed focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-1/3 border-slate-200 text-slate-700 hover:bg-slate-100"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="w-2/3 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
