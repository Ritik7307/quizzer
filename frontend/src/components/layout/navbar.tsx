"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brain, LayoutDashboard, LogOut, Menu, Trophy, User, Users, X, Bell, Code, MessageSquare, Star, CheckCircle2, BookOpen } from "lucide-react";
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
      { href: "/practice", label: "Practice Sheet", icon: BookOpen },
      { href: "/compiler", label: "Compiler", icon: Code },
      { href: "/codeforces-gym", label: "CF Gym", icon: Trophy }
    ] : []),
    ...(user?.role === "ADMIN" ? [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/coding/new", label: "Add Code Q", icon: Code }
    ] : []),
  ];

  const linkClass = (href: string) =>
    cn(
      "flex items-center gap-1.5 rounded-lg px-2 py-1.5 lg:px-3 lg:py-2 text-xs lg:text-sm font-medium transition-colors whitespace-nowrap",
      pathname === href || pathname.startsWith(href + "/")
        ? "bg-indigo--white"
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 min-h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-indigo-400" onClick={() => setMobileOpen(false)}>
          <span className="text-base text-slate-900 sm:text-lg">Quizzer</span>
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
                  className="hidden md:flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Feedback</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="border-slate-200 bg-white shadow-2xl max-w-sm sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-center">Share your Feedback</DialogTitle>
                  <DialogDescription className="text-center text-slate-500 text-xs mt-1">
                    Help us improve Quizzer! Let us know your thoughts, report bugs, or request features.
                  </DialogDescription>
                </DialogHeader>

                {!feedbackSuccess ? (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4 pt-2">
                    
                    {/* Category Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Category</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["General", "Suggestion", "Bug"] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className={cn(
                              "rounded-lg border py-2 text-xs font-semibold transition-all outline-none",
                              category === cat
                                ? "border-indigo-500 bg-indigo--white font-bold"
                                : "border-slate-200 bg-white/40 text-slate-600 hover:border-neutral-750"
                            )}
                          >
                            {cat === "Bug" ? "🐛 Bug" : cat === "Suggestion" ? "💡 Suggestion" : "💬 General"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Rating</label>
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
                                  : "text-neutral-700 fill-transparent hover:text-slate-500"
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="space-y-1.5">
                      <label htmlFor="platformComments" className="text-xs font-bold uppercase tracking-wider text-slate-600">Comments & Details</label>
                      <textarea
                        id="platformComments"
                        rows={4}
                        placeholder="Write details about your suggestion, experience, or what bug you found..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/40 p-3 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingFeedback}
                      className="w-full bg-indigo--white font-semibold py-2.5"
                    >
                      {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                    </Button>
                  </form>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto animate-bounce" />
                    <h3 className="font-bold text-slate-900 text-lg">Thank You!</h3>
                    <p className="text-xs text-slate-600">Your feedback has been successfully logged.</p>
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <span className="hidden max-w-[120px] truncate text-sm text-slate-600 md:inline lg:max-w-[180px]">
                  {user.name}
                </span>
              </Link>
              <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex border-neutral-750 text-slate-700 hover:bg-slate-50">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login" className="text-slate-800 no-underline hover:text-slate-900">
                  Login
                </Link>
              </Button>
              <Button size="sm" asChild className="bg-indigo--white">
                <Link href="/signup" className="text-slate-900 no-underline">
                  Sign up
                </Link>
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-600"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 md:hidden">
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
