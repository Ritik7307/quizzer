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
  const { token } = useAuth();

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
        toast.success("Accepted! Perfect score!");
        // Refresh question data to unlock the Editorial Solution
        loadQuestion(false);
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
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-neutral-400">Loading IDE Workspace...</p>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-black text-neutral-100">
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 bg-neutral-950">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-neutral-400 hover:text-white">
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">{question.title}</h1>
            <Badge
              className={
                question.difficulty === "Easy"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : question.difficulty === "Medium"
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
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
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 font-medium"
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
            className="flex items-center gap-1.5 text-xs border-neutral-750 text-neutral-300 hover:bg-neutral-850"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run Code
          </Button>

          <Button
            size="sm"
            onClick={handleSubmitCode}
            disabled={running || submitting}
            className="flex items-center gap-1.5 text-xs bg-violet-600 text-white hover:bg-violet-750 font-semibold"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit
          </Button>
        </div>
      </div>

      {/* Main Workspace Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden h-[calc(100vh-6.5rem)]">
        
        {/* Left Panel: Problem description & Editorial */}
        <div className="overflow-y-auto border-r border-neutral-800 flex flex-col h-full bg-neutral-950/20">
          
          {/* Tabs header */}
          <div className="flex border-b border-neutral-900 bg-neutral-950 px-4 py-2 gap-4">
            <button
              onClick={() => setActiveTab("problem")}
              className={cn(
                "text-xs font-bold uppercase tracking-wider pb-1.5 outline-none select-none border-b-2 transition-all",
                activeTab === "problem"
                  ? "text-violet-400 border-violet-500"
                  : "text-neutral-500 border-transparent hover:text-neutral-300"
              )}
            >
              Problem Description
            </button>
            <button
              onClick={() => setActiveTab("editorial")}
              className={cn(
                "text-xs font-bold uppercase tracking-wider pb-1.5 outline-none select-none border-b-2 transition-all flex items-center gap-1",
                activeTab === "editorial"
                  ? "text-violet-400 border-violet-500"
                  : "text-neutral-500 border-transparent hover:text-neutral-300"
              )}
            >
              {question.isEditorialLocked && <Lock className="h-3.5 w-3.5 text-neutral-500" />}
              Editorial Solution
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "problem" ? (
              <>
                {/* Reference Link if present */}
                {question.referenceUrl && (
                  <div className="rounded-xl bg-neutral-900/60 border border-neutral-800 p-4 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-neutral-400 tracking-wider">Practice Source</span>
                      <p className="text-xs text-neutral-300 mt-0.5">Solve or review on the original platform.</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-neutral-750 text-neutral-300 hover:bg-neutral-850 hover:text-white">
                      <a href={question.referenceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold">
                        <ExternalLink className="h-3.5 w-3.5" /> View Original
                      </a>
                    </Button>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-bold text-neutral-100">{question.title}</h2>
                  <div className="mt-3 text-sm leading-relaxed text-neutral-300 whitespace-pre-wrap">
                    {question.description}
                  </div>
                </div>

                {(question.inputFormat || question.outputFormat || question.constraints) && (
                  <div className="space-y-4 pt-4 border-t border-neutral-900">
                    {question.inputFormat && (
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-200">Input Format</h3>
                        <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{question.inputFormat}</p>
                      </div>
                    )}
                    {question.outputFormat && (
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-200">Output Format</h3>
                        <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{question.outputFormat}</p>
                      </div>
                    )}
                    {question.constraints && (
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-200">Constraints</h3>
                        <p className="mt-1 text-xs text-neutral-450 leading-relaxed font-mono whitespace-pre-wrap">{question.constraints}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Sample Cases */}
                {question.sampleInput && (
                  <div className="space-y-4 pt-4 border-t border-neutral-900">
                    <h3 className="text-sm font-semibold text-neutral-200">Sample Test Case</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-neutral-500">Sample Input</span>
                        <pre className="mt-1 rounded-lg border border-neutral-850 bg-neutral-950/60 p-3 font-mono text-xs text-neutral-300 overflow-x-auto whitespace-pre">
                          {question.sampleInput}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-neutral-500">Sample Output</span>
                        <pre className="mt-1 rounded-lg border border-neutral-850 bg-neutral-950/60 p-3 font-mono text-xs text-neutral-300 overflow-x-auto whitespace-pre">
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
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-neutral-900/20 border border-neutral-900 rounded-xl px-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-950/30 text-amber-500 border border-amber-500/20">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <h3 className="text-base font-bold text-neutral-100">Editorial is Locked</h3>
                      <p className="text-xs text-neutral-450 leading-relaxed">
                        To maintain competitive integrity, you must solve this problem and receive an <span className="text-emerald-400 font-semibold">Accepted</span> submission before reading the editorial explanation.
                      </p>
                    </div>
                  </div>
                ) : question.editorial ? (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-neutral-100">Editorial & Solution Explanation</h2>
                    <div className="text-sm leading-relaxed text-neutral-305 whitespace-pre-wrap font-sans bg-neutral-900/30 border border-neutral-900 p-4 rounded-xl shadow-md">
                      {question.editorial}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-neutral-400">
                    <HelpCircle className="h-8 w-8 text-neutral-600" />
                    <h3 className="text-sm font-semibold">No Editorial Available</h3>
                    <p className="text-xs text-neutral-500">The admin hasn't provided an editorial explanation for this question yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Editor and Terminal */}
        <div className="flex flex-col overflow-hidden bg-neutral-950">
          {/* Editor Header */}
          <div className="flex items-center gap-1.5 border-b border-neutral-900 px-4 py-2 bg-neutral-950/80">
            <Code className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">Source Editor</span>
          </div>

          {/* Editor Container */}
          <div className="flex-1 min-h-[220px] relative">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language === "c" ? "c" : "java"}
              theme="vs-dark"
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
                <div className="flex h-full items-center justify-center bg-black text-sm text-neutral-400">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-500 mr-2" />
                  Loading Code Editor...
                </div>
              }
            />
          </div>

          {/* Stdin / Output Terminal Panels */}
          <div className="border-t border-neutral-900 h-64 flex flex-col bg-neutral-950">
            {/* Console Tabs */}
            <div className="flex items-center justify-between border-b border-neutral-900 bg-neutral-950 px-2 py-1">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-neutral-500" />
                <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400">Execution Console</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 overflow-hidden">
              {/* Custom Input */}
              <div className="flex flex-col border-r border-neutral-900 p-3 overflow-hidden">
                <Label htmlFor="customInput" className="text-[10px] uppercase font-semibold text-neutral-500 mb-1.5">
                  Standard Input (Stdin)
                </Label>
                <textarea
                  id="customInput"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 resize-none w-full rounded-lg border border-neutral-800 bg-black p-2 font-mono text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Input variables here..."
                />
              </div>

              {/* Run Terminal Output */}
              <div className="flex flex-col p-3 overflow-hidden bg-black">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-semibold text-neutral-500">
                    Execution Output
                  </span>

                  {runStatus && (
                    <div className="flex items-center gap-1">
                      {runStatus === "Accepted" ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Accepted
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                          <AlertCircle className="h-3 w-3" />
                          {runStatus}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-850 bg-neutral-950 p-2 font-mono text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap">
                  {terminalOutput}
                  {errorDetails && (
                    <div className="mt-2 text-red-400 border-t border-neutral-900 pt-2 text-[11px] leading-relaxed">
                      <p className="font-bold uppercase tracking-wider text-[9px] text-red-500">Error Details</p>
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
