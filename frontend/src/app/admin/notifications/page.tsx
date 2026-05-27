"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Loader2, Send } from "lucide-react";

interface RegisteredUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function AdminNotificationsPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sending, setSending] = useState(false);

  const [targetUserId, setTargetUserId] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Fetch users for the dropdown list
  useEffect(() => {
    async function fetchUsers() {
      if (!token) return;
      try {
        const data = await api<{ users: RegisteredUser[] }>("/api/admin/users", { token });
        // Sort users by name
        const sorted = data.users.sort((a, b) => a.name.localeCompare(b.name));
        setUsers(sorted);
      } catch (err) {
        toast.error("Failed to load users list: " + getApiErrorMessage(err));
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, [token]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSending(true);
    try {
      const response = await api<{ message: string }>("/api/notifications/admin/push", {
        method: "POST",
        body: JSON.stringify({
          targetUserId,
          title: title.trim(),
          message: message.trim(),
        }),
        token,
      });

      toast.success(response.message || "Notification sent successfully!");
      setTitle("");
      setMessage("");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (loadingUsers) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-600">Loading user records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Card className="border-slate-200 bg-white/40 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Send Notification</CardTitle>
              <CardDescription>
                Push in-app alerts and email notifications to registered users.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-6">
            {/* Recipient Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <select
                id="recipient"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="flex h-11 w-full min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:h-10 sm:text-sm"
              >
                <option value="all">📢 All Registered Users (Broadcast)</option>
                <optgroup label="Candidates & Admins">
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) — {u.role}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Notification Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Notification Title</Label>
              <Input
                id="title"
                placeholder="e.g. System Maintenance, New Quiz Available!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Notification Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message Body</Label>
              <Textarea
                id="message"
                placeholder="Write your announcement details here..."
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:ring-2"
              />
            </div>

            {/* Action Button */}
            <Button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2">
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending notifications...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Push Notification
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
