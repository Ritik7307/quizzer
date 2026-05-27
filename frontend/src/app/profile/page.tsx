"use client";

import { useEffect, useState } from "react";
import { User, Image as ImageIcon, ExternalLink, Award, Shield, Star, Globe, Trophy } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";
import type { User as UserType } from "@/types";

export default function ProfilePage() {
  const { user, refresh, token } = useAuth();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [leetcodeHandle, setLeetcodeHandle] = useState("");
  const [codeforcesHandle, setCodeforcesHandle] = useState("");
  const [cfStats, setCfStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatarUrl(user.avatarUrl || "");
      setLeetcodeHandle(user.leetcodeHandle || "");
      setCodeforcesHandle(user.codeforcesHandle || "");
    }
  }, [user]);

  // Fetch Codeforces Stats if handle is present
  useEffect(() => {
    const handle = user?.codeforcesHandle;
    if (handle) {
      setLoadingStats(true);
      fetch(`https://codeforces.com/api/user.info?handles=${handle}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status === "OK" && data.result?.[0]) {
            setCfStats(data.result[0]);
          } else {
            setCfStats(null);
          }
        })
        .catch((err) => {
          console.error("Codeforces API failed: ", err);
          setCfStats(null);
        })
        .finally(() => setLoadingStats(false));
    } else {
      setCfStats(null);
    }
  }, [user?.codeforcesHandle]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    try {
      await api<{ user: UserType }>("/api/auth/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          name: name.trim(),
          avatarUrl: avatarUrl.trim(),
          leetcodeHandle: leetcodeHandle.trim() || null,
          codeforcesHandle: codeforcesHandle.trim() || null,
        }),
      });
      await refresh();
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 animate-fade-in space-y-8 text-foreground">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">Account Settings</h1>
          <p className="text-muted-foreground text-sm mt-1.5">Manage your identity, avatar URL, and competitive programming profiles.</p>
        </div>

        {/* Metric Cards Grid */}
        {user && (
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Points Card */}
            <Card className="border border-border bg-card/45 backdrop-blur-md p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">
                  Total Points
                </span>
                <p className="text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                  {user.points ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground font-semibold">Accumulated from quizzes & sheets</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-650 dark:text-indigo-400 border border-indigo-500/15 shadow-sm">
                <Award className="h-6 w-6" />
              </div>
            </Card>

            {/* Streak Card */}
            <Card className="border border-border bg-card/45 backdrop-blur-md p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">
                  Active Streak
                </span>
                <p className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {user.streak ?? 0} <span className="text-sm font-bold text-muted-foreground">Days</span>
                </p>
                <p className="text-[10px] text-muted-foreground font-semibold">Solve daily to build consistency</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/15 shadow-sm">
                <svg
                  className="h-6 w-6 text-emerald-500"
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
              </div>
            </Card>

            {/* Level Rank Card */}
            <Card className="border border-border bg-card/45 backdrop-blur-md p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">
                  upskilling tier
                </span>
                <p className="text-xl font-black tracking-tight text-amber-500 leading-tight uppercase mt-1">
                  {(user.points ?? 0) >= 200 ? "PRO DEV" : (user.points ?? 0) >= 50 ? "SPECIALIST" : "APPRENTICE"}
                </p>
                <p className="text-[10px] text-muted-foreground font-semibold">Tier level based on points</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/15 shadow-sm">
                <Trophy className="h-6 w-6 animate-pulse" />
              </div>
            </Card>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-3">
          {/* Edit Form Section */}
          <div className="md:col-span-2">
            <Card className="border border-border bg-card/45 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 border-b border-border bg-muted/10">
                <CardTitle className="text-lg font-bold text-foreground">Profile details</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Update your personal information and competitive programming handles</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center border-b border-border pb-6">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card shadow-inner">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="avatarUrl" className="text-xs font-bold text-foreground/80">Avatar Image URL</Label>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="avatarUrl"
                          type="url"
                          placeholder="https://example.com/image.png"
                          className="pl-9 bg-muted/20 border-border text-foreground focus-visible:ring-indigo-500 rounded-lg"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Paste a direct link to an image (e.g., from Imgur, Discord, or GitHub).
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-bold text-foreground/80">Display Name</Label>
                      <Input
                        id="name"
                        type="text"
                        required
                        minLength={2}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-muted/20 border-border text-foreground focus-visible:ring-indigo-500 rounded-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold text-foreground/80">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        disabled
                        value={user?.email || ""}
                        className="bg-muted/40 border-border text-muted-foreground rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 border-t border-border pt-6">
                    {/* LeetCode handle */}
                    <div className="space-y-2">
                      <Label htmlFor="leetcodeHandle" className="text-xs font-bold text-foreground/80">
                        LeetCode Username
                      </Label>
                      <Input
                        id="leetcodeHandle"
                        type="text"
                        placeholder="e.g. janesmith"
                        value={leetcodeHandle}
                        onChange={(e) => setLeetcodeHandle(e.target.value)}
                        className="bg-muted/20 border-border text-foreground focus-visible:ring-indigo-500 font-mono text-xs rounded-lg"
                      />
                    </div>

                    {/* Codeforces handle */}
                    <div className="space-y-2">
                      <Label htmlFor="codeforcesHandle" className="text-xs font-bold text-foreground/80">
                        Codeforces Username
                      </Label>
                      <Input
                        id="codeforcesHandle"
                        type="text"
                        placeholder="e.g. Tourist"
                        value={codeforcesHandle}
                        onChange={(e) => setCodeforcesHandle(e.target.value)}
                        className="bg-muted/20 border-border text-foreground focus-visible:ring-indigo-500 font-mono text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button type="submit" disabled={loading} className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-6 rounded-lg transition-transform duration-200 active:scale-95 shadow-md">
                      {loading ? "Saving Changes..." : "Save Profile Details"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Programming Cards Sidebar */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Coding Profiles</h3>

            {/* LeetCode Profile */}
            {user?.leetcodeHandle ? (
              <Card className="border border-border bg-card/45 backdrop-blur-sm overflow-hidden rounded-2xl shadow-sm">
                <div className="bg-amber-500/10 p-3.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4.5 w-4.5 text-amber-500" />
                    <span className="font-extrabold text-xs text-amber-500 uppercase tracking-wider">Leetcode Profile</span>
                  </div>
                  <a
                    href={`https://leetcode.com/${user.leetcodeHandle}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold"
                  >
                    <ExternalLink className="h-3 w-3" /> Visit
                  </a>
                </div>
                <CardContent className="p-4 space-y-2 font-sans">
                  <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Handle</p>
                  <p className="font-mono text-sm text-foreground font-bold">{user.leetcodeHandle}</p>
                  <div className="text-[10px] text-muted-foreground italic mt-2 border-t border-border pt-2.5">
                    Integrates with candidate dashboards and sheet tracking logs.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border bg-card/45 p-5 text-center rounded-2xl shadow-sm">
                <p className="text-xs text-muted-foreground italic">No LeetCode handle configured.</p>
              </Card>
            )}

            {/* Codeforces Profile */}
            {user?.codeforcesHandle ? (
              <Card className="border border-border bg-card/45 backdrop-blur-sm overflow-hidden rounded-2xl shadow-sm">
                <div className="bg-blue-500/10 p-3.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4.5 w-4.5 text-blue-500 dark:text-blue-400" />
                    <span className="font-extrabold text-xs text-blue-500 dark:text-blue-400 uppercase tracking-wider">Codeforces Stats</span>
                  </div>
                  <a
                    href={`https://codeforces.com/profile/${user.codeforcesHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold"
                  >
                    <ExternalLink className="h-3 w-3" /> Visit
                  </a>
                </div>
                <CardContent className="p-4 space-y-3.5">
                  {loadingStats ? (
                    <div className="text-center py-4 text-xs text-muted-foreground font-semibold">Loading CF stats...</div>
                  ) : cfStats ? (
                    <div className="flex items-center gap-3">
                      {cfStats.titlePhoto && (
                        <img
                          src={cfStats.titlePhoto}
                          alt="Codeforces Avatar"
                          className="h-10 w-10 rounded-lg object-cover border border-border"
                        />
                      )}
                      <div className="space-y-1">
                        <p className="font-mono text-xs text-foreground font-bold">{cfStats.handle}</p>
                        <p className="text-xs text-foreground capitalize font-bold">
                          Rank: <span className="text-blue-600 dark:text-blue-400">{cfStats.rank || "Unranked"}</span>
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                          <span>Rating: <strong className="text-foreground">{cfStats.rating || 0}</strong></span>
                          <span>Max: <strong className="text-foreground">{cfStats.maxRating || 0}</strong></span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Handle</p>
                      <p className="font-mono text-sm text-foreground font-bold">{user.codeforcesHandle}</p>
                      <p className="text-[10px] text-red-500/80 mt-1.5 font-semibold">Could not fetch live Codeforces stats. Verify handle.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border bg-card/45 p-5 text-center rounded-2xl shadow-sm">
                <p className="text-xs text-muted-foreground italic">No Codeforces handle configured.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
