"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Play, Search, Code, History, BookOpen, Loader2, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Award, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { Quiz, Resource } from "@/types";

interface CodingQuestion {
  id: string;
  title: string;
  difficulty: string;
  sampleInput: string;
  sampleOutput: string;
  createdAt: string;
}

interface CodingSubmission {
  id: string;
  code: string;
  language: string;
  status: string;
  passedCount: number;
  totalCount: number;
  errorDetails: string | null;
  createdAt: string;
  codingQuestion: {
    title: string;
  };
}

export default function CandidateDashboard() {
  const { token, user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingCoding, setLoadingCoding] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"quizzes" | "coding" | "history" | "resources">("quizzes");
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Load data based on selected tab
  useEffect(() => {
    if (!token) return;

    if (activeTab === "quizzes") {
      setLoading(true);
      api<{ quizzes: Quiz[] }>("/api/quizzes", { token })
        .then((d) => setQuizzes(d.quizzes))
        .catch(() => toast.error("Failed to load quizzes"))
        .finally(() => setLoading(false));
    } else if (activeTab === "coding") {
      setLoadingCoding(true);
      api<{ questions: CodingQuestion[] }>("/api/coding/questions", { token })
        .then((d) => setCodingQuestions(d.questions))
        .catch(() => toast.error("Failed to load coding questions"))
        .finally(() => setLoadingCoding(false));
    } else if (activeTab === "history") {
      setLoadingSubmissions(true);
      api<{ submissions: CodingSubmission[] }>("/api/coding/submissions", { token })
        .then((d) => setSubmissions(d.submissions))
        .catch(() => toast.error("Failed to load submission history"))
        .finally(() => setLoadingSubmissions(false));
    } else if (activeTab === "resources") {
      setLoadingResources(true);
      api<{ resources: Resource[] }>("/api/resources", { token })
        .then((d) => setResources(d.resources))
        .catch(() => toast.error("Failed to load study resources"))
        .finally(() => setLoadingResources(false));
    }
  }, [token, activeTab]);

  // Search logic
  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCoding = codingQuestions.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredResources = resources.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLanguageLabel = (lang: string) => {
    if (lang === "cpp") return "C++";
    if (lang === "c") return "C";
    if (lang === "java") return "Java";
    return lang.toUpperCase();
  };

  return (
    <ProtectedRoute role="CANDIDATE">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in text-foreground">
        
        {/* Welcome header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Welcome, {user?.name}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
              {activeTab === "quizzes" && "Available quizzes for the upskilling series"}
              {activeTab === "coding" && "Practice your programming logic in C++, Java, and C"}
              {activeTab === "history" && "Analyze your past code compile and run submissions"}
              {activeTab === "resources" && "Download references, guides, and learning resources"}
            </p>
          </div>

          {/* Gamification Stats */}
          {user && (
            <div className="flex items-center gap-3 shrink-0">
              {/* Active Days (Streak) */}
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10 px-3.5 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.04)]">
                <svg
                  className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-450 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14l2 2 4-4" />
                </svg>
                <div>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{user.streak ?? 0}</p>
                  <p className="text-[8px] font-extrabold text-emerald-600 dark:text-emerald-550 uppercase tracking-widest mt-1 leading-none">Active Days</p>
                </div>
              </div>

              {/* Points */}
              <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 px-3.5 py-1.5 shadow-[0_0_12px_rgba(139,92,246,0.06)]">
                <Award className="h-4.5 w-4.5 text-indigo-550 dark:text-indigo-400 shrink-0" />
                <div>
                  <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">{user.points ?? 0}</p>
                  <p className="text-[8px] font-extrabold text-indigo-500 uppercase tracking-widest mt-1 leading-none">Total Points</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Selection (Modern Segmented Pills) */}
        <div className="bg-muted/40 dark:bg-zinc-900/60 p-1.5 rounded-2xl flex flex-wrap sm:flex-nowrap gap-1 mb-8 shadow-sm backdrop-blur-sm border border-border">
          {[
            { id: "quizzes", label: "Quizzes", icon: BookOpen },
            { id: "coding", label: "Coding Practice", icon: Code },
            { id: "history", label: "Submissions History", icon: History },
            { id: "resources", label: "Study Resources", icon: FileText },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setSearch("");
                setExpandedSubId(null);
              }}
              className={`flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 select-none ${
                activeTab === t.id
                  ? "bg-card text-indigo-600 dark:text-indigo-400 shadow-md border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 dark:hover:bg-zinc-800/40"
              }`}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Search input (not needed for history tab) */}
        {activeTab !== "history" && (
          <div className="relative mb-6 max-w-md animate-fade-in">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10 border-border bg-card/60 focus:bg-card text-foreground"
              placeholder={
                activeTab === "quizzes"
                  ? "Search quizzes..."
                  : activeTab === "coding"
                  ? "Search coding problems..."
                  : "Search resources..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Tab Content Rendering */}
        {activeTab === "quizzes" && (
          /* 1. QUIZZES TAB */
          loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <Card className="border-border bg-card/45 backdrop-blur-md">
              <CardContent className="py-16 text-center flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center animate-pulse">
                  <BookOpen className="h-8 w-8 text-indigo-500/65" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">No Quizzes Available</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    There are no quizzes currently active or matching your search filter. Check back later!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredQuizzes.map((quiz) => (
                <Card key={quiz.id} className="flex flex-col transition-all duration-300 border border-border bg-card/45 backdrop-blur-md hover:border-indigo-500/35 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 rounded-2xl overflow-hidden group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 leading-snug">{quiz.title}</CardTitle>
                      {quiz.isActive ? (
                        <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-450 border border-emerald-500/20">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground bg-muted/20">Inactive</Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2 text-sm text-muted-foreground leading-relaxed mt-1">{quiz.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-3 flex items-center justify-between border-t border-border bg-muted/10 px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Clock className="h-4 w-4 text-indigo-550 dark:text-indigo-455" /> {quiz.duration} min · {quiz._count?.questions ?? 0} Qs
                    </span>
                    {quiz.attempt?.submittedAt ? (
                      <Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
                        <Link href={`/quiz/${quiz.id}/result`}>View Result</Link>
                      </Button>
                    ) : (
                      <Button size="sm" className="h-8 rounded-lg font-semibold" disabled={!quiz.isActive} asChild={quiz.isActive}>
                        {quiz.isActive ? (
                          <Link href={`/quiz/${quiz.id}/take`} className="flex items-center gap-1">
                            <Play className="h-3.5 w-3.5 fill-current" /> Start
                          </Link>
                        ) : (
                          <span>Unavailable</span>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === "coding" && (
          /* 2. CODING PRACTICE TAB */
          loadingCoding ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : filteredCoding.length === 0 ? (
            <Card className="border-border bg-card/45 backdrop-blur-md">
              <CardContent className="py-16 text-center flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse">
                  <Code className="h-8 w-8 text-emerald-500/65" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">No Coding Questions</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    No programming exercises match your search query. Try typing something else!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCoding.map((question) => (
                <Card key={question.id} className="flex flex-col transition-all duration-300 border border-border bg-card/45 backdrop-blur-md hover:border-emerald-500/35 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 rounded-2xl overflow-hidden group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-450 transition-colors duration-200 leading-snug">{question.title}</CardTitle>
                      <Badge
                        className={
                          question.difficulty === "Easy"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                            : question.difficulty === "Medium"
                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-450 border border-yellow-500/20"
                            : "bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/20"
                        }
                      >
                        {question.difficulty}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2 text-sm text-muted-foreground mt-1">
                      Practice inputs: {question.sampleInput.trim() || "None"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-3 flex items-center justify-end border-t border-border bg-muted/10 px-6 py-4">
                    <Button size="sm" className="h-8 rounded-lg bg-emerald-650 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1" asChild>
                      <Link href={`/coding/${question.id}`}>
                        <Play className="h-3.5 w-3.5 fill-current" /> Practice
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === "history" && (
          /* 3. SUBMISSION HISTORY TAB */
          loadingSubmissions ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : submissions.length === 0 ? (
            <Card className="border-border bg-card/45 backdrop-blur-md">
              <CardContent className="py-16 text-center flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center animate-pulse">
                  <History className="h-8 w-8 text-amber-500/65" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">No Submissions Found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    You haven't made any compile or run attempts yet. Solve a coding practice question to start!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <Card key={sub.id} className="border border-border bg-card/45 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm transition-all duration-200">
                  <div
                    onClick={() => setExpandedSubId(expandedSubId === sub.id ? null : sub.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 cursor-pointer hover:bg-muted/20 dark:hover:bg-zinc-800/20 transition-all duration-200"
                  >
                    <div className="space-y-1.5">
                      <h3 className="text-base font-extrabold text-foreground">{sub.codingQuestion.title}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground font-semibold">
                        <span>Language: {getLanguageLabel(sub.language)}</span>
                        <span>•</span>
                        <span>Date: {formatDate(sub.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      {/* Score / Cases Passed */}
                      <span className="text-sm font-bold text-foreground/80">
                        {sub.passedCount}/{sub.totalCount} Cases
                      </span>

                      {/* Status Badge */}
                      <Badge
                        className={
                          sub.status === "Accepted"
                            ? "bg-green-500/10 text-green-600 dark:text-green-450 border border-green-500/20 font-bold"
                            : sub.status === "Compile Error"
                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-450 border border-yellow-500/20 font-bold"
                            : "bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/20 font-bold"
                        }
                      >
                        {sub.status}
                      </Badge>

                      {/* Expand Toggle */}
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted dark:hover:bg-zinc-800 rounded-lg">
                        {expandedSubId === sub.id ? <ChevronUp className="h-4 w-4 text-foreground/60" /> : <ChevronDown className="h-4 w-4 text-foreground/60" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Submission Detail (Code Inspection) */}
                  {expandedSubId === sub.id && (
                    <CardContent className="border-t border-border pt-5 pb-5 bg-muted/20 dark:bg-zinc-950/30">
                      <div className="space-y-4">
                        {/* Error info (if any failed) */}
                        {sub.errorDetails && (
                          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-mono text-red-500 dark:text-red-400 flex items-start gap-2.5 leading-relaxed">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div className="whitespace-pre-wrap">{sub.errorDetails}</div>
                          </div>
                        )}

                        {/* Submitted Code Block */}
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Submitted Code</Label>
                          <pre className="rounded-xl border border-border bg-card p-4.5 font-mono text-xs text-foreground/90 overflow-x-auto max-h-80 whitespace-pre leading-relaxed shadow-inner">
                            {sub.code}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === "resources" && (
          /* 4. STUDY RESOURCES TAB */
          loadingResources ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : filteredResources.length === 0 ? (
            <Card className="border-border bg-card/45 backdrop-blur-md">
              <CardContent className="py-16 text-center flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-violet-500/10 flex items-center justify-center animate-pulse">
                  <FileText className="h-8 w-8 text-violet-500/65" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">No Study Resources</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    No references, guides, or PDFs are currently listed. Check back again soon!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="flex flex-col justify-between transition-all duration-300 border border-border bg-card/45 backdrop-blur-md hover:border-indigo-500/35 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 rounded-2xl overflow-hidden group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 truncate max-w-[200px]" title={resource.title}>
                        {resource.title}
                      </CardTitle>
                      <Badge className="bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-extrabold uppercase tracking-wider">
                        {resource.fileType.toUpperCase()}
                      </Badge>
                    </div>
                    {resource.description && (
                      <CardDescription className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mt-1.5">
                        {resource.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-3.5 flex items-center justify-between border-t border-border bg-muted/10 px-6 py-4.5 mt-auto">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/resources/${resource.id}/download?token=${token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-card border border-border hover:bg-muted text-[10px] font-extrabold uppercase tracking-wider text-foreground px-3 transition-colors duration-200 shadow-sm"
                      >
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" /> View
                      </a>
                      <a
                        href={`/api/resources/${resource.id}/download?token=${token}`}
                        download={resource.fileName}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-3 transition-colors duration-200 shadow-sm"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
