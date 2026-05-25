"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brain, LayoutDashboard, LogOut, Menu, Trophy, User, Users, X, Bell, Code, MessageSquare, Star, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";
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

  const navLinks = [
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ...(user ? [
      { href: dashHref, label: "Dashboard", icon: LayoutDashboard },
      { href: "/compiler", label: "Compiler", icon: Code }
    ] : []),
    ...(user?.role === "ADMIN" ? [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/coding/new", label: "Add Code Q", icon: Code }
    ] : []),
  ];

  const linkClass = (href: string) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      pathname === href || pathname.startsWith(href + "/")
        ? "bg-violet-600/20 text-violet-400"
        : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
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
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 min-h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-violet-400" onClick={() => setMobileOpen(false)}>
          <Brain className="h-6 w-6 sm:h-7 sm:w-7" />
          <span className="text-base text-white sm:text-lg">Quizzer</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
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
                  className="hidden md:flex items-center gap-1.5 text-neutral-400 hover:text-white"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Feedback</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="border-neutral-800 bg-neutral-900 shadow-2xl max-w-sm sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-center">Share your Feedback</DialogTitle>
                  <DialogDescription className="text-center text-neutral-450 text-xs mt-1">
                    Help us improve Quizzer! Let us know your thoughts, report bugs, or request features.
                  </DialogDescription>
                </DialogHeader>

                {!feedbackSuccess ? (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4 pt-2">
                    
                    {/* Category Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Category</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["General", "Suggestion", "Bug"] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className={cn(
                              "rounded-lg border py-2 text-xs font-semibold transition-all outline-none",
                              category === cat
                                ? "border-violet-500 bg-violet-950/40 text-white font-bold"
                                : "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-750"
                            )}
                          >
                            {cat === "Bug" ? "🐛 Bug" : cat === "Suggestion" ? "💡 Suggestion" : "💬 General"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Rating</label>
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
                                  : "text-neutral-700 fill-transparent hover:text-neutral-500"
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="space-y-1.5">
                      <label htmlFor="platformComments" className="text-xs font-bold uppercase tracking-wider text-neutral-400">Comments & Details</label>
                      <textarea
                        id="platformComments"
                        rows={4}
                        placeholder="Write details about your suggestion, experience, or what bug you found..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        required
                        className="w-full rounded-lg border border-neutral-800 bg-black/40 p-3 text-sm text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingFeedback}
                      className="w-full bg-violet-600 hover:bg-violet-750 text-white font-semibold py-2.5"
                    >
                      {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                    </Button>
                  </form>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto animate-bounce" />
                    <h3 className="font-bold text-neutral-100 text-lg">Thank You!</h3>
                    <p className="text-xs text-neutral-400">Your feedback has been successfully logged.</p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          {user && <NotificationBell />}
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/20 text-violet-400">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <span className="hidden max-w-[120px] truncate text-sm text-neutral-400 md:inline lg:max-w-[180px]">
                  {user.name}
                </span>
              </Link>
              <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex border-neutral-750 text-neutral-300 hover:bg-neutral-850">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login" className="text-neutral-200 no-underline hover:text-white">
                  Login
                </Link>
              </Button>
              <Button size="sm" asChild className="bg-violet-600 hover:bg-violet-750 font-semibold text-white">
                <Link href="/signup" className="text-white no-underline">
                  Sign up
                </Link>
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-neutral-400"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-neutral-800 bg-black px-4 py-3 md:hidden">
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
