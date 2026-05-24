"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Loader2, Code, ArrowLeft, Terminal, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import Editor from "@monaco-editor/react";

const templates: Record<string, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Online C++ Compiler\n    cout << "Hello, C++ World!" << endl;\n    \n    // Example of reading standard input\n    int n;\n    if (cin >> n) {\n        cout << "Standard input received: " << n << endl;\n    }\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Online C Compiler\n    printf("Hello, C World!\\n");\n    \n    // Example of reading standard input\n    int n;\n    if (scanf("%d", &n) == 1) {\n        printf("Standard input received: %d\\n", n);\n    }\n    return 0;\n}`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Online Java Compiler\n        System.out.println("Hello, Java World!");\n        \n        // Example of reading standard input\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            System.out.println("Standard input received: " + n);\n        }\n    }\n}`,
};

export default function StandaloneCompilerPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();

  const [running, setRunning] = useState(false);
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(templates.cpp);
  const [customInput, setCustomInput] = useState("");
  const [terminalOutput, setTerminalOutput] = useState("Run your code to see output here.");
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Track user edits for each language to prevent template overwrites when switching tabs
  const userEditedCode = useRef<Record<string, string>>({
    cpp: templates.cpp,
    c: templates.c,
    java: templates.java,
  });

  useEffect(() => {
    if (!authLoading && !token) {
      toast.error("Please log in to access the compiler workspace.");
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const handleLanguageChange = (newLang: string) => {
    // Save current code edit state for old language
    userEditedCode.current[language] = code;

    setLanguage(newLang);
    // Restore or load template for new language
    setCode(userEditedCode.current[newLang] || templates[newLang]);
  };

  async function handleRunCode() {
    if (!token) {
      toast.error("You must be logged in to execute code.");
      return;
    }

    setRunning(true);
    setTerminalOutput("Compiling and executing code...");
    setRunStatus(null);
    setErrorDetails(null);

    try {
      const res = await api<{ status: string; output: string; errorDetails?: string }>(
        "/api/coding/run",
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

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-neutral-400">Loading Compiler Workspace...</p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-black text-neutral-100">
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 bg-neutral-950">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-neutral-400 hover:text-white">
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-violet-400" />
            <h1 className="text-base font-semibold">Online Sandbox Compiler</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border border-neutral-850 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
          >
            <option value="cpp">C++ (GCC)</option>
            <option value="c">C (GCC)</option>
            <option value="java">Java (JDK)</option>
          </select>

          <Button
            size="sm"
            onClick={handleRunCode}
            disabled={running}
            className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white font-medium px-4"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run Code
          </Button>
        </div>
      </div>

      {/* Main Workspace Panels */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden h-[calc(100vh-6.5rem)]">
        {/* Left Section: Monaco Editor (3/5 width) */}
        <div className="lg:col-span-3 flex flex-col border-r border-neutral-800 overflow-hidden bg-neutral-950">
          <div className="flex items-center gap-1.5 border-b border-neutral-900 px-4 py-2 bg-neutral-950/80">
            <Code className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">Source Editor</span>
          </div>

          <div className="flex-1 relative min-h-[300px]">
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
        </div>

        {/* Right Section: In/Out Terminal Console Panels (2/5 width) */}
        <div className="lg:col-span-2 flex flex-col overflow-hidden bg-neutral-950">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-neutral-900 px-4 py-2 bg-neutral-950/80">
            <Terminal className="h-4 w-4 text-neutral-500" />
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">Execution Console</span>
          </div>

          {/* Stdin Panel (40% height) */}
          <div className="flex-1 flex flex-col p-4 border-b border-neutral-900 min-h-[150px] overflow-hidden bg-neutral-950">
            <Label htmlFor="customInput" className="text-[10px] uppercase font-semibold text-neutral-400 mb-2 tracking-wider">
              Standard Input (Stdin)
            </Label>
            <textarea
              id="customInput"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 resize-none w-full rounded-lg border border-neutral-800 bg-black p-3 font-mono text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-neutral-600"
              placeholder="Provide inputs here (each input on a new line)..."
            />
          </div>

          {/* Stdout Output Panel (60% height) */}
          <div className="flex-[1.5] flex flex-col p-4 overflow-hidden bg-black">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                Execution Output
              </span>

              {runStatus && (
                <div className="flex items-center gap-1">
                  {runStatus === "Accepted" ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded border border-green-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      Success
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20">
                      <AlertCircle className="h-3 w-3" />
                      {runStatus}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-850 bg-neutral-950 p-3 font-mono text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap">
              {terminalOutput}
              {errorDetails && (
                <div className="mt-3 text-red-400 border-t border-neutral-800 pt-3 text-[11px] leading-relaxed">
                  <p className="font-bold uppercase tracking-wider text-[9px] text-red-500 mb-1">Compilation/Runtime Logs</p>
                  {errorDetails}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
