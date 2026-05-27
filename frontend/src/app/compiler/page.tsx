"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Loader2, Code, ArrowLeft, Terminal, CheckCircle2, AlertCircle, MessageSquare, Trash2, Edit2, Plus, Save } from "lucide-react";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

  // Right side panel active tab
  const [activeRightTab, setActiveRightTab] = useState<"console" | "notes">("console");

  // Compiler notes states
  interface CompilerNote {
    id: string;
    title: string;
    code: string | null;
    language: string | null;
    note: string;
    createdAt: string;
  }
  const [notes, setNotes] = useState<CompilerNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // For editing note
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const fetchNotes = useCallback(async () => {
    if (!token) return;
    setLoadingNotes(true);
    try {
      const res = await api<{ notes: CompilerNote[] }>("/api/compiler-notes", { token });
      setNotes(res.notes);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load saved notes");
    } finally {
      setLoadingNotes(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchNotes();
    }
  }, [token, fetchNotes]);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast.error("Title and note content are required");
      return;
    }

    setSavingNote(true);
    try {
      await api("/api/compiler-notes", {
        method: "POST",
        token,
        body: JSON.stringify({
          title: noteTitle.trim(),
          note: noteContent.trim(),
          code,
          language,
        }),
      });
      toast.success("Note saved successfully!");
      setNoteTitle("");
      setNoteContent("");
      fetchNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleStartEdit = (note: CompilerNote) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.note);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!token) return;
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error("Title and note content cannot be empty");
      return;
    }

    try {
      const original = notes.find((n) => n.id === noteId);
      await api(`/api/compiler-notes/${noteId}`, {
        method: "PUT",
        token,
        body: JSON.stringify({
          title: editTitle.trim(),
          note: editContent.trim(),
          code: original?.code || null,
          language: original?.language || null,
        }),
      });
      toast.success("Note updated!");
      setEditingNoteId(null);
      fetchNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await api(`/api/compiler-notes/${noteId}`, {
        method: "DELETE",
        token,
      });
      toast.success("Note deleted");
      fetchNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note");
    }
  };

  const handleLoadCode = (note: CompilerNote) => {
    if (!note.code) {
      toast.error("No code associated with this note");
      return;
    }
    if (!confirm("Loading this code will overwrite your current editor workspace. Continue?")) return;

    if (note.language) {
      setLanguage(note.language);
      setCode(note.code);
      userEditedCode.current[note.language] = note.code;
    } else {
      setCode(note.code);
    }
    toast.success("Saved code loaded into editor!");
  };

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
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
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
            <Code className="h-5 w-5 text-indigo-400" />
            <h1 className="text-base font-semibold">Online Sandbox Compiler</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border border-neutral-850 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
          >
            <option value="cpp">C++ (GCC)</option>
            <option value="c">C (GCC)</option>
            <option value="java">Java (JDK)</option>
          </select>

          <Button
            size="sm"
            onClick={handleRunCode}
            disabled={running}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4"
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
            <Code className="h-4 w-4 text-indigo-400" />
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
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
                  Loading Code Editor...
                </div>
              }
            />
          </div>
        </div>

        {/* Right Section: Console & Saved Notes (2/5 width) */}
        <div className="lg:col-span-2 flex flex-col overflow-hidden bg-neutral-950">
          {/* Tabs header */}
          <div className="flex border-b border-neutral-900 bg-neutral-950/85">
            <button
              onClick={() => setActiveRightTab("console")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider outline-none border-b-2 transition-all select-none",
                activeRightTab === "console"
                  ? "text-indigo-400 border-indigo-500 bg-indigo-600/5 font-bold"
                  : "text-neutral-500 border-transparent hover:text-neutral-300"
              )}
            >
              <Terminal className="h-3.5 w-3.5" />
              Console
            </button>
            <button
              onClick={() => setActiveRightTab("notes")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider outline-none border-b-2 transition-all select-none",
                activeRightTab === "notes"
                  ? "text-indigo-400 border-indigo-500 bg-indigo-600/5 font-bold"
                  : "text-neutral-500 border-transparent hover:text-neutral-300"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Saved Notes & Questions
            </button>
          </div>

          {activeRightTab === "console" ? (
            <>
              {/* Stdin Panel (40% height) */}
              <div className="flex-1 flex flex-col p-4 border-b border-neutral-900 min-h-[150px] overflow-hidden bg-neutral-950">
                <Label htmlFor="customInput" className="text-[10px] uppercase font-semibold text-neutral-400 mb-2 tracking-wider">
                  Standard Input (Stdin)
                </Label>
                <textarea
                  id="customInput"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 resize-none w-full rounded-lg border border-neutral-800 bg-black p-3 font-mono text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-neutral-600"
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
            </>
          ) : (
            /* Tab 2: Saved Notes & Questions */
            <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
              
              {/* Add Note Form */}
              <div className="p-4 border-b border-neutral-900 bg-neutral-950/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5 text-indigo-400" />
                  Save Question & Analysis
                </h3>
                <form onSubmit={handleSaveNote} className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Question Name / Topic (e.g. Merge Sort)"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      required
                      className="w-full rounded-lg border border-neutral-850 bg-neutral-900/60 p-2 px-3 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-neutral-500"
                    />
                  </div>
                  <div>
                    <textarea
                      placeholder="Write important notes, concepts, or details to remember..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      required
                      rows={3}
                      className="w-full rounded-lg border border-neutral-850 bg-neutral-900/60 p-2.5 px-3 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-neutral-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 font-medium">
                      Current Code & Language ({language.toUpperCase()}) will be attached.
                    </span>
                    <Button
                      type="submit"
                      disabled={savingNote}
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-750 text-white text-xs px-3 font-semibold flex items-center gap-1 py-1 h-8"
                    >
                      {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Note
                    </Button>
                  </div>
                </form>
              </div>

              {/* Notes List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Your Saved Items</h4>
                {loadingNotes ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    <p className="text-xs text-neutral-500">Loading saved list...</p>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-neutral-850 rounded-xl bg-neutral-950/20">
                    <p className="text-xs text-neutral-450">No saved questions or notes yet.</p>
                    <p className="text-[10px] text-neutral-550 mt-1">Capture your current editor screen and logic notes above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((n) => {
                      const isEditing = editingNoteId === n.id;
                      return (
                        <div key={n.id} className="rounded-xl border border-neutral-850 bg-neutral-950/45 p-3.5 space-y-2.5 transition-all hover:border-neutral-800">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div>
                                <Label className="text-[9px] uppercase font-bold text-neutral-450">Edit Title</Label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full rounded-lg border border-neutral-800 bg-black p-2 mt-1 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <Label className="text-[9px] uppercase font-bold text-neutral-450">Edit Note</Label>
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  rows={3}
                                  className="w-full rounded-lg border border-neutral-800 bg-black p-2 mt-1 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  className="h-7 text-[10px] border-neutral-800 text-neutral-400 hover:bg-neutral-800"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateNote(n.id)}
                                  className="h-7 text-[10px] bg-indigo-600 text-white hover:bg-indigo-750 font-semibold"
                                >
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h5 className="font-bold text-neutral-200 text-xs">{n.title}</h5>
                                  <span className="text-[8px] text-neutral-500">
                                    Saved: {new Date(n.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {n.language && (
                                    <Badge className="bg-neutral-900 border border-neutral-800 text-neutral-400 text-[9px] px-1.5 py-0">
                                      {n.language.toUpperCase()}
                                    </Badge>
                                  )}
                                  {n.code && (
                                    <button
                                      onClick={() => handleLoadCode(n)}
                                      title="Load code into editor"
                                      className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-955/20 border border-indigo-900/30 px-2 py-0.5 rounded transition-all"
                                    >
                                      Load Code
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="rounded-lg bg-neutral-900/30 border border-neutral-900/60 p-2.5 text-xs text-neutral-350 italic whitespace-pre-wrap leading-relaxed">
                                {n.note}
                              </div>

                              <div className="flex justify-end gap-2 text-[10px]">
                                <button
                                  onClick={() => handleStartEdit(n)}
                                  className="text-neutral-500 hover:text-neutral-300 flex items-center gap-1 px-1"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  Edit Note
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(n.id)}
                                  className="text-red-500/80 hover:text-red-400 flex items-center gap-1 px-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
