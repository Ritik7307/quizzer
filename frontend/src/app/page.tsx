import Link from "next/link";
import { ArrowRight, BarChart3, Clock, Shield, Users, BookOpen, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-neutral-950 via-black to-black px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl text-center animate-fade-in">
          <p className="mb-4 inline-flex rounded-full bg-indigo-900/40 px-4 py-1 text-xs font-medium text-indigo-300 sm:text-sm">
            Development Upskilling Series
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">Quizzer</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-700 sm:mt-6 sm:text-lg">
            A modern development upskilling platform featuring timed MCQ quizzes, curated SDE coding sheets, 
            LeetCode/Codeforces profile sync, and interactive streaks with a contribution heatmap grid.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/signup">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/leaderboard">View Leaderboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Clock, title: "Timed Quizzes", desc: "Server-synced countdown with auto-submit" },
            { icon: Shield, title: "Secure Roles", desc: "Admin whitelist & protected routes" },
            { icon: BarChart3, title: "Analytics", desc: "Scores, ranks, and completion rates" },
            { icon: Users, title: "Live Leaderboard", desc: "Real-time rankings for everyone" },
            { icon: BookOpen, title: "SDE Practice Sheets", desc: "Curated DSA tracks with external solving support" },
            { icon: Code2, title: "LeetCode Streak Grid", desc: "A 365-day contribution heatmap with active days & points" },
          ].map((f) => (
            <Card key={f.title} className="animate-fade-in transition-shadow hover:shadow-md hover:shadow-indigo-900/10">
              <CardHeader>
                <f.icon className="mb-2 h-8 w-8 text-indigo-400" />
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
