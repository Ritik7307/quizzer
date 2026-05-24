"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brain, LayoutDashboard, LogOut, Menu, Trophy, User, Users, X, Bell, Code } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
              <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex">
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
              <Button size="sm" asChild>
                <Link href="/signup" className="text-white no-underline">
                  Sign up
                </Link>
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
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
