"use client";

import { useEffect, useState } from "react";
import { FileDown, Users as UsersIcon, Flame, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { api, exportUsersCsvUrl } from "@/lib/api";
import type { User } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SolvedQuestion {
  id: string;
  title: string;
  difficulty: string;
  isExternalOnly: boolean;
  referenceUrl?: string | null;
}

interface AdminUser extends User {
  avatarUrl?: string | null;
  createdAt: string;
  points: number;
  streak: number;
  lastSolvedDate?: string | null;
  lastActiveAt?: string | null;
  solvedCount: number;
  solvedQuestions: SolvedQuestion[];
  _count: { attempts: number; quizzes: number };
}

function isUserOnline(lastActiveAt?: string | null) {
  if (!lastActiveAt) return false;
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  return diff < 5 * 60 * 1000; // 5 minutes
}

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<{ users: AdminUser[] }>("/api/admin/users", { token })
      .then((res) => setUsers(res.users))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <ProtectedRoute role="ADMIN">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Users Management</h1>
            <p className="text-sm text-muted-foreground sm:text-base">View and export all registered users</p>
          </div>
          <Button variant="outline" asChild className="w-full sm:w-auto bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 border-indigo-600/20">
            <a
              href={exportUsersCsvUrl()}
              onClick={(e) => {
                e.preventDefault();
                fetch(exportUsersCsvUrl(), {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then((r) => r.blob())
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "registered-users.csv";
                    a.click();
                  })
                  .catch(() => toast.error("Export failed"));
              }}
            >
              <FileDown className="h-4 w-4 mr-2" /> Download CSV
            </a>
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-96" />
        ) : (
          <Card className="border-border bg-card/60 backdrop-blur-md shadow-sm">
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>All participants and administrators on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground font-semibold">
                      <th className="py-3">User</th>
                      <th className="py-3">Role</th>
                      <th className="py-3 text-center">Status</th>
                      <th className="py-3">LeetCode</th>
                      <th className="py-3">Codeforces</th>
                      <th className="py-3 text-center">Streak</th>
                      <th className="py-3 text-center">Solved</th>
                      <th className="py-3">Joined</th>
                      <th className="py-3 text-right">Quizzes</th>
                      <th className="py-3 text-right">Attempts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => (
                      <tr key={u.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="h-9 w-9 rounded-full object-cover border border-border" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted border border-border">
                                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-foreground">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge variant={u.role === "ADMIN" ? "success" : "warning"} className="font-bold">
                            {u.role.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              {isUserOnline(u.lastActiveAt) && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              )}
                              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isUserOnline(u.lastActiveAt) ? "bg-emerald-500" : "bg-neutral-500 dark:bg-neutral-600"}`}></span>
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">{isUserOnline(u.lastActiveAt) ? "Online" : "Offline"}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          {u.leetcodeHandle ? (
                            <a
                              href={`https://leetcode.com/${u.leetcodeHandle}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-600 dark:text-amber-500 hover:text-amber-500 font-bold hover:underline"
                            >
                              @{u.leetcodeHandle}
                            </a>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Not submitted</span>
                          )}
                        </td>
                        <td className="py-4">
                          {u.codeforcesHandle ? (
                            <a
                              href={`https://codeforces.com/profile/${u.codeforcesHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-600 dark:text-red-400 hover:text-red-500 font-bold hover:underline"
                            >
                              @{u.codeforcesHandle}
                            </a>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Not submitted</span>
                          )}
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Flame className={`h-4 w-4 ${u.streak > 0 ? "text-orange-500 fill-orange-500/20" : "text-muted-foreground"}`} />
                            <span className={u.streak > 0 ? "font-bold text-orange-600 dark:text-orange-400" : "font-semibold text-muted-foreground"}>
                              {u.streak || 0}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          {u.solvedCount > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setIsModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-600/25 hover:bg-indigo-600/20 transition cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              {u.solvedCount}
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs italic font-medium">None</span>
                          )}
                        </td>
                        <td className="py-4 text-muted-foreground font-medium">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 text-right font-bold text-muted-foreground">{u._count.quizzes}</td>
                        <td className="py-4 text-right font-bold text-muted-foreground">{u._count.attempts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md bg-card border border-border text-foreground rounded-xl shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span>Solved Problems</span>
                <span className="text-sm font-normal text-muted-foreground">
                  by {selectedUser?.name}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Total Solved: <span className="font-semibold text-foreground">{selectedUser?.solvedCount ?? 0}</span> | Streak: <span className="font-semibold text-orange-500">{selectedUser?.streak ?? 0} days</span> | Points: <span className="font-semibold text-indigo-500">{selectedUser?.points ?? 0}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {selectedUser?.solvedQuestions && selectedUser.solvedQuestions.length > 0 ? (
                selectedUser.solvedQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0 pr-2">
                      <span className="font-bold text-sm text-foreground truncate">
                        {q.title}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {q.isExternalOnly ? "External Sheet Question" : "Internal Quiz/Coding Sandbox"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant={
                          q.difficulty === "Easy"
                            ? "success"
                            : q.difficulty === "Medium"
                            ? "warning"
                            : "destructive"
                        }
                        className="text-[10px] font-bold px-2 py-0.5"
                      >
                        {q.difficulty}
                      </Badge>
                      {q.referenceUrl && (
                        <a
                          href={q.referenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="View Question"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground italic text-sm font-medium">
                  No solved coding problems yet.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
