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
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Users Management</h1>
            <p className="text-sm text-neutral-400 sm:text-base">View and export all registered users</p>
          </div>
          <Button variant="outline" asChild className="w-full sm:w-auto bg-violet-600/10 text-violet-400 hover:bg-violet-600/20 border-violet-600/20">
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
          <Card>
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>All participants and administrators on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-neutral-500">
                      <th className="py-2">User</th>
                      <th className="py-2">Role</th>
                      <th className="py-2 text-center">Status</th>
                      <th className="py-2">LeetCode</th>
                      <th className="py-2">Codeforces</th>
                      <th className="py-2 text-center">Streak</th>
                      <th className="py-2 text-center">Solved</th>
                      <th className="py-2">Joined</th>
                      <th className="py-2 text-right">Quizzes</th>
                      <th className="py-2 text-right">Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-neutral-800">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800">
                                <UsersIcon className="h-4 w-4 text-neutral-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-neutral-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge variant={u.role === "ADMIN" ? "success" : "warning"}>
                            {u.role.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="relative flex h-2.5 w-2.5">
                              {isUserOnline(u.lastActiveAt) && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              )}
                              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isUserOnline(u.lastActiveAt) ? "bg-emerald-500" : "bg-neutral-600"}`}></span>
                            </span>
                            <span className="text-xs text-neutral-400">{isUserOnline(u.lastActiveAt) ? "Online" : "Offline"}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          {u.leetcodeHandle ? (
                            <a
                              href={`https://leetcode.com/${u.leetcodeHandle}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-500 hover:text-amber-400 font-bold hover:underline"
                            >
                              @{u.leetcodeHandle}
                            </a>
                          ) : (
                            <span className="text-neutral-500 italic text-xs">Not submitted</span>
                          )}
                        </td>
                        <td className="py-3">
                          {u.codeforcesHandle ? (
                            <a
                              href={`https://codeforces.com/profile/${u.codeforcesHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-400 hover:text-red-300 font-bold hover:underline"
                            >
                              @{u.codeforcesHandle}
                            </a>
                          ) : (
                            <span className="text-neutral-500 italic text-xs">Not submitted</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Flame className={`h-4 w-4 ${u.streak > 0 ? "text-orange-500 fill-orange-500/20" : "text-neutral-600"}`} />
                            <span className={u.streak > 0 ? "font-semibold text-orange-400" : "text-neutral-500"}>
                              {u.streak || 0}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          {u.solvedCount > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setIsModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-600/10 text-violet-400 border border-violet-600/25 hover:bg-violet-600/20 hover:text-violet-300 transition cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
                              {u.solvedCount}
                            </button>
                          ) : (
                            <span className="text-neutral-500 text-xs italic">None</span>
                          )}
                        </td>
                        <td className="py-3 text-neutral-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right text-neutral-400">{u._count.quizzes}</td>
                        <td className="py-3 text-right text-neutral-400">{u._count.attempts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md bg-neutral-900 border border-neutral-800 text-white rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span>Solved Problems</span>
                <span className="text-sm font-normal text-neutral-400">
                  by {selectedUser?.name}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Total Solved: <span className="font-semibold text-white">{selectedUser?.solvedCount ?? 0}</span> | Streak: <span className="font-semibold text-orange-400">{selectedUser?.streak ?? 0} days</span> | Points: <span className="font-semibold text-violet-400">{selectedUser?.points ?? 0}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {selectedUser?.solvedQuestions && selectedUser.solvedQuestions.length > 0 ? (
                selectedUser.solvedQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-850 hover:border-neutral-800 transition"
                  >
                    <div className="flex flex-col gap-1 min-w-0 pr-2">
                      <span className="font-medium text-sm text-white truncate">
                        {q.title}
                      </span>
                      <span className="text-xs text-neutral-500">
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
                        className="text-[10px] font-bold px-1.5 py-0.5"
                      >
                        {q.difficulty}
                      </Badge>
                      {q.referenceUrl && (
                        <a
                          href={q.referenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                          title="View Question"
                        >
                          <svg className="h-4 w-4 text-neutral-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-neutral-500 italic text-sm">
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
