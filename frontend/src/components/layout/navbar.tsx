"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brain, LayoutDashboard, LogOut, Menu, Trophy, User, Users, X, Bell, Code, Code2, MessageSquare, Star, CheckCircle2, BookOpen, BookOpenCheck, Swords, Calendar, FileText } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function Navbar() {
  const { user, logout, token } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Platform Feedback modal states
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<"General" | "Bug" | "Suggestion">("General");
  const [comments, setComments] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const dashHref = user?.role === "ADMIN" ? "/admin" : user ? "/dashboard" : "/";

  const navLinks = user ? [
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/gym", label: "Gym Leaderboard", icon: Trophy },
    { href: "/daily", label: "Daily Challenge", icon: Calendar },
    { href: dashHref, label: "Dashboard", icon: LayoutDashboard },
    { href: "/arena", label: "1v1 Arena", icon: Swords },
    { href: "/practice", label: "Practice Sheet", icon: BookOpenCheck },
    { href: "/compiler", label: "Compiler", icon: Code2 },
    { href: "/profile/resume", label: "Resume Builder", icon: FileText }
  ] : [
    { href: "/practice", label: "Practice Sheet", icon: BookOpenCheck },
    { href: "/compiler", label: "Compiler", icon: Code2 }
  ];

  const linkClass = (href: string) =>
    cn(
      "flex items-center gap-1.5 rounded-lg px-2 py-1.5 lg:px-3 lg:py-2 text-sm lg:text-base font-medium transition-all duration-200 whitespace-nowrap",
      pathname === href || pathname.startsWith(href + "/")
        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!comments.trim()) {
      toast.error("Comments cannot be empty");
      return;
    }

    setSubmittingFeedback(true);
    try {
      await api("/api/feedback", {
        method: "POST",
        token,
        body: JSON.stringify({
          rating,
          category,
          comments: comments.trim(),
        }),
      });
      setFeedbackSuccess(true);
      toast.success("Feedback submitted!");
      setComments("");
      setRating(5);
      setCategory("General");
      setTimeout(() => {
        setFeedbackOpen(false);
        setFeedbackSuccess(false);
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 min-h-14 w-full items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-indigo-500" onClick={() => setMobileOpen(false)}>
          <span className="text-lg text-foreground font-bold tracking-tight sm:text-xl">Quizzer</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:gap-1.5 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* General Platform Feedback Button (Desktop) */}
          {user && (
            <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Feedback</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border bg-card shadow-2xl max-w-sm sm:max-w-md text-foreground">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-center text-foreground">Share your Feedback</DialogTitle>
                  <DialogDescription className="text-center text-muted-foreground text-xs mt-1">
                    Help us improve Quizzer! Let us know your thoughts, report bugs, or request features.
                  </DialogDescription>
                </DialogHeader>

                {!feedbackSuccess ? (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4 pt-2">
                    
                    {/* Category Selector */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["General", "Suggestion", "Bug"] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className={cn(
                              "rounded-lg border py-2 text-sm font-semibold transition-all outline-none",
                              category === cat
                                ? "border-indigo-500 bg-indigo-600 text-white font-bold"
                                : "border-border bg-muted/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                            )}
                          >
                            {cat === "Bug" ? "🐛 Bug" : cat === "Suggestion" ? "💡 Suggestion" : "💬 General"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Rating</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="outline-none focus:outline-none transition-transform active:scale-95"
                          >
                            <Star
                              className={cn(
                                "h-6 w-6 transition-colors",
                                star <= rating
                                  ? "fill-amber-500 text-amber-500"
                                  : "text-muted-foreground/30 fill-transparent hover:text-muted-foreground"
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="space-y-1.5">
                      <label htmlFor="platformComments" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Comments & Details</label>
                      <textarea
                        id="platformComments"
                        rows={4}
                        placeholder="Write details about your suggestion, experience, or what bug you found..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        required
                        className="w-full rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-muted-foreground/50"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingFeedback}
                      className="w-full bg-indigo-600 text-white font-semibold py-2.5"
                    >
                      {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                    </Button>
                  </form>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto animate-bounce" />
                    <h3 className="font-bold text-foreground text-lg">Thank You!</h3>
                    <p className="text-xs text-muted-foreground">Your feedback has been successfully logged.</p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          <ThemeToggle />
          {user && <NotificationBell />}
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <span className="hidden max-w-[120px] truncate text-sm lg:text-base text-muted-foreground md:inline lg:max-w-[180px]">
                  {user.name}
                </span>
              </Link>
              <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login" className="text-foreground no-underline hover:text-foreground/80">
                  Login
                </Link>
              </Button>
              <Button size="sm" asChild className="bg-indigo-600 text-white hover:bg-indigo-700">
                <Link href="/signup" className="text-white no-underline">
                  Sign up
                </Link>
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href)} onClick={() => setMobileOpen(false)}>
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}

            {/* Mobile Feedback Option */}
            {user && (
              <button
                type="button"
                className={cn(linkClass(""), "w-full text-left")}
                onClick={() => {
                  setMobileOpen(false);
                  setFeedbackOpen(true);
                }}
              >
                <MessageSquare className="h-4 w-4" />
                Feedback
              </button>
            )}

            {!user && (
              <>
                <Link href="/login" className={linkClass("/login")} onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <Link href="/signup" className={linkClass("/signup")} onClick={() => setMobileOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
            {user && (
              <>
                <Link href="/profile" className={linkClass("/profile")} onClick={() => setMobileOpen(false)}>
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <button
                  type="button"
                  className={cn(linkClass(""), "w-full text-left")}
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
