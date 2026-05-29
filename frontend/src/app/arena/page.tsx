"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Swords, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { API_ORIGIN } from "@/lib/api";

export default function ArenaLobbyPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Easy");
  const [isQueued, setIsQueued] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [connecting, setConnecting] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  const connectSocket = () => {
    if (socketRef.current) return socketRef.current;

    setConnecting(true);
    const socket = io(API_ORIGIN, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnecting(false);
      console.log("[Arena] Connected to Socket.IO server");
    });

    socket.on("arena:error", ({ message }) => {
      toast.error(message || "An arena error occurred");
      leaveQueue();
    });

    socket.on("match:found", (data) => {
      toast.success("Match Found! Redirecting to Battle Arena...");
      // Save details to sessionStorage to load on next page
      sessionStorage.setItem(`quizer:match:${data.matchId}`, JSON.stringify(data));
      router.push(`/arena/battle/${data.matchId}`);
    });

    socket.on("match:restore", (data) => {
      toast.success("Active Match Restored! Reconnecting...");
      sessionStorage.setItem(`quizer:match:${data.matchId}`, JSON.stringify(data));
      router.push(`/arena/battle/${data.matchId}`);
    });

    socket.on("disconnect", () => {
      setConnecting(false);
      console.log("[Arena] Disconnected from server");
    });

    return socket;
  };

  const joinQueue = () => {
    if (!user || !token) {
      toast.error("You must be logged in to join the coding arena.");
      return;
    }

    const socket = connectSocket();

    socket.emit("arena:join", {
      userId: user.id,
      userName: user.name,
      difficulty,
    });

    setIsQueued(true);
    setQueueTime(0);

    // Start timer ticker
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

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <ProtectedRoute role="CANDIDATE">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-16 text-foreground bg-background min-h-[calc(100vh-4rem)] flex items-center justify-center">
        {!isQueued ? (
          <Card className="max-w-md w-full border border-border bg-card shadow-sm rounded-xl overflow-hidden p-6">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                <Swords className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                1v1 Coding Arena
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-2">
                Race head-to-head against another candidate to solve a random programming problem first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Difficulty Selection */}
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
                      className={`rounded-lg border py-3 text-sm font-medium transition-colors duration-200 shadow-sm outline-none ${
                        difficulty === diff
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 ring-1 ring-indigo-500"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={joinQueue}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-medium py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Swords className="h-4 w-4" /> Find Opponent
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Matchmaking queue page */
          <Card className="max-w-md w-full border border-border bg-card shadow-sm rounded-xl overflow-hidden p-6 text-center">
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
                {connecting ? (
                  "Connecting to Arena Server..."
                ) : (
                  "Looking for a matching developer..."
                )}
              </div>

              <Button
                variant="outline"
                onClick={leaveQueue}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" /> Cancel Matchmaking
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
