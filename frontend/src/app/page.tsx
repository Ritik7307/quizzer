import Link from "next/link";
import { ArrowRight, Clock, Shield, Users, BookOpen, Code2, Sparkles, Trophy, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
        {/* Background Gradients */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"></div>
        <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-3xl opacity-50 mix-blend-multiply transform translate-x-1/3 -translate-y-1/4"></div>
        <div className="absolute top-0 left-0 -z-10 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl opacity-50 mix-blend-multiply transform -translate-x-1/3 -translate-y-1/4"></div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center animate-fade-in">

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl md:text-7xl lg:leading-[1.1]">
            Master your skills with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">Quizzer</span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl leading-relaxed">
            A premium upskilling platform featuring timed quizzes, curated DSA coding sheets, Codeforces integration, and interactive learning streaks.
          </p>
          
          <div className="mt-10 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center">
            <Button size="lg" className="w-full sm:w-auto rounded-full px-8 h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-0.5" asChild>
              <Link href="/signup">
                Start Learning <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 h-12 text-base font-bold border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-all shadow-sm hover:-translate-y-0.5" asChild>
              <Link href="/leaderboard">
                <Trophy className="mr-2 h-4 w-4 text-amber-500" /> View Leaderboard
              </Link>
            </Button>
          </div>

          <div className="mt-16 sm:mt-24 relative max-w-5xl mx-auto">
            <div className="rounded-xl border border-white/40 bg-white/40 p-2 sm:p-4 shadow-2xl shadow-indigo-900/5 backdrop-blur-3xl overflow-hidden ring-1 ring-slate-900/5">
              <img
                src="/dashboard-preview.png"
                alt="App Dashboard Preview"
                className="w-full rounded-lg border border-slate-200/50 shadow-sm object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 animate-fade-in z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Everything you need to level up</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Comprehensive tools designed to test your knowledge, track your progress, and build consistent habits.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", border: "hover:border-blue-500/30 hover:shadow-blue-500/10", title: "Timed Quizzes", desc: "Server-synced countdown with auto-submit functionality to simulate real exam environments." },
            { icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "hover:border-indigo-500/30 hover:shadow-indigo-500/10", title: "DSA Practice Sheets", desc: "Curated problem tracks with external Codeforces solving support and progress tracking." },
            { icon: Code2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/30 hover:shadow-emerald-500/10", title: "Contribution Grid", desc: "A 365-day interactive heatmap displaying your active days, streak, and total points." },
            { icon: Users, color: "text-amber-500", bg: "bg-amber-500/10", border: "hover:border-amber-500/30 hover:shadow-amber-500/10", title: "Live Leaderboard", desc: "Real-time global rankings to see how you stack up against the competition." },
            { icon: Shield, color: "text-rose-500", bg: "bg-rose-500/10", border: "hover:border-rose-500/30 hover:shadow-rose-500/10", title: "Secure Platform", desc: "Admin whitelists, protected routes, and robust authentication built-in." },
            { icon: BrainCircuit, color: "text-violet-500", bg: "bg-violet-500/10", border: "hover:border-violet-500/30 hover:shadow-violet-500/10", title: "Smart Analytics", desc: "Detailed insights into your scores, ranks, and question-level completion rates." },
          ].map((f) => (
            <Card key={f.title} className={`group border border-slate-200 bg-white/70 backdrop-blur-md shadow-lg transition-all duration-300 hover:-translate-y-1 ${f.border}`}>
              <CardHeader className="pb-4">
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${f.bg} transition-transform group-hover:scale-110`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-slate-600 leading-relaxed">{f.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      
      {/* Footer minimal */}
      <footer className="mt-auto border-t border-slate-200/60 bg-white/50 backdrop-blur-md py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm font-medium text-slate-400">
          © {new Date().getFullYear()} Quizzer Platform. Built for learning.
        </div>
      </footer>
    </div>
  );
}
