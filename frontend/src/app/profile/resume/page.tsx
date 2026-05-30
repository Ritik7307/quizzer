"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Download, Plus, Trash2, Mail, Phone, Globe, ChevronLeft, Code2, Briefcase } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function ResumeBuilderPage() {
  const { user } = useAuth();
  
  const [personalInfo, setPersonalInfo] = useState({
    name: user?.name || "John Doe",
    email: user?.email || "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    linkedin: "linkedin.com/in/johndoe",
    github: "github.com/johndoe",
    website: "johndoe.dev",
  });

  const [summary, setSummary] = useState(
    "Passionate software engineer with experience in building scalable web applications. Strong problem-solving skills and a track record of delivering high-quality code."
  );

  const [experience, setExperience] = useState([
    {
      id: "1",
      company: "Tech Corp",
      role: "Software Engineer",
      startDate: "Jan 2022",
      endDate: "Present",
      description: "Developed and maintained full-stack web applications using React and Node.js. Improved application performance by 30% through database optimization and caching.",
    }
  ]);

  const [education, setEducation] = useState([
    {
      id: "1",
      institution: "State University",
      degree: "B.S. in Computer Science",
      year: "2018 - 2022",
    }
  ]);

  const [projects, setProjects] = useState([
    {
      id: "1",
      name: "E-Commerce Platform",
      link: "github.com/johndoe/ecommerce",
      description: "Built a fully functional e-commerce platform with Next.js, Stripe integration, and PostgreSQL.",
    }
  ]);

  const [skills, setSkills] = useState("JavaScript, TypeScript, React, Next.js, Node.js, Express, PostgreSQL, Prisma, Tailwind CSS, Git, Docker");

  const handlePrint = () => {
    window.print();
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden print-override">
        
        {/* Header - Hidden on Print */}
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-card px-6 print:hidden">
          <Link href="/profile" className="flex items-center gap-2 font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to Profile
          </Link>
          <div className="flex-1" />
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden print:block print:overflow-visible h-full">
          
          {/* Left Panel - Editor (Hidden on Print) */}
          <div className="overflow-y-auto p-6 bg-muted/20 border-r border-border print:hidden space-y-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Resume Builder</h1>
              <p className="text-sm text-muted-foreground">Fill in your details below to generate a professional, ATS-friendly resume.</p>
            </div>

            {/* Personal Info */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><UserIcon /> Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Full Name</Label><Input value={personalInfo.name} onChange={(e) => setPersonalInfo({...personalInfo, name: e.target.value})} /></div>
                  <div className="space-y-1.5"><Label>Email</Label><Input value={personalInfo.email} onChange={(e) => setPersonalInfo({...personalInfo, email: e.target.value})} /></div>
                  <div className="space-y-1.5"><Label>Phone</Label><Input value={personalInfo.phone} onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})} /></div>
                  <div className="space-y-1.5"><Label>Website (Optional)</Label><Input value={personalInfo.website} onChange={(e) => setPersonalInfo({...personalInfo, website: e.target.value})} /></div>
                  <div className="space-y-1.5"><Label>LinkedIn (Optional)</Label><Input value={personalInfo.linkedin} onChange={(e) => setPersonalInfo({...personalInfo, linkedin: e.target.value})} /></div>
                  <div className="space-y-1.5"><Label>GitHub (Optional)</Label><Input value={personalInfo.github} onChange={(e) => setPersonalInfo({...personalInfo, github: e.target.value})} /></div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Professional Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A brief summary of your background and goals..." />
              </CardContent>
            </Card>

            {/* Experience */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Experience</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setExperience([...experience, { id: Date.now().toString(), company: "", role: "", startDate: "", endDate: "", description: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {experience.map((exp, i) => (
                  <div key={exp.id} className="p-4 border rounded-lg bg-card space-y-3 relative group">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setExperience(experience.filter(e => e.id !== exp.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Company</Label><Input value={exp.company} onChange={(e) => {const newE = [...experience]; newE[i].company = e.target.value; setExperience(newE);}} /></div>
                      <div className="space-y-1"><Label>Role</Label><Input value={exp.role} onChange={(e) => {const newE = [...experience]; newE[i].role = e.target.value; setExperience(newE);}} /></div>
                      <div className="space-y-1"><Label>Start Date</Label><Input value={exp.startDate} placeholder="e.g. Jan 2020" onChange={(e) => {const newE = [...experience]; newE[i].startDate = e.target.value; setExperience(newE);}} /></div>
                      <div className="space-y-1"><Label>End Date</Label><Input value={exp.endDate} placeholder="e.g. Present" onChange={(e) => {const newE = [...experience]; newE[i].endDate = e.target.value; setExperience(newE);}} /></div>
                    </div>
                    <div className="space-y-1"><Label>Description / Accomplishments</Label><Textarea rows={3} value={exp.description} onChange={(e) => {const newE = [...experience]; newE[i].description = e.target.value; setExperience(newE);}} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Education */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Education</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setEducation([...education, { id: Date.now().toString(), institution: "", degree: "", year: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {education.map((edu, i) => (
                  <div key={edu.id} className="p-4 border rounded-lg bg-card space-y-3 relative group">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEducation(education.filter(e => e.id !== edu.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Institution</Label><Input value={edu.institution} onChange={(e) => {const newE = [...education]; newE[i].institution = e.target.value; setEducation(newE);}} /></div>
                      <div className="space-y-1"><Label>Degree</Label><Input value={edu.degree} onChange={(e) => {const newE = [...education]; newE[i].degree = e.target.value; setEducation(newE);}} /></div>
                      <div className="col-span-2 space-y-1"><Label>Timeline (e.g. 2018 - 2022)</Label><Input value={edu.year} onChange={(e) => {const newE = [...education]; newE[i].year = e.target.value; setEducation(newE);}} /></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Projects */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Projects</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setProjects([...projects, { id: Date.now().toString(), name: "", link: "", description: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {projects.map((proj, i) => (
                  <div key={proj.id} className="p-4 border rounded-lg bg-card space-y-3 relative group">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setProjects(projects.filter(p => p.id !== proj.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Project Name</Label><Input value={proj.name} onChange={(e) => {const newP = [...projects]; newP[i].name = e.target.value; setProjects(newP);}} /></div>
                      <div className="space-y-1"><Label>Link (Optional)</Label><Input value={proj.link} onChange={(e) => {const newP = [...projects]; newP[i].link = e.target.value; setProjects(newP);}} /></div>
                    </div>
                    <div className="space-y-1"><Label>Description</Label><Textarea rows={2} value={proj.description} onChange={(e) => {const newP = [...projects]; newP[i].description = e.target.value; setProjects(newP);}} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Skills */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Skills</CardTitle>
                <CardDescription>Comma separated list of your technical skills.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea rows={3} value={skills} onChange={(e) => setSkills(e.target.value)} />
              </CardContent>
            </Card>

            <div className="h-8" />
          </div>

          {/* Right Panel - Live Preview */}
          <div className="overflow-y-auto bg-slate-200 dark:bg-slate-900 flex justify-center p-8 print:p-0 print:bg-white print:block">
            
            {/* A4 Paper Container */}
            <div className="bg-white text-black w-full max-w-[850px] min-h-[1100px] shadow-2xl print:shadow-none print:w-full print:max-w-none print:m-0 p-[10%]">
              
              {/* Header section */}
              <div className="border-b-2 border-slate-800 pb-6 mb-6">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-3 text-center">{personalInfo.name || "YOUR NAME"}</h1>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-700 font-medium">
                  {personalInfo.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {personalInfo.email}</div>}
                  {personalInfo.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {personalInfo.phone}</div>}
                  {personalInfo.website && <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {personalInfo.website.replace(/^https?:\/\//, '')}</div>}
                  {personalInfo.linkedin && <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {personalInfo.linkedin.replace(/^https?:\/\//, '')}</div>}
                  {personalInfo.github && <div className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" /> {personalInfo.github.replace(/^https?:\/\//, '')}</div>}
                </div>
              </div>

              {/* Summary */}
              {summary && (
                <div className="mb-6">
                  <p className="text-[15px] leading-relaxed text-slate-800">{summary}</p>
                </div>
              )}

              {/* Experience */}
              {experience.length > 0 && experience.some(e => e.company || e.role) && (
                <div className="mb-6">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest border-b border-slate-300 pb-1 mb-4">Experience</h2>
                  <div className="space-y-4">
                    {experience.map(exp => (
                      <div key={exp.id}>
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="text-[16px] font-bold text-slate-900">{exp.role}</h3>
                          <span className="text-sm font-semibold text-slate-600">{exp.startDate} {exp.endDate ? `- ${exp.endDate}` : ''}</span>
                        </div>
                        <div className="text-[15px] font-semibold text-indigo-700 mb-1.5">{exp.company}</div>
                        {exp.description && (
                          <div className="text-[14px] text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-slate-200">
                            {exp.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {projects.length > 0 && projects.some(p => p.name) && (
                <div className="mb-6">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest border-b border-slate-300 pb-1 mb-4">Projects</h2>
                  <div className="space-y-4">
                    {projects.map(proj => (
                      <div key={proj.id}>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[16px] font-bold text-slate-900">{proj.name}</h3>
                          {proj.link && <span className="text-[13px] font-semibold text-indigo-600">({proj.link.replace(/^https?:\/\//, '')})</span>}
                        </div>
                        {proj.description && (
                          <div className="text-[14px] text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-slate-200">
                            {proj.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {education.length > 0 && education.some(e => e.institution || e.degree) && (
                <div className="mb-6">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest border-b border-slate-300 pb-1 mb-4">Education</h2>
                  <div className="space-y-3">
                    {education.map(edu => (
                      <div key={edu.id} className="flex justify-between items-baseline">
                        <div>
                          <div className="text-[15px] font-bold text-slate-900">{edu.institution}</div>
                          <div className="text-[14px] font-medium text-slate-700">{edu.degree}</div>
                        </div>
                        <div className="text-sm font-semibold text-slate-600">{edu.year}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {skills && (
                <div className="mb-6">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest border-b border-slate-300 pb-1 mb-3">Skills</h2>
                  <div className="text-[14px] text-slate-800 font-medium leading-relaxed">
                    {skills.split(',').map((skill, i) => (
                      <span key={i} className="inline-block mr-2 mb-1 px-2 py-0.5 bg-slate-100 rounded-sm">{skill.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Global Print Styles to override standard page styling */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print-override, .print-override * {
              visibility: visible;
            }
            .print-override {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              background: white !important;
            }
            @page {
              size: auto;
              margin: 0mm;
            }
          }
        `}} />
      </div>
    </ProtectedRoute>
  );
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  );
}
