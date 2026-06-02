"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Key, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CodeforcesStandings {
  contest: {
    id: number;
    name: string;
  };
  problems: any[];
  rows: {
    party: { members: { handle: string }[] };
    rank: number;
    points: number;
    penalty: number;
    problemResults: { points: number }[];
  }[];
}

export default function GymLeaderboardPage() {
  const { token } = useAuth();
  const [gymId, setGymId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CodeforcesStandings | null>(null);

  const fetchStandings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !gymId) {
      toast.error("Please provide a Gym ID");
      return;
    }

    setLoading(true);
    try {
      const res = await api<CodeforcesStandings>("/api/codeforces/gym-standings", {
        method: "POST",
        token,
        body: JSON.stringify({ gymId }),
      });
      setData(res);
      toast.success("Leaderboard loaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch leaderboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl px-4 py-8 animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              Codeforces Gym Leaderboard
            </h1>
            <p className="text-muted-foreground mt-2">
              View live standings for private Codeforces Gym contests using your API keys.
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card className="border-border bg-card shadow-sm sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-500" />
                  API Credentials
                </CardTitle>
                <CardDescription>
                  Enter the Codeforces Gym Contest ID to view the standings. The platform will securely handle API access behind the scenes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={fetchStandings} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gymId">Gym Contest ID</Label>
                    <Input
                      id="gymId"
                      placeholder="e.g. 100001"
                      value={gymId}
                      onChange={(e) => setGymId(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full font-bold">
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4 mr-2" />
                    )}
                    {loading ? "Fetching..." : "View Leaderboard"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {!data && !loading && (
              <Card className="border-border bg-card/50 shadow-sm text-center py-20 h-full flex flex-col justify-center items-center">
                <Trophy className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold text-foreground">No Standings Yet</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                  Enter your Gym ID and credentials on the left to load the leaderboard.
                </p>
              </Card>
            )}

            {loading && !data && (
              <div className="flex justify-center items-center py-32 h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
            )}

            {data && (
              <Card className="border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/50">
                  <CardTitle className="text-xl">
                    {data.contest.name} 
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (ID: {data.contest.id})
                    </span>
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/20 border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-6 py-4 font-bold">Rank</th>
                        <th className="px-6 py-4 font-bold">Handle</th>
                        <th className="px-6 py-4 font-bold text-center">Score</th>
                        <th className="px-6 py-4 font-bold text-center">Penalty</th>
                        <th className="px-6 py-4 font-bold text-center">Solved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {data.rows.map((row, i) => {
                        const solvedCount = row.problemResults.filter(pr => pr.points > 0).length;
                        return (
                          <tr key={i} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                              <span className={`font-bold ${
                                row.rank === 1 ? "text-yellow-500" :
                                row.rank === 2 ? "text-gray-400" :
                                row.rank === 3 ? "text-amber-700" :
                                "text-foreground"
                              }`}>
                                #{row.rank}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-foreground">
                              {row.party.members.map(m => m.handle).join(", ")}
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-indigo-400">
                              {row.points}
                            </td>
                            <td className="px-6 py-4 text-center text-muted-foreground">
                              {row.penalty}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded px-2.5 py-0.5 font-medium text-sm">
                                {solvedCount} / {data.problems.length}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {data.rows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                            No participants found in this contest.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
