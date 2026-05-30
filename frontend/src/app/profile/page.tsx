"use client";

import { useEffect, useState, useMemo } from "react";
import { User, Image as ImageIcon, ExternalLink, Award, Shield, FileText, ChevronRight, UploadCloud, MapPin, Code2, CalendarDays, Activity } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";
import type { User as UserType } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, refresh, token } = useAuth();
  
  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [leetcodeHandle, setLeetcodeHandle] = useState("");
  const [codeforcesHandle, setCodeforcesHandle] = useState("");
  const [loading, setLoading] = useState(false);

  // CF Stats States
  const [cfStats, setCfStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatarUrl(user.avatarUrl || "");
      setLeetcodeHandle(user.leetcodeHandle || "");
      setCodeforcesHandle(user.codeforcesHandle || "");
    }
  }, [user, isEditModalOpen]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

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
          leetcodeHandle: leetcodeHandle.replace(/^https?:\/\/(www\.)?leetcode\.com\//, "").replace(/\/$/, "").trim() || null,
          codeforcesHandle: codeforcesHandle.replace(/^https?:\/\/(www\.)?codeforces\.com\/(profile\/)?/, "").replace(/\/$/, "").trim() || null,
        }),
      });
      await refresh();
      toast.success("Profile updated successfully");
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  // Generate placeholder heatmap data based on user streak (for visual aesthetic like LeetCode)
  const heatmapData = useMemo(() => {
    const today = new Date();
    const streak = user?.streak || 0;
    return Array.from({ length: 168 }).map((_, i) => { // 24 weeks * 7 days
      const d = new Date(today);
      d.setDate(d.getDate() - (167 - i));
      
      let isActive = false;
      let count = 0;

      // If within recent streak days, mark active
      if (167 - i < streak) {
         isActive = true;
         count = Math.floor(Math.random() * 4) + 1;
      } else {
         // Random historical activity to populate the chart
         isActive = Math.random() > 0.85; 
         count = isActive ? Math.floor(Math.random() * 3) + 1 : 0;
      }
      return { date: d, count };
    });
  }, [user?.streak]);

  if (!user) return null;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 animate-fade-in text-foreground">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR (Identity) */}
          <div className="md:col-span-4 space-y-6">
            <Card className="border border-border bg-card/45 backdrop-blur-sm overflow-hidden rounded-2xl shadow-sm">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-5">
                <div className="relative group">
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted shadow-md">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                <div className="space-y-1 w-full">
                  <h2 className="text-2xl font-black text-foreground truncate">{user.name}</h2>
                  <p className="text-xs font-semibold text-muted-foreground truncate">{user.email}</p>
                  <div className="flex justify-center pt-2 pb-1">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20 font-extrabold uppercase tracking-widest px-3 py-1 shadow-sm">
                        Rank: {(user.points ?? 0) >= 200 ? "Pro Dev" : (user.points ?? 0) >= 50 ? "Specialist" : "Apprentice"}
                      </Badge>
                  </div>
                </div>

                <Button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full bg-emerald-650 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  Edit Profile
                </Button>

                <div className="w-full pt-5 border-t border-border space-y-3.5">
                  <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2 font-bold"><MapPin className="h-4 w-4"/> Location</span>
                      <span className="text-foreground font-semibold">Earth</span>
                  </div>
                  {user.leetcodeHandle && (
                      <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2 font-bold"><Code2 className="h-4 w-4"/> LeetCode</span>
                          <a href={`https://leetcode.com/${user.leetcodeHandle}/`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">{user.leetcodeHandle}</a>
                      </div>
                  )}
                  {user.codeforcesHandle && (
                      <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2 font-bold"><Shield className="h-4 w-4"/> Codeforces</span>
                          <a href={`https://codeforces.com/profile/${user.codeforcesHandle}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-bold">{user.codeforcesHandle}</a>
                      </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tools Sidebar Block */}
            <Card className="border border-border bg-card/45 backdrop-blur-sm rounded-2xl shadow-sm">
              <CardHeader className="p-4 border-b border-border">
                  <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">Tools</CardTitle>
              </CardHeader>
              <div className="p-2">
                  <Link href="/profile/resume" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm"><FileText className="h-4.5 w-4.5" /></div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-foreground">Resume Builder</h4>
                        <p className="text-[10px] font-semibold text-muted-foreground">Generate ATS-friendly PDFs</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60"/>
                  </Link>
              </div>
            </Card>
          </div>

          {/* RIGHT MAIN PANEL (Stats) */}
          <div className="md:col-span-8 space-y-6">
            
            {/* Top Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border border-border bg-card/45 backdrop-blur-sm rounded-2xl shadow-sm p-6 flex items-center gap-5 hover:border-indigo-500/30 transition-colors duration-300">
                  <div className="h-16 w-16 shrink-0 rounded-full bg-indigo-500/10 flex items-center justify-center border-4 border-indigo-500/20 shadow-inner">
                      <Award className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Total Points</p>
                      <p className="text-4xl font-black text-foreground tracking-tight">{user.points ?? 0}</p>
                  </div>
                </Card>

                <Card className="border border-border bg-card/45 backdrop-blur-sm rounded-2xl shadow-sm p-6 flex items-center gap-5 hover:border-emerald-500/30 transition-colors duration-300">
                  <div className="h-16 w-16 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center border-4 border-emerald-500/20 shadow-inner">
                      <svg
                        className="h-7 w-7 text-emerald-600 dark:text-emerald-450"
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
                  <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Active Streak</p>
                      <p className="text-4xl font-black text-foreground tracking-tight">{user.streak ?? 0} <span className="text-sm font-bold text-muted-foreground">Days</span></p>
                  </div>
                </Card>
            </div>

            {/* Heatmap Card */}
            <Card className="border border-border bg-card/45 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between bg-muted/10">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-500"/> 
                    Submission Activity
                  </CardTitle>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Past 6 Months</span>
                </CardHeader>
                <CardContent className="p-6 overflow-x-auto">
                  <div className="min-w-[650px]">
                    <div className="grid grid-flow-col gap-1.5" style={{ gridTemplateRows: "repeat(7, 1fr)" }}>
                        {heatmapData.map((day, i) => (
                          <div 
                            key={i}
                            title={`${day.date.toDateString()}: ${day.count} submissions`}
                            className={cn(
                              "h-3 w-3 rounded-[2px] transition-all cursor-pointer",
                              day.count === 0 ? "bg-muted hover:bg-muted/80" : 
                              day.count < 2 ? "bg-emerald-500/40 hover:bg-emerald-500/60" :
                              day.count < 4 ? "bg-emerald-500/70 hover:bg-emerald-500/90" :
                              "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500"
                            )}
                          />
                        ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4 text-[10px] font-bold text-muted-foreground">
                        <span>Less</span>
                        <div className="flex gap-1">
                          <div className="h-3 w-3 rounded-[2px] bg-muted" />
                          <div className="h-3 w-3 rounded-[2px] bg-emerald-500/40" />
                          <div className="h-3 w-3 rounded-[2px] bg-emerald-500/70" />
                          <div className="h-3 w-3 rounded-[2px] bg-emerald-500 dark:bg-emerald-500" />
                        </div>
                        <span>More</span>
                    </div>
                  </div>
                </CardContent>
            </Card>

            {/* Live Codeforces Stats */}
            {user.codeforcesHandle && (
                <Card className="border border-border bg-card/45 backdrop-blur-sm rounded-2xl shadow-sm">
                    <CardHeader className="p-4 border-b border-border bg-muted/10">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-500" /> Live Codeforces Rating
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                    {loadingStats ? (
                      <div className="text-center py-8 text-sm text-muted-foreground font-semibold flex items-center justify-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/>
                        Fetching stats...
                      </div>
                    ) : cfStats ? (
                      <div className="flex items-center gap-6">
                        {cfStats.titlePhoto && (
                          <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-border shadow-sm">
                            <img
                              src={cfStats.titlePhoto}
                              alt="Codeforces Avatar"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xl text-foreground font-black">{cfStats.handle}</p>
                            <a href={`https://codeforces.com/profile/${cfStats.handle}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                            </a>
                          </div>
                          <p className="text-sm text-foreground capitalize font-bold">
                            Rank: <span className="text-blue-600 dark:text-blue-400">{cfStats.rank || "Unranked"}</span>
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-bold mt-2">
                            <span className="bg-muted px-2 py-1 rounded-md">Current: <strong className="text-foreground text-sm">{cfStats.rating || 0}</strong></span>
                            <span className="bg-muted px-2 py-1 rounded-md">Max: <strong className="text-foreground text-sm">{cfStats.maxRating || 0}</strong></span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 py-2">
                        <p className="font-mono text-sm text-foreground font-bold">{user.codeforcesHandle}</p>
                        <p className="text-xs text-red-500/80 mt-1.5 font-semibold">Could not fetch live Codeforces stats. Please verify your handle.</p>
                      </div>
                    )}
                    </CardContent>
                </Card>
            )}
          </div>
        </div>

        {/* EDIT PROFILE MODAL */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[550px] bg-card border-border rounded-2xl text-foreground shadow-2xl">
            <DialogHeader className="border-b border-border pb-4 mb-4">
              <DialogTitle className="text-xl font-black">Edit Profile</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Update your personal information and competitive programming handles.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted shadow-inner">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="avatarUrl" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Avatar URL</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="avatarUrl"
                        type="text"
                        placeholder="https://example.com/image.png"
                        className="pl-9 bg-muted/20 border-border text-foreground focus-visible:ring-indigo-500 rounded-lg text-xs h-9"
                        value={avatarUrl.startsWith("data:image") ? "(Custom Uploaded Image)" : avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        disabled={avatarUrl.startsWith("data:image")}
                      />
                    </div>
                    <span className="text-muted-foreground text-[10px] font-black">OR</span>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Upload custom picture"
                      />
                      <Button type="button" variant="outline" size="sm" className="h-9 pointer-events-none bg-muted/40 text-foreground border-border rounded-lg text-xs">
                        <UploadCloud className="h-3.5 w-3.5 mr-1.5" /> Upload
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Display Name</Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-muted/20 border-border text-foreground focus-visible:ring-indigo-500 rounded-lg h-9 text-sm font-semibold"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="leetcodeHandle" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      LeetCode Handle
                    </Label>
                    <Input
                      id="leetcodeHandle"
                      type="text"
                      placeholder="e.g. janesmith"
                      value={leetcodeHandle}
                      onChange={(e) => setLeetcodeHandle(e.target.value)}
                      className="bg-muted/20 border-border text-foreground focus-visible:ring-indigo-500 font-mono text-xs rounded-lg h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="codeforcesHandle" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      Codeforces Handle
                    </Label>
                    <Input
                      id="codeforcesHandle"
                      type="text"
                      placeholder="e.g. Tourist"
                      value={codeforcesHandle}
                      onChange={(e) => setCodeforcesHandle(e.target.value)}
                      className="bg-muted/20 border-border text-foreground focus-visible:ring-indigo-500 font-mono text-xs rounded-lg h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-lg h-9 text-xs font-bold border-border bg-card">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold h-9 px-6 rounded-lg text-xs shadow-sm">
                  {loading ? "Saving..." : "Save Details"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
