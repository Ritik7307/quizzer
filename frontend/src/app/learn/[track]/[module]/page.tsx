"use client";

import React, { useState, use } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import GraphVisualizer from '@/components/visualizers/GraphVisualizer';
import SystemDiagramVisualizer from '@/components/visualizers/SystemDiagramVisualizer';
import { useAuth } from '@/contexts/auth-context';
import { MarkdownRenderer } from '@/components/ui/markdown';

export default function ModulePage({ params }: { params: Promise<{ track: string, module: string }> }) {
  const unwrappedParams = use(params);
  const { token } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [quiz, setQuiz] = useState<any[] | null>(null);
  const [scenario, setScenario] = useState<any | null>(null);
  const [resumeReview, setResumeReview] = useState<any | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [markdownContent, setMarkdownContent] = useState<string>("Loading documentation...");
  
  const formattedTrack = unwrappedParams.track.replace(/-/g, " ");
  const formattedModule = unwrappedParams.module.replace(/-/g, " ");

  const isSystemDesign = unwrappedParams.track === "system-design";
  const isAptitude = unwrappedParams.track === "aptitude";
  const isCSCore = unwrappedParams.track === "cs-core";
  const isResumeReview = unwrappedParams.track === "resume-review";

  React.useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/content?track=${unwrappedParams.track}&module=${unwrappedParams.module}`);
        if (res.ok) {
          const data = await res.json();
          setMarkdownContent(data.content);
        } else {
          setMarkdownContent(`Failed to load documentation. Error ${res.status}`);
        }
      } catch (err) {
        setMarkdownContent("Failed to load documentation. Network error.");
      }
    };
    if (!isResumeReview) fetchContent();
  }, [unwrappedParams.track, unwrappedParams.module, isResumeReview]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setQuiz(null);
    setScenario(null);
    setResumeReview(null);
    
    try {
      let endpoint = '/api/ai/generate-quiz';
      let bodyData: any = { topic: formattedModule };

      if (isSystemDesign) endpoint = '/api/ai/generate-system-design';
      else if (isAptitude) endpoint = '/api/ai/generate-aptitude';
      else if (isCSCore) endpoint = '/api/ai/generate-cs-core';
      else if (isResumeReview) {
        endpoint = '/api/ai/review-resume';
        bodyData = { resumeText };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(bodyData)
      });
      
      const data = await response.json();
      if (response.ok) {
        if (isSystemDesign) {
          setScenario(data.scenario);
        } else if (isResumeReview) {
          setResumeReview(data.review);
        } else {
          setQuiz(data.quiz);
        }
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate content.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Special Layout for Resume Review
  if (isResumeReview) {
    return (
      <div className="container mx-auto py-10 space-y-8 max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight mb-2">AI Resume Reviewer</h1>
        <p className="text-muted-foreground mb-6">Paste your resume text below to get an ATS score and actionable feedback tailored for top-tier companies.</p>
        
        <div className="flex flex-col gap-2 mb-2">
          <label className="text-sm font-medium text-foreground">Upload Resume Text File</label>
          <input 
            type="file" 
            accept=".txt,.md" 
            className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => setResumeText(e.target?.result as string);
                reader.readAsText(file);
              }
            }}
          />
          <span className="text-sm text-muted-foreground my-2">Or paste your text directly:</span>
        </div>
        
        <Textarea 
          placeholder="Paste your full resume text here..." 
          className="min-h-[300px] font-mono text-sm p-4"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />
        
        <Button onClick={handleGenerate} disabled={isGenerating || resumeText.length < 50} className="w-full">
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "🤖 Scan Resume & Get Feedback"}
        </Button>

        {resumeReview && (
          <Card className="mt-8 border-green-500/50 animate-fade-in shadow-lg">
            <CardHeader className="bg-green-500/10 border-b border-green-500/20">
              <CardTitle className="flex justify-between items-center text-green-700 dark:text-green-400">
                <span>ATS Analysis Complete</span>
                <span className="text-3xl font-black">{resumeReview.atsScore}/100</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-md border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                  <h3 className="font-bold mb-2 text-green-700 dark:text-green-400">Strengths</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {resumeReview.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="p-4 rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                  <h3 className="font-bold mb-2 text-red-700 dark:text-red-400">Weaknesses</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {resumeReview.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
              <div className="p-4 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                <h3 className="font-bold mb-2 text-amber-700 dark:text-amber-400">Actionable Feedback</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {resumeReview.actionableFeedback?.map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Determine button text based on track
  let generateBtnText = "🤖 Generate AI Quiz";
  if (isSystemDesign) generateBtnText = "🏗️ Mock Interview Scenario";
  if (isAptitude) generateBtnText = "⏱️ Generate Timed Assessment";
  if (isCSCore) generateBtnText = "📚 Generate Core Subjects Quiz";

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-1">{formattedTrack}</p>
          <h1 className="text-4xl font-bold capitalize">{formattedModule}</h1>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : generateBtnText}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <Card className="xl:col-span-2">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle>Documentation & Theory</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <MarkdownRenderer content={markdownContent} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visualization / Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {isSystemDesign ? (
               <SystemDiagramVisualizer topic={unwrappedParams.module} />
            ) : (unwrappedParams.module === 'trees' || unwrappedParams.module === 'graphs') ? (
              <GraphVisualizer topic={unwrappedParams.module} />
            ) : (
              <div className="flex items-center justify-center h-[400px] border rounded-md bg-muted/20">
                <p className="text-muted-foreground">
                  {isAptitude ? "Aptitude formula cheat sheets will appear here." : "Visualization not available for this topic yet."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {quiz && quiz.length > 0 && (
        <Card className="mt-8 border-primary/50 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl flex justify-between items-center">
              <span>{isAptitude ? "Timed Assessment" : "Generated Quiz"}</span>
              {isAptitude && <span className="text-sm font-normal text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">Timer: 15:00</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {quiz.map((q: any, i: number) => (
              <div key={i} className="p-4 rounded-md border bg-card">
                <p className="font-medium mb-3">{i + 1}. {q.text}</p>
                <div className="space-y-2 pl-4">
                  {q.options.map((opt: string, j: number) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${j === q.correctOptionIndex ? 'bg-green-500/20 text-green-600 border border-green-500' : 'bg-muted border border-border'}`}>
                        {String.fromCharCode(65 + j)}
                      </div>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
                {/* For Aptitude, show explanations */}
                {q.explanation && (
                  <div className="mt-4 p-3 bg-muted/50 rounded text-sm text-muted-foreground border-l-4 border-primary">
                    <span className="font-bold text-foreground">Explanation: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* System Design Scenario renderer remains unchanged... */}
      {scenario && (
        <Card className="mt-8 border-indigo-500/50 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl">System Design Mock Interview: {scenario.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-md border bg-card">
              <h3 className="font-bold text-lg mb-2">Problem Statement</h3>
              <p className="text-muted-foreground">{scenario.problemStatement}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md border bg-muted/30">
                <h3 className="font-bold mb-2">Functional Requirements</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {scenario.functionalRequirements?.map((req: string, i: number) => <li key={i}>{req}</li>)}
                </ul>
              </div>
              <div className="p-4 rounded-md border bg-muted/30">
                <h3 className="font-bold mb-2">Non-Functional Requirements</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {scenario.nonFunctionalRequirements?.map((req: string, i: number) => <li key={i}>{req}</li>)}
                </ul>
              </div>
            </div>
            <div className="p-4 rounded-md border bg-indigo-500/10">
              <h3 className="font-bold mb-2 text-indigo-400">Capacity Estimation</h3>
              <p className="text-sm">{scenario.capacityEstimation}</p>
            </div>
            <div className="p-4 rounded-md border bg-amber-500/10">
              <h3 className="font-bold mb-2 text-amber-500">Interview Hints</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                {scenario.hints?.map((hint: string, i: number) => <li key={i}>{hint}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
