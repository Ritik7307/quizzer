"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Swords, Loader2, X, Users, UserPlus, Play } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { API_ORIGIN } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ArenaUser {
  userId: string;
  userName: string;
  socketId: string;
}

export default function ArenaLobbyPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"quick" | "active">("quick");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Easy");
  const [isQueued, setIsQueued] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [connecting, setConnecting] = useState(true);
  
  const [onlineUsers, setOnlineUsers] = useState<ArenaUser[]>([]);
  const [incomingChallenge, setIncomingChallenge] = useState<any>(null);
  const [outgoingChallenge, setOutgoingChallenge] = useState<any>(null);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection on mount
  useEffect(() => {
    if (!user || !token) return;

    const socket = io(API_ORIGIN, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnecting(false);
      console.log("[Arena] Connected to Socket.IO server");
      socket.emit("arena:enter", { userId: user.id, userName: user.name });
    });

    socket.on("arena:online-users", (users: ArenaUser[]) => {
      setOnlineUsers(users.filter(u => u.userId !== user.id)); // Don't show self
    });

    socket.on("arena:error", ({ message }) => {
      toast.error(message || "An arena error occurred");
      leaveQueue();
      setOutgoingChallenge(null);
    });

    socket.on("match:found", (data) => {
      toast.success("Match Found! Redirecting to Battle Arena...");
      sessionStorage.setItem(`quizer:match:${data.matchId}`, JSON.stringify(data));
      router.push(`/arena/battle/${data.matchId}`);
    });

    socket.on("match:restore", (data) => {
      toast.success("Active Match Restored! Reconnecting...");
      sessionStorage.setItem(`quizer:match:${data.matchId}`, JSON.stringify(data));
      router.push(`/arena/battle/${data.matchId}`);
    });

    socket.on("arena:challenge:receive", (data) => {
      setIncomingChallenge(data);
    });

    socket.on("arena:challenge:rejected", ({ userName }) => {
      toast.error(`${userName} rejected your challenge.`);
      setOutgoingChallenge(null);
    });

    socket.on("disconnect", () => {
      setConnecting(true);
      console.log("[Arena] Disconnected from server");
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.disconnect();
    };
  }, [user, token, router]);

  const joinQueue = () => {
    if (!user || !token || !socketRef.current) return;
    
    socketRef.current.emit("arena:join", {
      userId: user.id,
      userName: user.name,
      difficulty,
    });

    setIsQueued(true);
    setQueueTime(0);

    timerRef.current = setInterval(() => {
      setQueueTime((prev) => prev + 1);
    }, 1000);

    toast.info(`Queued for a 1v1 ${difficulty} battle!`);
  };

  const leaveQueue = () => {
    if (socketRef.current && user) {
      socketRef.current.emit("arena:leave", { userId: user.id });
    }
    setIsQueued(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const sendChallenge = (targetUser: ArenaUser) => {
    if (!socketRef.current) return;
    socketRef.current.emit("arena:challenge:send", {
      targetSocketId: targetUser.socketId,
      difficulty,
    });
    setOutgoingChallenge(targetUser);
    toast.success(`Challenge sent to ${targetUser.userName}!`);
  };

  const acceptChallenge = () => {
    if (!socketRef.current || !incomingChallenge) return;
    socketRef.current.emit("arena:challenge:accept", {
      challengerSocketId: incomingChallenge.challengerSocketId,
      difficulty: incomingChallenge.difficulty,
    });
    toast.success("Challenge accepted! Generating match...");
    setIncomingChallenge(null);
  };

  const rejectChallenge = () => {
    if (!socketRef.current || !incomingChallenge) return;
    socketRef.current.emit("arena:challenge:reject", {
      challengerSocketId: incomingChallenge.challengerSocketId,
    });
    setIncomingChallenge(null);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <ProtectedRoute role="CANDIDATE">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-16 text-foreground bg-background min-h-[calc(100vh-4rem)] flex items-start justify-center">
        
        {/* Main Interface */}
        {!isQueued && !outgoingChallenge && !incomingChallenge && (
          <div className="w-full max-w-2xl space-y-6">
            <div className="flex gap-4 border-b border-border pb-px">
              {[
                { id: "quick", label: "Quick Match", icon: Swords },
                { id: "active", label: "Active Players", icon: Users, badge: onlineUsers.length },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={cn(
                    "group flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all select-none focus:outline-none",
                    activeTab === t.id
                      ? "border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <t.icon className={cn("h-4.5 w-4.5 transition-colors", activeTab === t.id ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground group-hover:text-foreground")} />
                  {t.label}
                  {t.badge !== undefined && (
                    <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-xs py-0.5 px-2 rounded-full ml-1">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Quick Match Tab */}
            {activeTab === "quick" && (
              <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden p-6 animate-fade-in">
                <CardHeader className="text-center pb-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Swords className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                    1v1 Quick Match
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-2">
                    Race head-to-head against a random opponent of similar skill.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground block text-center">
                      Select Question Difficulty
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["Easy", "Medium", "Hard"] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setDifficulty(diff)}
                          className={cn("rounded-lg border py-3 text-sm font-medium transition-colors duration-200 shadow-sm outline-none", difficulty === diff ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 ring-1 ring-indigo-500" : "border-border bg-card text-muted-foreground hover:bg-muted")}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={joinQueue}
                    disabled={connecting}
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-medium py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                    {connecting ? "Connecting to Arena..." : "Find Opponent"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Active Players Tab */}
            {activeTab === "active" && (
              <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden animate-fade-in">
                <CardHeader className="bg-muted/30 border-b border-border/40">
                  <CardTitle className="text-base font-bold text-foreground">Active Arena Players</CardTitle>
                  <CardDescription>Challenge users currently looking for a match.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {onlineUsers.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground space-y-3">
                      <Users className="h-10 w-10 mx-auto text-muted-foreground/50" />
                      <p>No other players are currently online in the arena.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {onlineUsers.map((u) => (
                        <div key={u.userId} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-sm">
                              {u.userName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{u.userName}</p>
                              <p className="text-[10px] text-emerald-500 font-bold uppercase flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Online
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={difficulty}
                              onChange={(e) => setDifficulty(e.target.value as any)}
                              className="text-xs bg-background border border-border rounded px-2 py-1.5 outline-none"
                            >
                              <option value="Easy">Easy</option>
                              <option value="Medium">Medium</option>
                              <option value="Hard">Hard</option>
                            </select>
                            <Button size="sm" onClick={() => sendChallenge(u)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs">
                              <Swords className="h-3 w-3" /> Challenge
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Queued State */}
        {isQueued && (
          <Card className="max-w-md w-full border border-border bg-card shadow-sm rounded-xl overflow-hidden p-6 text-center animate-fade-in">
            <CardHeader className="pb-8">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <CardTitle className="text-xl font-bold text-foreground">
                Searching for Opponent...
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-2 font-medium">
                Difficulty: {difficulty} &middot; Time: {formatTime(queueTime)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 border border-border p-3 rounded-lg">
                Looking for a matching developer...
              </div>
              <Button
                variant="outline"
                onClick={leaveQueue}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" /> Cancel Matchmaking
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Outgoing Challenge State */}
        {outgoingChallenge && !isQueued && (
          <Card className="max-w-md w-full border border-border bg-card shadow-sm rounded-xl overflow-hidden p-6 text-center animate-fade-in">
            <CardHeader className="pb-8">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <CardTitle className="text-xl font-bold text-foreground">
                Challenge Sent!
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-2 font-medium">
                Waiting for {outgoingChallenge.userName} to respond...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                variant="outline"
                onClick={() => setOutgoingChallenge(null)}
                className="w-full border-border hover:bg-muted font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" /> Cancel Challenge
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Incoming Challenge Modal (Overlay) */}
        {incomingChallenge && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-2 border-indigo-500 shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95">
              <CardHeader className="bg-indigo-50 dark:bg-indigo-900/20 text-center pb-6 border-b border-indigo-100 dark:border-indigo-900/50">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                  <Swords className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-black tracking-tight text-indigo-950 dark:text-indigo-100 uppercase">
                  Challenge Received!
                </CardTitle>
                <CardDescription className="text-base text-indigo-700 dark:text-indigo-300 mt-2 font-medium">
                  <strong>{incomingChallenge.challengerName}</strong> has challenged you to a {incomingChallenge.difficulty} battle!
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-3">
                  <Button
                    onClick={rejectChallenge}
                    variant="outline"
                    className="w-1/2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 py-6"
                  >
                    <X className="mr-2 h-4 w-4" /> Decline
                  </Button>
                  <Button
                    onClick={acceptChallenge}
                    className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white py-6 shadow-lg shadow-indigo-600/20"
                  >
                    <Play className="mr-2 h-4 w-4 fill-current" /> Accept
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
