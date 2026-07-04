import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Code, Database, FileText, LayoutDashboard, BrainCircuit, Swords } from 'lucide-react';

export default function RoadmapPage() {
  const phases = [
    {
      id: 1,
      title: "Foundation & Profile",
      description: "Start by getting your resume past the FAANG ATS screeners.",
      icon: <FileText className="w-6 h-6 text-blue-500" />,
      color: "border-blue-500",
      bgColor: "bg-blue-500/10",
      status: "completed", // Just for visual demo
      modules: [
        { name: "AI Resume Reviewer", path: "/learn/resume-review/ats-score" }
      ]
    },
    {
      id: 2,
      title: "The First Round Screen",
      description: "Clear the initial quantitative and logical reasoning tests.",
      icon: <BrainCircuit className="w-6 h-6 text-purple-500" />,
      color: "border-purple-500",
      bgColor: "bg-purple-500/10",
      status: "current",
      modules: [
        { name: "Quantitative Aptitude", path: "/learn/aptitude/quantitative" },
        { name: "Logical Reasoning", path: "/learn/aptitude/logical-reasoning" }
      ]
    },
    {
      id: 3,
      title: "CS Core Subjects",
      description: "Deep dive into OS, DBMS, and Computer Networks.",
      icon: <Database className="w-6 h-6 text-emerald-500" />,
      color: "border-emerald-500",
      bgColor: "bg-emerald-500/10",
      status: "locked",
      modules: [
        { name: "Operating Systems", path: "/learn/cs-core/operating-systems" },
        { name: "Database Management", path: "/learn/cs-core/dbms" },
        { name: "Computer Networks", path: "/learn/cs-core/computer-networks" }
      ]
    },
    {
      id: 4,
      title: "Exhaustive DSA & CP",
      description: "Master Data Structures, Algorithms, and Competitive Programming patterns.",
      icon: <Code className="w-6 h-6 text-amber-500" />,
      color: "border-amber-500",
      bgColor: "bg-amber-500/10",
      status: "locked",
      modules: [
        { name: "Arrays & Strings", path: "/learn/dsa/arrays" },
        { name: "HashMaps & Sets", path: "/learn/dsa/hashmaps" },
        { name: "Two Pointers & Sliding Window", path: "/learn/dsa/two-pointers" },
        { name: "Linked Lists", path: "/learn/dsa/linked-lists" },
        { name: "Stacks & Queues", path: "/learn/dsa/stacks-queues" },
        { name: "Binary Search", path: "/learn/dsa/binary-search" },
        { name: "Sorting Algorithms", path: "/learn/dsa/sorting" },
        { name: "Greedy Algorithms", path: "/learn/dsa/greedy-algorithms" },
        { name: "Divide & Conquer", path: "/learn/dsa/divide-conquer" },
        { name: "Recursion & Backtracking", path: "/learn/dsa/recursion" },
        { name: "Trees & Graphs", path: "/learn/dsa/trees" },
        { name: "Graph Algorithms", path: "/learn/dsa/graph-algorithms" },
        { name: "String Algorithms", path: "/learn/dsa/string-algorithms" },
        { name: "Dynamic Programming", path: "/learn/dsa/dynamic-programming" },
        { name: "Mathematical Algorithms", path: "/learn/dsa/mathematical-algorithms" },
        { name: "Segment Trees & Fenwick", path: "/learn/dsa/segment-trees" },
        { name: "Tries & Bit Manipulation", path: "/learn/dsa/tries" }
      ]
    },
    {
      id: 5,
      title: "High-Level Architecture",
      description: "System Design for scalable FAANG applications.",
      icon: <LayoutDashboard className="w-6 h-6 text-indigo-500" />,
      color: "border-indigo-500",
      bgColor: "bg-indigo-500/10",
      status: "locked",
      modules: [
        { name: "Load Balancing", path: "/learn/system-design/load-balancing" },
        { name: "Caching Strategies", path: "/learn/system-design/caching" },
        { name: "Database Sharding", path: "/learn/system-design/database-sharding" }
      ]
    },
    {
      id: 6,
      title: "Battle Ready",
      description: "Test your skills against others in the 1v1 Arena.",
      icon: <Swords className="w-6 h-6 text-rose-500" />,
      color: "border-rose-500",
      bgColor: "bg-rose-500/10",
      status: "locked",
      modules: [
        { name: "Behavioral (STAR Method)", path: "/learn/behavioral/star-method" },
        { name: "Enter 1v1 Arena", path: "/arena" }
      ]
    }
  ];

  return (
    <div className="container mx-auto py-12 max-w-4xl relative">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
          Zero to Placement Journey
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Follow this exhaustive, FAANG-level guided roadmap. Complete each phase to master the skills required for top-tier tech companies.
        </p>
      </div>

      <div className="relative border-l-2 border-muted ml-4 md:ml-12 space-y-12 pb-12">
        {phases.map((phase, index) => (
          <div key={phase.id} className="relative pl-8 md:pl-16">
            {/* Timeline Node */}
            <div className={`absolute -left-4 md:-left-4 top-0 w-8 h-8 rounded-full border-4 bg-background flex items-center justify-center ${phase.color} ${phase.status === 'current' ? 'animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.5)]' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${phase.status === 'completed' ? phase.color.replace('border-', 'bg-') : 'bg-transparent'}`} />
            </div>

            <Card className={`overflow-hidden transition-all duration-300 hover:shadow-lg ${phase.status === 'locked' ? 'opacity-75 grayscale-[0.5]' : 'border-primary/50'}`}>
              <div className={`p-4 md:p-6 ${phase.bgColor} border-b flex items-center gap-4`}>
                <div className="p-3 bg-background rounded-lg shadow-sm">
                  {phase.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Phase {phase.id}</span>
                    {phase.status === 'completed' && <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full font-semibold">Completed</span>}
                    {phase.status === 'current' && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">In Progress</span>}
                  </div>
                  <h2 className="text-2xl font-bold">{phase.title}</h2>
                </div>
              </div>
              
              <CardContent className="p-4 md:p-6 bg-card">
                <p className="text-muted-foreground mb-6">{phase.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {phase.modules.map((mod, i) => (
                    <Link href={mod.path} key={i}>
                      <Button 
                        variant={phase.status === 'locked' ? "outline" : "default"} 
                        className="w-full justify-start h-auto py-3 px-4 border border-border/50 hover:border-primary/50"
                      >
                        <BookOpen className="w-4 h-4 mr-3 opacity-70" />
                        <span className="truncate">{mod.name}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
