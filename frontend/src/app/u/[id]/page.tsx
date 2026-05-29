"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { User, Award, Shield, Trophy, Users, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";

export default function PublicProfilePage() {
  const { id } = useParams() as { id: string };
  const { user: currentUser, token } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await api<any>(`/api/users/${id}/profile`);
        setProfile(data);
      } catch (err) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [id]);

  // Check if following (this is a bit rudimentary, ideally backend returns it)
  // For now, if we have a way to know, we'd set it. We'll just allow them to try following and catch errors.
  
  async function toggleFollow() {
    if (!token) {
      toast.error("You must be logged in to follow users");
      return;
    }
    setFollowLoading(true);
    try {
      if (following) {
        await api(`/api/users/${id}/follow`, { method: "DELETE", token });
        setFollowing(false);
        setProfile((p: any) => ({ ...p, _count: { ...p._count, followers: p._count.followers - 1 } }));
        toast.success("Unfollowed user");
      } else {
        await api(`/api/users/${id}/follow`, { method: "POST", token });
        setFollowing(true);
        setProfile((p: any) => ({ ...p, _count: { ...p._count, followers: p._count.followers + 1 } }));
        toast.success("Followed user");
      }
    } catch (err: any) {
      if (err.message === "Already following this user") {
        setFollowing(true);
      } else {
        toast.error(err.message || "Failed to follow/unfollow");
      }
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground animate-pulse">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="text-center py-20 text-red-500">User not found.</div>;
  }

  const tier = profile.points >= 200 ? "PRO DEV" : profile.points >= 50 ? "SPECIALIST" : "APPRENTICE";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 animate-fade-in space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-border pb-8">
        <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-indigo-500/20 bg-card shadow-xl">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
          ) : (
            <User className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 text-center sm:text-left space-y-3">
          <h1 className="text-3xl font-black text-foreground">{profile.name}</h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold">
              <Users className="h-4 w-4" /> {profile._count.followers} Followers
            </div>
            <div className="flex items-center gap-1.5 font-semibold">
              <Users className="h-4 w-4" /> {profile._count.following} Following
            </div>
            <div className="flex items-center gap-1.5 font-semibold">
              <Check className="h-4 w-4 text-emerald-500" /> {profile._count.codingSubmissions} Solved
            </div>
          </div>
          {currentUser && currentUser.id !== profile.id && (
            <Button 
              onClick={toggleFollow} 
              disabled={followLoading}
              variant={following ? "outline" : "default"}
              className={`mt-2 font-bold shadow-sm ${!following && "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
            >
              {following ? "Following" : <><UserPlus className="h-4 w-4 mr-2" /> Follow</>}
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-border bg-card/45 backdrop-blur-md p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">Points</span>
            <p className="text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">{profile.points}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/15">
            <Award className="h-6 w-6" />
          </div>
        </Card>

        <Card className="border border-border bg-card/45 backdrop-blur-md p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">Streak</span>
            <p className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">{profile.streak}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/15">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M8 14l2 2 4-4" /></svg>
          </div>
        </Card>

        <Card className="border border-border bg-card/45 backdrop-blur-md p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">Tier</span>
            <p className="text-xl font-black tracking-tight text-amber-500 mt-1">{tier}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/15">
            <Trophy className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Badges Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Badges & Achievements</h3>
        {profile.userBadges?.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {profile.userBadges.map((ub: any) => (
              <Card key={ub.id} className="border border-border bg-card/45 p-4 flex items-center gap-3 rounded-2xl">
                <div className="h-10 w-10 bg-indigo-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <p className="font-bold text-sm">{ub.badge.name}</p>
                  <p className="text-xs text-muted-foreground">{ub.badge.description}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 border border-border rounded-2xl bg-muted/10 text-center text-sm text-muted-foreground font-semibold">
            This user hasn't earned any badges yet.
          </div>
        )}
      </div>
    </div>
  );
}
