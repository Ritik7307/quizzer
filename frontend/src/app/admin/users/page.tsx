"use client";

import { useEffect, useState } from "react";
import { FileDown, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { api, exportUsersCsvUrl } from "@/lib/api";
import type { User } from "@/types";

interface AdminUser extends User {
  avatarUrl?: string | null;
  createdAt: string;
  _count: { attempts: number; quizzes: number };
}

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

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
      </div>
    </ProtectedRoute>
  );
}
