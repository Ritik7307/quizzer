import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function LearnDashboard() {
  const tracks = [
    {
      id: "dsa",
      title: "Data Structures & Algorithms",
      description: "Master continuous memory, hierarchical data structures, graphs, and DP.",
      icon: "🧠",
      modules: ["Arrays", "Strings", "HashMaps", "Two Pointers", "Sliding Window", "Linked Lists", "Stacks & Queues", "Binary Search", "Sorting Algorithms", "Greedy Algorithms", "Divide & Conquer", "Recursion & Backtracking", "Trees", "Graphs", "Graph Algorithms", "String Algorithms", "Dynamic Programming", "Mathematical Algorithms", "Segment Trees", "Tries", "Bit Manipulation", "Monotonic Stacks"]
    },
    {
      id: "system-design",
      title: "System Design",
      description: "Design scalable, distributed systems for FAANG-level interviews.",
      icon: "🏗️",
      modules: ["Load Balancing", "Caching", "Database Sharding", "Message Queues", "Microservices", "CAP Theorem", "Consistent Hashing", "Rate Limiting", "WebSockets & Polling"]
    },
    {
      id: "behavioral",
      title: "Behavioral & Leadership",
      description: "Nail the STAR method and Amazon Leadership Principles.",
      icon: "🗣️",
      modules: ["STAR Method", "Conflict Resolution", "Leadership Principles"]
    },
    {
      id: "aptitude",
      title: "Aptitude & Logical Reasoning",
      description: "Ace the first round of mass recruiters with quantitative and logical challenges.",
      icon: "🧮",
      modules: ["Quantitative", "Logical Reasoning", "Verbal Ability"]
    },
    {
      id: "cs-core",
      title: "CS Core Subjects",
      description: "Master OS, DBMS, and Computer Networks concepts.",
      icon: "🖥️",
      modules: ["Operating Systems", "DBMS", "Computer Networks", "Object Oriented Programming"]
    },
    {
      id: "resume-review",
      title: "Resume Reviewer",
      description: "AI-powered ATS scanner and resume feedback.",
      icon: "📄",
      modules: ["ATS Score", "Strengths & Weaknesses", "Actionable Feedback"]
    }
  ];

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-4 tracking-tight">Complete Placement Hub</h1>
      <p className="text-muted-foreground mb-10 text-lg">
        Master Data Structures, System Design, Core Subjects, and Aptitude with interactive visualizations and AI mock scenarios.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tracks.map((track) => {
          const firstModuleSlug = track.modules[0].toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
          return (
            <Link href={`/learn/${track.id}/${firstModuleSlug}`} key={track.id}>
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{track.icon}</span> {track.title}
                </CardTitle>
                <CardDescription>{track.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <ul className="text-sm text-muted-foreground list-disc list-inside mb-4 space-y-1">
                  {track.modules.map(mod => <li key={mod}>{mod}</li>)}
                </ul>
                <div className="text-sm font-medium text-primary mt-auto">View Track →</div>
              </CardContent>
            </Card>
          </Link>
        )})}
      </div>
    </div>
  );
}
