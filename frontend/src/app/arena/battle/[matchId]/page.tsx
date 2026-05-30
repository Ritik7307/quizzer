"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { api, getApiErrorMessage, API_ORIGIN } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Send, Loader2, Code, ArrowLeft, Terminal, CheckCircle2, AlertCircle, Swords, User, ShieldAlert } from "lucide-react";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface MatchQuestion {
  id: string;
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  difficulty: string;
}

interface MatchParticipantInfo {
  userId: string;
  name: string;
  passedCount: number;
  totalCount: number;
  status: string;
  disconnected: boolean;
}

const templates: Record<string, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input, process logic, and print output\n    int a, b;\n    if (cin >> a >> b) {\n        cout << (a + b) << endl;\n    }\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Read input, process logic, and print output\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) {\n        printf("%d\\n", a + b);\n    }\n    return 0;\n}`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Read input, process logic, and print output\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int a = sc.nextInt();\n            int b = sc.nextInt();\n            System.out.println(a + b);\n        }\n    }\n}`,
  python: `# Read input from stdin, process logic, and print output\nimport sys\n\ndef main():\n    # Example: reading two integers and printing their sum\n    # input_data = sys.stdin.read().split()\n    # if len(input_data) >= 2:\n    #     print(int(input_data[0]) + int(input_data[1]))\n    pass\n\nif __name__ == "__main__":\n    main()`,
};

export default function CodingBattlePage() {
  const { matchId } = useParams() as { matchId: string };
  const router = useRouter();
  const { token, user, refresh: refreshUser } = useAuth();
  const { resolvedTheme } = useTheme();

  const [question, setQuestion] = useState<MatchQuestion | null>(null);
  const [opponent, setOpponent] = useState<MatchParticipantInfo | null>(null);
  const [userProgress, setUserProgress] = useState({ passedCount: 0, totalCount: 1 });
  const [loading, setLoading] = useState(true);

  // Match ending states
  const [matchEnded, setMatchEnded] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  // Editor and compiler states
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const userEditedCode = useRef<Record<string, boolean>>({});

  // Setup sockets
  const setupSocketConnection = useCallback(() => {
    if (!user || socketRef.current) return;

    const socket = io(API_ORIGIN, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Emit join to restore or reconnect room subscription
      socket.emit("arena:join", {
        userId: user.id,
        userName: user.name,
        difficulty: question?.difficulty || "Easy",
      });
      console.log("[Battle] Socket connected and room joined");
    });

    socket.on("match:progress", (data) => {
      if (data.userId === user.id) {
        setUserProgress({ passedCount: data.passedCount, totalCount: data.totalCount });
      } else if (opponent && data.userId === opponent.userId) {
        setOpponent((prev) => prev ? {
          ...prev,
          passedCount: data.passedCount,
          totalCount: data.totalCount,
          status: data.status,
        } : null);
      }
    });

    socket.on("match:opponent-disconnected", () => {
      setOpponent((prev) => prev ? { ...prev, disconnected: true } : null);
      toast.warning("⚠️ Opponent disconnected! Keep coding to secure your victory.");
    });

    socket.on("match:end", (data) => {
      setWinnerId(data.winnerId);
      setMatchEnded(true);
      if (data.winnerId === user.id) {
        toast.success("🏆 VICTORY! You won the battle!");
      } else {
        toast.error("💀 DEFEAT! Opponent submitted correct answer first.");
      }
      refreshUser().catch((e) => console.error("Failed to refresh user stats:", e));
    });

    socket.on("disconnect", () => {
      console.log("[Battle] Socket disconnected");
    });
  }, [user, question?.difficulty, opponent, refreshUser]);

  // Load Match Details
  useEffect(() => {
    if (!token || !matchId) return;

    async function loadMatch() {
      try {
        // Try local storage first
        const stored = sessionStorage.getItem(`quizer:match:${matchId}`);
        if (stored) {
          const data = JSON.parse(stored);
          const qData = data.question;
          setQuestion(qData);
          if (language === "cpp" && qData.defaultCodeCpp) setCode(qData.defaultCodeCpp);
          else if (language === "java" && qData.defaultCodeJava) setCode(qData.defaultCodeJava);
          else if (language === "c" && qData.defaultCodeC) setCode(qData.defaultCodeC);
          else if (language === "python" && qData.defaultCodePython) setCode(qData.defaultCodePython);
          else setCode(templates[language] || templates.cpp);
          setCustomInput(qData.sampleInput);
          if (data.opponent) {
            setOpponent({
              userId: data.opponent.userId,
              name: data.opponent.name,
              passedCount: 0,
              totalCount: 1,
              status: "JOINED",
              disconnected: false,
            });
          }
          setLoading(false);
          return;
        }

        // Fallback to API detail check
        const response = await api<{ match: any }>(`/api/coding/matches/${matchId}`, { token });
        const match = response.match;
        setQuestion(match.codingQuestion);
        setCode(templates.cpp);
        setCustomInput(match.codingQuestion.sampleInput);
        
        // Find opponent in database records
        const oppParticipant = match.participants.find((p: any) => p.userId !== user?.id);
        if (oppParticipant) {
          setOpponent({
            userId: oppParticipant.userId,
            name: oppParticipant.user.name,
            passedCount: oppParticipant.score,
            totalCount: 1,
            status: oppParticipant.status,
            disconnected: oppParticipant.status === "DISCONNECTED",
          });
        }

        // Find user participant progress
        const meParticipant = match.participants.find((p: any) => p.userId === user?.id);
        if (meParticipant) {
          setUserProgress({ passedCount: meParticipant.score, totalCount: 1 });
        }

        if (match.status === "COMPLETED") {
          setMatchEnded(true);
          const winner = match.participants.find((p: any) => p.winner);
          if (winner) setWinnerId(winner.userId);
        }

        setLoading(false);
      } catch (err) {
        toast.error("Failed to retrieve match details: " + getApiErrorMessage(err));
        router.push("/arena");
      }
    }

    loadMatch();
  }, [matchId, token, user?.id, router]);

  // Hook sockets once question is loaded
  useEffect(() => {
    if (question && user) {
      setupSocketConnection();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [question, user, setupSocketConnection]);

  // Handle template reset
  const handleLanguageChange = (newLang: string) => {
    userEditedCode.current[language] = true;
    setLanguage(newLang);
    setCode(templates[newLang]);
  };

  const handleRunCode = async () => {
    setRunning(true);
    setTerminalOutput("Compiling and executing code...");
    setRunStatus(null);
    setErrorDetails(null);

    try {
      const res = await api<{ status: string; output: string; errorDetails?: string }>(
        `/api/coding/questions/${question?.id}/run`,
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
  };

  const handleSubmitCode = async () => {
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
      }>(`/api/coding/questions/${question?.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ code, language }),
        token,
      });

      setRunStatus(res.status);
      setUserProgress({ passedCount: res.passedCount, totalCount: res.totalCount });

      if (res.status === "Accepted") {
        setTerminalOutput(`🎉 All Test Cases Passed (${res.passedCount}/${res.totalCount})! Waiting for match completion...`);
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
  };

  const handleAbandonMatch = async () => {
    if (!matchId) return;
    try {
      await api(`/api/coding/matches/${matchId}/abandon`, { method: "POST", token });
      toast.success("Match ended successfully");
      router.push("/arena");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2.5">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Entering Code Arena...</p>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background text-foreground relative">
      {/* 1. TOP DUAL MATCH HEADER BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between border-b border-border bg-card shadow-md px-4 py-3 gap-3 md:gap-4 shrink-0">
        
        {/* User Progress */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600/15 border border-indigo-500/20 text-indigo-500">
            <User className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 md:flex-initial">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-black text-foreground">{user?.name} (You)</span>
              <span className="text-[10px] font-extrabold text-indigo-600">{userProgress.passedCount}/{userProgress.totalCount} test cases</span>
            </div>
            <div className="w-48 bg-muted rounded-full h-2 border border-border mt-1 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300 shadow-inner"
                style={{ width: `${(userProgress.passedCount / userProgress.totalCount) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Versus Indicator */}
        <div className="flex items-center gap-2 select-none">
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-black px-3 py-1 flex items-center gap-1.5 shrink-0 animate-pulse">
            <Swords className="h-4 w-4" /> BATTLE MODE
          </Badge>
        </div>

        {/* Opponent Progress */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {opponent ? (
            <>
              <div className="text-right flex flex-col items-end">
                <div className="flex items-center justify-end gap-2 mb-1">
                  {opponent.disconnected && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAbandonMatch}
                      className="h-6 text-[10px] font-bold text-red-600 border-red-500/30 hover:bg-red-50"
                    >
                      Leave Match
                    </Button>
                  )}
                  {opponent.disconnected && <Badge variant="destructive" className="text-[8px] font-black tracking-wider uppercase px-1 h-4">DISCONNECTED</Badge>}
                  <span className="text-xs font-black text-foreground">{opponent.name}</span>
                </div>
                <div className="flex items-center justify-between gap-4 w-full mt-0.5">
                  <span className="text-[10px] font-extrabold text-amber-500">{(opponent.passedCount || 0)}/{(opponent.totalCount || 1)} test cases</span>
                </div>
                <div className="w-48 bg-muted rounded-full h-2 border border-border mt-1 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300 shadow-inner"
                    style={{ width: `${((opponent.passedCount || 0) / (opponent.totalCount || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <User className="h-4.5 w-4.5" />
              </div>
            </>
          ) : (
            <span className="text-xs font-bold text-muted-foreground italic">Opponent loading...</span>
          )}
        </div>

      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden h-[calc(100vh-7.5rem)]">
        
        {/* Left Side: Question Details */}
        <div className="overflow-y-auto border-r border-border p-6 space-y-6 bg-card/45 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-xl font-bold text-foreground leading-snug">{question.title}</h2>
            <Badge
              className={
                question.difficulty === "Easy"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-bold"
                  : question.difficulty === "Medium"
                  ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 font-bold"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold"
              }
            >
              {question.difficulty}
            </Badge>
          </div>

          <div className="text-sm leading-relaxed text-foreground/95 whitespace-pre-wrap">
            {question.description}
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
                  <pre className="mt-1.5 rounded-xl border border-border/40 bg-muted/20 p-2.5 font-mono text-xs text-muted-foreground whitespace-pre-wrap">{question.constraints}</pre>
                </div>
              )}
            </div>
          )}

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
        </div>

        {/* Right Side: Monaco Editor & Terminal */}
        <div className="flex flex-col overflow-hidden bg-card">
          {/* Header toolbar */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-card">
            <div className="flex items-center gap-1.5">
              <Code className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Source Editor</span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={matchEnded}
                className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 font-semibold"
              >
                <option value="cpp">C++ (GCC)</option>
                <option value="c">C (GCC)</option>
                <option value="java">Java (JDK)</option>
                <option value="python">Python 3</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRunCode}
                disabled={running || submitting || matchEnded}
                className="flex items-center gap-1.5 text-xs rounded-lg h-8"
              >
                {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                Run
              </Button>

              <Button
                size="sm"
                onClick={handleSubmitCode}
                disabled={running || submitting || matchEnded}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg h-8 shadow-sm"
              >
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 fill-current" />}
                Submit
              </Button>
            </div>
          </div>

          {/* Code editor container */}
          <div className="flex-1 min-h-[220px] relative">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language === "c" ? "c" : language === "python" ? "python" : "java"}
              theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                readOnly: matchEnded,
              }}
              loading={
                <div className="flex h-full items-center justify-center bg-card text-xs text-muted-foreground font-semibold animate-pulse">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mr-2" />
                  Loading Workspace IDE...
                </div>
              }
            />
          </div>

          {/* Stdin / Output Terminal Panels */}
          <div className="border-t border-border h-60 flex flex-col bg-card">
            <div className="flex items-center justify-between border-b border-border bg-card px-3.5 py-1.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Execution Console</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 overflow-hidden">
              {/* Custom Input */}
              <div className="flex flex-col border-r border-border p-3 overflow-hidden">
                <Label htmlFor="customInput" className="text-[10px] uppercase font-extrabold text-muted-foreground mb-1">Standard Input (Stdin)</Label>
                <textarea
                  id="customInput"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  disabled={matchEnded}
                  className="flex-1 resize-none w-full rounded-lg border border-border bg-muted/20 p-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground/60 shadow-inner"
                  placeholder="Input variables here..."
                />
              </div>

              {/* Terminal Output */}
              <div className="flex flex-col p-3 overflow-hidden bg-muted/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-extrabold text-muted-foreground">Execution Output</span>
                  {runStatus && (
                    <Badge className={cn("text-[9px] font-black border uppercase px-1.5 py-0.2 shadow-sm leading-none", runStatus === "Accepted" ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                      {runStatus}
                    </Badge>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-2.5 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap shadow-inner">
                  {terminalOutput}
                  {errorDetails && (
                    <div className="mt-2 text-red-500 dark:text-red-400 border-t border-border pt-2 text-[11px] leading-relaxed">
                      <p className="font-bold uppercase tracking-wider text-[9px] text-red-600 leading-none">Error Details</p>
                      {errorDetails}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 3. BATTLE FINISH MODAL OVERLAY */}
      {matchEnded && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <Card className="max-w-md w-full border border-border bg-card shadow-2xl rounded-3xl overflow-hidden p-6 sm:p-8 text-center animate-scale-in">
            <CardContent className="space-y-6 pt-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-500 shadow-lg shadow-indigo-600/15 animate-bounce">
                <Swords className="h-8 w-8" />
              </div>

              {winnerId === user?.id ? (
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-green-600 dark:text-green-400">⚔️ VICTORY!</h2>
                  <p className="text-sm text-muted-foreground font-semibold">
                    Awesome job! You successfully compiled and passed all test cases first, defeating your opponent!
                  </p>
                  <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-4 py-1.5 rounded-full w-fit mx-auto border border-indigo-500/10 mt-3 shadow-inner">
                    +30 points earned
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-red-600 dark:text-red-400">💀 DEFEAT</h2>
                  <p className="text-sm text-muted-foreground font-semibold">
                    Your opponent successfully submitted the correct answer before you could finish.
                  </p>
                  <p className="text-xs font-bold text-muted-foreground mt-3">
                    Don't worry, keep practicing and try another duel!
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-5 flex flex-col gap-2">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold h-11 rounded-xl shadow-md" asChild>
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
                <Button variant="outline" className="font-bold h-11 rounded-xl" asChild>
                  <Link href="/arena">Play Again</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
