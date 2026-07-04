import { redirect } from "next/navigation";
import { use } from "react";

export default function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const unwrappedParams = use(params);
  
  // Map tracks to their first module slug
  const firstModules: Record<string, string> = {
    "dsa": "arrays",
    "system-design": "load-balancing",
    "behavioral": "star-method",
    "aptitude": "quantitative",
    "cs-core": "operating-systems",
    "resume-review": "ats-score"
  };

  const firstModule = firstModules[unwrappedParams.track] || "overview";
  
  // Redirect to the first module of the track
  redirect(`/learn/${unwrappedParams.track}/${firstModule}`);
}
