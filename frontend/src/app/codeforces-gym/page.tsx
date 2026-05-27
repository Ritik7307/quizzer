"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Trophy, Search, Loader2, Users, Code, Award, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CFStandings {
  contest: {
    name: string;
    phase: string;
    type: string;
    durationSeconds: number;
  };
  problems: {
    index: string;
    name: string;
  }[];
  rows: {
    party: {
      teamName?: string;
      members: { handle: string }[];
    };
    rank: number;
    points: number;
    penalty: number;
    successfulHackCount: number;
    unsuccessfulHackCount: number;
    problemResults: {
      points: number;
      penalty?: number;
      rejectedAttemptCount: number;
      type: string;
    }[];
  }[];
}

export default function CodeforcesGymPage() {
  const [gymId, setGymId] = useState("");
  const [loading, setLoading] = useState(false);
  const [standings, setStandings] = useState<CFStandings | null>(null);

  const fetchStandings = async () => {
    if (!gymId) {
      toast.error("Please enter a Gym/Contest ID");
      return;
    }

    setLoading(true);
    setStandings(null);

    try {
      const res = await fetch(`https://codeforces.com/api/contest.standings?contestId=${gymId}`);
      const data = await res.json();

      if (data.status === "OK") {
        setStandings(data.result);
      } else {
        throw new Error(data.comment || "Failed to fetch standings");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not fetch contest data. Make sure the ID is correct and public.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-neutral-900 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl flex items-center gap-2">
              <Trophy className="h-7 w-7 text-yellow-500" />
              Codeforces Gym Leaderboard
            </h1>
            <p className="mt-2 text-sm text-neutral-450">
              Enter a Codeforces Contest or Gym ID to view real-time standings for your juniors.
            </p>
          </div>
          
          <div className="flex items-center gap-3 max-w-lg mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="e.g. 123456"
                value={gymId}
                onChange={(e) => setGymId(e.target.value)}
                className="pl-10 border-neutral-800 bg-neutral-900/50 text-white"
                onKeyDown={(e) => e.key === "Enter" && fetchStandings()}
              />
            </div>
            <Button 
              onClick={fetchStandings} 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
            </Button>
          </div>
        </div>

        {/* Results */}
        {standings && (
          <div className="space-y-6">
            <Card className="transition-all duration-300 border-neutral-800/60 bg-neutral-900/40 backdrop-blur-md hover:border-indigo-500/30 backdrop-blur-md">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-white">
                      {standings.contest.name}
                    </CardTitle>
                    <CardDescription className="text-neutral-400 mt-1">
                      Phase: {standings.contest.phase} • Duration: {Math.floor(standings.contest.durationSeconds / 60)} mins
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-500/10 w-fit">
                    {standings.contest.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-neutral-300">
                    <thead className="bg-neutral-900/50 text-xs uppercase text-neutral-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold rounded-tl-lg">Rank</th>
                        <th className="px-4 py-3 font-semibold">Participant</th>
                        <th className="px-4 py-3 font-semibold text-center">Score</th>
                        {standings.problems.map((p) => (
                          <th key={p.index} className="px-4 py-3 font-semibold text-center" title={p.name}>
                            {p.index}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                      {standings.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-neutral-800/20 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`font-bold ${row.rank <= 3 ? "text-yellow-500" : "text-neutral-300"}`}>
                              #{row.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-white">
                            {row.party.teamName ? (
                              <span title={row.party.members.map(m => m.handle).join(", ")}>
                                {row.party.teamName} <span className="text-xs text-neutral-500">({row.party.members.length})</span>
                              </span>
                            ) : (
                              row.party.members[0].handle
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-indigo-400">
                            {row.points}
                          </td>
                          {row.problemResults.map((pr, j) => (
                            <td key={j} className="px-4 py-3 text-center">
                              {pr.points > 0 ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-green-500 font-bold">+{pr.rejectedAttemptCount || ""}</span>
                                  {pr.penalty && pr.penalty > 0 && (
                                    <span className="text-[10px] text-neutral-500">{pr.penalty}</span>
                                  )}
                                </div>
                              ) : pr.rejectedAttemptCount > 0 ? (
                                <span className="text-red-500 font-bold">-{pr.rejectedAttemptCount}</span>
                              ) : (
                                <span className="text-neutral-600">-</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {standings.rows.length === 0 && (
                        <tr>
                          <td colSpan={standings.problems.length + 3} className="px-4 py-8 text-center text-neutral-500 italic">
                            No participants found in this contest yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
