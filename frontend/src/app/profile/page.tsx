"use client";

import { useEffect, useState } from "react";
import { User, Image as ImageIcon, ExternalLink, Award, Shield, Star, Globe } from "lucide-react";
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 animate-fade-in space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Account Settings</h1>
          <p className="text-neutral-400 text-sm mt-1">Manage your identity, avatar URL, and competitive programming profiles.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Edit Form Section */}
          <div className="md:col-span-2">
            <Card className="border-neutral-800 bg-neutral-950/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>Update your personal information and competitive programming handles</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center border-b border-neutral-900 pb-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-800 bg-neutral-900 shadow-inner">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-neutral-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="avatarUrl">Avatar Image URL</Label>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                        <Input
                          id="avatarUrl"
                          type="url"
                          placeholder="https://example.com/image.png"
                          className="pl-9 bg-black border-neutral-800 focus-visible:ring-violet-500"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                        />
                      </div>
                      <p className="text-[10px] text-neutral-500">
                        Paste a direct link to an image (e.g., from Imgur, Discord, or GitHub).
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Name</Label>
                      <Input
                        id="name"
                        type="text"
                        required
                        minLength={2}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-black border-neutral-800 focus-visible:ring-violet-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        disabled
                        value={user?.email || ""}
                        className="bg-neutral-900 text-neutral-500 border-neutral-850"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 border-t border-neutral-900 pt-5">
                    {/* LeetCode handle */}
                    <div className="space-y-2">
                      <Label htmlFor="leetcodeHandle" className="flex items-center gap-1.5 text-neutral-350">
                        LeetCode Username
                      </Label>
                      <Input
                        id="leetcodeHandle"
                        type="text"
                        placeholder="e.g. janesmith"
                        value={leetcodeHandle}
                        onChange={(e) => setLeetcodeHandle(e.target.value)}
                        className="bg-black border-neutral-800 focus-visible:ring-violet-500 font-mono text-xs"
                      />
                    </div>

                    {/* Codeforces handle */}
                    <div className="space-y-2">
                      <Label htmlFor="codeforcesHandle" className="flex items-center gap-1.5 text-neutral-350">
                        Codeforces Username
                      </Label>
                      <Input
                        id="codeforcesHandle"
                        type="text"
                        placeholder="e.g. Tourist"
                        value={codeforcesHandle}
                        onChange={(e) => setCodeforcesHandle(e.target.value)}
                        className="bg-black border-neutral-800 focus-visible:ring-violet-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-750 text-white font-semibold px-6">
                      {loading ? "Saving Changes..." : "Save Profile Details"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Programming Cards Sidebar */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-450">Coding Profiles</h3>

            {/* LeetCode Profile */}
            {user?.leetcodeHandle ? (
              <Card className="border-neutral-850 bg-neutral-950/20 backdrop-blur-sm overflow-hidden">
                <div className="bg-amber-500/10 p-3.5 border-b border-amber-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4.5 w-4.5 text-amber-500" />
                    <span className="font-bold text-xs text-amber-500 uppercase tracking-wider">Leetcode Profile</span>
                  </div>
                  <a
                    href={`https://leetcode.com/${user.leetcodeHandle}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] flex items-center gap-1 text-neutral-400 hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" /> Visit
                  </a>
                </div>
                <CardContent className="p-4 space-y-2 font-sans">
                  <p className="text-xs font-semibold text-neutral-300">Handle</p>
                  <p className="font-mono text-sm text-white font-bold">{user.leetcodeHandle}</p>
                  <div className="text-[10px] text-neutral-500 italic mt-2 border-t border-neutral-900/60 pt-2">
                    Integrates with candidate dashboards and sheet tracking logs.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-neutral-900 bg-neutral-950/10 p-4 text-center">
                <p className="text-xs text-neutral-500 italic">No LeetCode handle configured.</p>
              </Card>
            )}

            {/* Codeforces Profile */}
            {user?.codeforcesHandle ? (
              <Card className="border-neutral-850 bg-neutral-950/20 backdrop-blur-sm overflow-hidden">
                <div className="bg-blue-500/10 p-3.5 border-b border-blue-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4.5 w-4.5 text-blue-400" />
                    <span className="font-bold text-xs text-blue-400 uppercase tracking-wider">Codeforces Stats</span>
                  </div>
                  <a
                    href={`https://codeforces.com/profile/${user.codeforcesHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] flex items-center gap-1 text-neutral-400 hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" /> Visit
                  </a>
                </div>
                <CardContent className="p-4 space-y-3.5">
                  {loadingStats ? (
                    <div className="text-center py-4 text-xs text-neutral-500">Loading CF stats...</div>
                  ) : cfStats ? (
                    <div className="flex items-center gap-3">
                      {cfStats.titlePhoto && (
                        <img
                          src={cfStats.titlePhoto}
                          alt="Codeforces Avatar"
                          className="h-10 w-10 rounded-lg object-cover border border-neutral-800"
                        />
                      )}
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs text-neutral-400 font-bold">{cfStats.handle}</p>
                        <p className="text-xs text-white capitalize font-semibold">
                          Rank: <span className="text-blue-400">{cfStats.rank || "Unranked"}</span>
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-neutral-450">
                          <span>Rating: <strong className="text-white">{cfStats.rating || 0}</strong></span>
                          <span>Max: <strong className="text-white">{cfStats.maxRating || 0}</strong></span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-neutral-300">Handle</p>
                      <p className="font-mono text-sm text-white font-bold">{user.codeforcesHandle}</p>
                      <p className="text-[10px] text-red-400/80">Could not fetch live Codeforces stats. Verify handle.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-neutral-900 bg-neutral-950/10 p-4 text-center">
                <p className="text-xs text-neutral-500 italic">No Codeforces handle configured.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
