"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Play, Send, Loader2, Code, ArrowLeft, Terminal, CheckCircle2, AlertCircle, Lock, ExternalLink, HelpCircle } from "lucide-react";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface QuestionDetails {
  id: string;
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  difficulty: string;
  referenceUrl?: string | null;
  editorial?: string | null;
  isEditorialLocked?: boolean;
}

const templates: Record<string, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input, process logic, and print output\n    int a, b;\n    if (cin >> a >> b) {\n        cout << (a + b) << endl;\n    }\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Read input, process logic, and print output\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) {\n        printf("%d\\n", a + b);\n    }\n    return 0;\n}`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Read input, process logic, and print output\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int a = sc.nextInt();\n            int b = sc.nextInt();\n            System.out.println(a + b);\n        }\n    }\n}`,
};

export default function CodingWorkspacePage() {
  const { id } = useParams();
  const router = useRouter();
  const { token, refresh: refreshUser } = useAuth();
  const { resolvedTheme } = useTheme();

  const [question, setQuestion] = useState<QuestionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Left Panel tabs
  const [activeTab, setActiveTab] = useState<"problem" | "editorial">("problem");

  // Code editor states
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("");
  const [customInput, setCustomInput] = useState("");

  // Output terminal states
  const [terminalOutput, setTerminalOutput] = useState("");
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Track if user changed code manually, to prevent template overwrite
  const userEditedCode = useRef<Record<string, boolean>>({});

  const loadQuestion = useCallback((initCode = false) => {
    if (!token) return;
    api<{ question: QuestionDetails }>(`/api/coding/questions/${id}`, { token })
      .then((data) => {
        setQuestion(data.question);
        if (initCode) {
          setCode(templates.cpp);
        }
        setCustomInput(data.question.sampleInput);
      })
      .catch((err) => {
        toast.error("Failed to load question: " + getApiErrorMessage(err));
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [id, token, router]);

  useEffect(() => {
    loadQuestion(true);
  }, [loadQuestion]);

  // Update code editor text based on language template selection
  const handleLanguageChange = (newLang: string) => {
    userEditedCode.current[language] = true;
    setLanguage(newLang);
    setCode(templates[newLang]);
  };

  async function handleRunCode() {
    setRunning(true);
    setTerminalOutput("Compiling and executing code...");
    setRunStatus(null);
    setErrorDetails(null);

    try {
      const res = await api<{ status: string; output: string; errorDetails?: string }>(
        `/api/coding/questions/${id}/run`,
        {
          method: "POST",
          body: JSON.stringify({ code, language, stdin: customInput }),
          token,
        }
      );

      setRunStatus(res.status);
      if (res.status === "Accepted") {
        setTerminalOutput(res.output || "Program executed successfully with no output.");
      } else {
        setTerminalOutput(res.output || "Execution failed");
        setErrorDetails(res.errorDetails || "No further details available");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setTerminalOutput("An internal execution error occurred.");
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmitCode() {
    setSubmitting(true);
    setTerminalOutput("Running test cases...");
    setRunStatus(null);
    setErrorDetails(null);

    try {
      const res = await api<{
        status: string;
        passedCount: number;
        totalCount: number;
        errorDetails?: string;
      }>(`/api/coding/questions/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ code, language }),
        token,
      });

      setRunStatus(res.status);
      if (res.status === "Accepted") {
        setTerminalOutput(`🎉 All Test Cases Passed (${res.passedCount}/${res.totalCount})!`);
        const ptsAwarded = (res as any).pointsAwarded ?? 0;
        const currentStr = (res as any).currentStreak ?? 0;
        if (ptsAwarded > 0) {
          toast.success(`Accepted! Perfect score! +${ptsAwarded} points earned. Active Days: ${currentStr}`);
        } else {
          toast.success(`Accepted! Perfect score! Active Days: ${currentStr}`);
        }
        // Refresh question data to unlock the Editorial Solution
        loadQuestion(false);
        // Refresh user context to update header stats
        refreshUser().catch((e) => console.error("Failed to refresh user stats:", e));
      } else {
        setTerminalOutput(`❌ Failed: ${res.status} (${res.passedCount}/${res.totalCount} test cases passed)`);
        setErrorDetails(res.errorDetails || "Review your logic and edge cases.");
        toast.error(`Submission result: ${res.status}`);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setTerminalOutput("An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2.5">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold text-muted-foreground">Loading IDE Workspace...</p>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-background text-foreground">
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/dashboard" className="flex items-center gap-1.5 font-semibold">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-foreground leading-none">{question.title}</h1>
            <Badge
              className={
                question.difficulty === "Easy"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-bold"
                  : question.difficulty === "Medium"
                  ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-450 border border-yellow-500/20 font-bold"
                  : "bg-red-500/10 text-red-655 dark:text-red-400 border border-red-500/20 font-bold"
              }
            >
              {question.difficulty}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 font-semibold"
          >
            <option value="cpp">C++ (GCC)</option>
            <option value="c">C (GCC)</option>
            <option value="java">Java (JDK)</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRunCode}
            disabled={running || submitting}
            className="flex items-center gap-1.5 text-xs rounded-lg"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            Run Code
          </Button>

          <Button
            size="sm"
            onClick={handleSubmitCode}
            disabled={running || submitting}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-755 font-bold rounded-lg shadow-sm"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 fill-current" />}
            Submit
          </Button>
        </div>
      </div>

      {/* Main Workspace Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden h-[calc(100vh-6.5rem)]">
        
        {/* Left Panel: Problem description & Editorial */}
        <div className="overflow-y-auto border-r border-border flex flex-col h-full bg-card/45 backdrop-blur-sm">
          
          {/* Tabs header */}
          <div className="flex border-b border-border bg-card px-4 py-2 gap-4">
            <button
              onClick={() => setActiveTab("problem")}
              className={cn(
                "text-xs font-extrabold uppercase tracking-wider pb-1.5 outline-none select-none border-b-2 transition-all",
                activeTab === "problem"
                  ? "text-indigo-650 dark:text-indigo-400 border-indigo-505"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              Problem Description
            </button>
            <button
              onClick={() => setActiveTab("editorial")}
              className={cn(
                "text-xs font-extrabold uppercase tracking-wider pb-1.5 outline-none select-none border-b-2 transition-all flex items-center gap-1",
                activeTab === "editorial"
                  ? "text-indigo-655 dark:text-indigo-400 border-indigo-505"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {question.isEditorialLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />}
              Editorial Solution
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "problem" ? (
              <>
                {/* Reference Link if present */}
                {question.referenceUrl && (
                  <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider block">Practice Source</span>
                      <p className="text-xs text-foreground/80 mt-1">Solve or review on the original platform.</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="rounded-lg">
                      <a href={question.referenceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-extrabold">
                        <ExternalLink className="h-3.5 w-3.5" /> View Original
                      </a>
                    </Button>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-bold text-foreground leading-snug">{question.title}</h2>
                  <div className="mt-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {question.description}
                  </div>
                </div>

                {(question.inputFormat || question.outputFormat || question.constraints) && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    {question.inputFormat && (
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Input Format</h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{question.inputFormat}</p>
                      </div>
                    )}
                    {question.outputFormat && (
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Output Format</h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{question.outputFormat}</p>
                      </div>
                    )}
                    {question.constraints && (
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Constraints</h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed font-mono whitespace-pre-wrap bg-muted/20 p-2.5 rounded-lg border border-border/40">{question.constraints}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Sample Cases */}
                {question.sampleInput && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-sm font-bold text-foreground">Sample Test Case</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-widest block">Sample Input</span>
                        <pre className="mt-1.5 rounded-xl border border-border bg-card p-3 font-mono text-xs text-foreground/90 overflow-x-auto whitespace-pre shadow-inner">
                          {question.sampleInput}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-widest block">Sample Output</span>
                        <pre className="mt-1.5 rounded-xl border border-border bg-card p-3 font-mono text-xs text-foreground/90 overflow-x-auto whitespace-pre shadow-inner">
                          {question.sampleOutput}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Editorial View
              <div>
                {question.isEditorialLocked ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-card/25 border border-border rounded-2xl px-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-550 border border-amber-500/20 shadow-sm animate-pulse">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <h3 className="text-base font-bold text-foreground">Editorial is Locked</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        To maintain competitive integrity, you must solve this problem and receive an <span className="text-emerald-500 font-bold">Accepted</span> submission before reading the editorial explanation.
                      </p>
                    </div>
                  </div>
                ) : question.editorial ? (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-foreground">Editorial & Solution Explanation</h2>
                    <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans bg-card/45 border border-border p-4.5 rounded-2xl shadow-sm">
                      {question.editorial}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-muted-foreground">
                    <HelpCircle className="h-8 w-8 text-muted-foreground/60" />
                    <h3 className="text-sm font-semibold">No Editorial Available</h3>
                    <p className="text-xs text-muted-foreground/80">The admin hasn't provided an editorial explanation for this question yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Editor and Terminal */}
        <div className="flex flex-col overflow-hidden bg-card">
          {/* Editor Header */}
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-2 bg-card">
            <Code className="h-4 w-4 text-indigo-550 dark:text-indigo-400" />
            <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Source Editor</span>
          </div>

          {/* Editor Container */}
          <div className="flex-1 min-h-[220px] relative">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language === "c" ? "c" : "java"}
              theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                scrollbar: {
                  vertical: "visible",
                  horizontal: "visible",
                },
                lineNumbers: "on",
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                cursorStyle: "line",
              }}
              loading={
                <div className="flex h-full items-center justify-center bg-card text-sm text-muted-foreground font-semibold">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
                  Loading Code Editor...
                </div>
              }
            />
          </div>

          {/* Stdin / Output Terminal Panels */}
          <div className="border-t border-border h-64 flex flex-col bg-card">
            {/* Console Tabs */}
            <div className="flex items-center justify-between border-b border-border bg-card px-3.5 py-1.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Execution Console</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 overflow-hidden">
              {/* Custom Input */}
              <div className="flex flex-col border-r border-border p-3 overflow-hidden">
                <Label htmlFor="customInput" className="text-[10px] uppercase font-extrabold text-muted-foreground mb-1.5">
                  Standard Input (Stdin)
                </Label>
                <textarea
                  id="customInput"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 resize-none w-full rounded-lg border border-border bg-muted/20 p-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground/60"
                  placeholder="Input variables here..."
                />
              </div>

              {/* Run Terminal Output */}
              <div className="flex flex-col p-3 overflow-hidden bg-muted/10">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-extrabold text-muted-foreground">
                    Execution Output
                  </span>

                  {runStatus && (
                    <div className="flex items-center gap-1">
                      {runStatus === "Accepted" ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 shadow-sm">
                          <CheckCircle2 className="h-3 w-3" />
                          Accepted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 shadow-sm">
                          <AlertCircle className="h-3 w-3" />
                          {runStatus}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-2.5 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap shadow-inner">
                  {terminalOutput}
                  {errorDetails && (
                    <div className="mt-2 text-red-500 dark:text-red-450 border-t border-border pt-2 text-[11px] leading-relaxed">
                      <p className="font-bold uppercase tracking-wider text-[9px] text-red-600">Error Details</p>
                      {errorDetails}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
