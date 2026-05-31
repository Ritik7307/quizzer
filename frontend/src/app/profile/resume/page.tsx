"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Download, Plus, Trash2, Mail, Phone, Globe, ChevronLeft, Code2, Briefcase, ArrowUp, ArrowDown, Layout } from "lucide-react";
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

  const [template, setTemplate] = useState("modern");
  const [sectionOrder, setSectionOrder] = useState([
    "summary",
    "experience",
    "projects",
    "education",
    "skills"
  ]);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sectionOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setSectionOrder(newOrder);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderEditorSection = (sectionId: string, index: number) => {
    const isFirst = index === 0;
    const isLast = index === sectionOrder.length - 1;
    const upDownButtons = (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(index, 'up')} disabled={isFirst} title="Move Section Up">
          <ArrowUp className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(index, 'down')} disabled={isLast} title="Move Section Down">
          <ArrowDown className="w-4 h-4" />
        </Button>
      </div>
    );

    switch(sectionId) {
      case 'summary':
        return (
          <Card className="shadow-sm" key="summary">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Professional Summary</CardTitle>
              {upDownButtons}
            </CardHeader>
            <CardContent>
              <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A brief summary of your background and goals..." />
            </CardContent>
          </Card>
        );

      case 'experience':
        return (
          <Card className="shadow-sm" key="experience">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Experience</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setExperience([...experience, { id: Date.now().toString(), company: "", role: "", startDate: "", endDate: "", description: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
                {upDownButtons}
              </div>
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
        );

      case 'education':
        return (
          <Card className="shadow-sm" key="education">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Education</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEducation([...education, { id: Date.now().toString(), institution: "", degree: "", year: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
                {upDownButtons}
              </div>
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
        );

      case 'projects':
        return (
          <Card className="shadow-sm" key="projects">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Projects</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setProjects([...projects, { id: Date.now().toString(), name: "", link: "", description: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
                {upDownButtons}
              </div>
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
        );

      case 'skills':
        return (
          <Card className="shadow-sm" key="skills">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Skills</CardTitle>
                <CardDescription>Comma separated list of your technical skills.</CardDescription>
              </div>
              {upDownButtons}
            </CardHeader>
            <CardContent>
              <Textarea rows={3} value={skills} onChange={(e) => setSkills(e.target.value)} />
            </CardContent>
          </Card>
        );

      default: return null;
    }
  };

  const renderSection = (sectionId: string) => {
    switch(sectionId) {
      case 'summary':
        return summary ? (
          <div className="mb-6" key="summary">
            {template === 'classic' && <h2 className="text-lg font-bold text-black uppercase border-b-2 border-black pb-1 mb-3">Professional Summary</h2>}
            <p className={`text-[15px] leading-relaxed text-slate-800 ${template === 'classic' ? 'font-serif' : ''}`}>{summary}</p>
          </div>
        ) : null;
        
      case 'experience':
        return experience.length > 0 && experience.some(e => e.company || e.role) ? (
          <div className="mb-6" key="experience">
            <h2 className={`text-lg font-black text-slate-900 uppercase tracking-widest border-b ${template === 'classic' ? 'border-b-2 border-black font-bold font-serif' : template === 'minimalist' ? 'border-slate-200' : 'border-slate-300'} pb-1 mb-4`}>Experience</h2>
            <div className="space-y-4">
              {experience.map(exp => (
                <div key={exp.id} className={`${template === 'minimalist' ? 'grid grid-cols-[1fr_3fr] gap-4' : ''}`}>
                  {template === 'minimalist' && (
                    <div className="text-sm font-semibold text-slate-600 mt-1">{exp.startDate} {exp.endDate ? `- ${exp.endDate}` : ''}</div>
                  )}
                  <div>
                    <div className={`flex justify-between items-baseline mb-1 ${template === 'minimalist' ? 'flex-col sm:flex-row' : ''}`}>
                      <h3 className={`text-[16px] font-bold text-slate-900 ${template === 'classic' ? 'font-serif' : ''}`}>{exp.role}</h3>
                      {template !== 'minimalist' && (
                        <span className={`text-sm font-semibold text-slate-600 ${template === 'classic' ? 'font-serif font-normal' : ''}`}>{exp.startDate} {exp.endDate ? `- ${exp.endDate}` : ''}</span>
                      )}
                    </div>
                    <div className={`text-[15px] font-semibold mb-1.5 ${template === 'classic' ? 'text-black font-serif italic' : template === 'minimalist' ? 'text-slate-700' : 'text-indigo-700'}`}>{exp.company}</div>
                    {exp.description && (
                      <div className={`text-[14px] text-slate-800 leading-relaxed whitespace-pre-wrap ${template === 'classic' ? 'font-serif' : template === 'minimalist' ? '' : 'pl-3 border-l-2 border-slate-200'}`}>
                        {exp.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case 'projects':
        return projects.length > 0 && projects.some(p => p.name) ? (
          <div className="mb-6" key="projects">
            <h2 className={`text-lg font-black text-slate-900 uppercase tracking-widest border-b ${template === 'classic' ? 'border-b-2 border-black font-bold font-serif' : template === 'minimalist' ? 'border-slate-200' : 'border-slate-300'} pb-1 mb-4`}>Projects</h2>
            <div className="space-y-4">
              {projects.map(proj => (
                <div key={proj.id} className={`${template === 'minimalist' ? 'grid grid-cols-[1fr_3fr] gap-4' : ''}`}>
                  {template === 'minimalist' && <div />}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-[16px] font-bold text-slate-900 ${template === 'classic' ? 'font-serif' : ''}`}>{proj.name}</h3>
                      {proj.link && <span className={`text-[13px] ${template === 'classic' ? 'text-slate-600 font-serif' : template === 'minimalist' ? 'text-slate-500' : 'font-semibold text-indigo-600'}`}>({proj.link.replace(/^https?:\/\//, '')})</span>}
                    </div>
                    {proj.description && (
                      <div className={`text-[14px] text-slate-800 leading-relaxed whitespace-pre-wrap ${template === 'classic' ? 'font-serif' : template === 'minimalist' ? '' : 'pl-3 border-l-2 border-slate-200'}`}>
                        {proj.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case 'education':
        return education.length > 0 && education.some(e => e.institution || e.degree) ? (
          <div className="mb-6" key="education">
            <h2 className={`text-lg font-black text-slate-900 uppercase tracking-widest border-b ${template === 'classic' ? 'border-b-2 border-black font-bold font-serif' : template === 'minimalist' ? 'border-slate-200' : 'border-slate-300'} pb-1 mb-4`}>Education</h2>
            <div className="space-y-3">
              {education.map(edu => (
                <div key={edu.id} className={`flex justify-between items-baseline ${template === 'minimalist' ? 'grid grid-cols-[1fr_3fr] gap-4' : ''}`}>
                  {template === 'minimalist' && (
                    <div className="text-sm font-semibold text-slate-600">{edu.year}</div>
                  )}
                  <div className={template === 'minimalist' ? 'flex flex-col' : ''}>
                    <div className={`text-[15px] font-bold text-slate-900 ${template === 'classic' ? 'font-serif' : ''}`}>{edu.institution}</div>
                    <div className={`text-[14px] font-medium text-slate-700 ${template === 'classic' ? 'font-serif italic text-black' : ''}`}>{edu.degree}</div>
                  </div>
                  {template !== 'minimalist' && (
                    <div className={`text-sm font-semibold text-slate-600 ${template === 'classic' ? 'font-serif font-normal text-black' : ''}`}>{edu.year}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case 'skills':
        return skills ? (
          <div className="mb-6" key="skills">
            <h2 className={`text-lg font-black text-slate-900 uppercase tracking-widest border-b ${template === 'classic' ? 'border-b-2 border-black font-bold font-serif' : template === 'minimalist' ? 'border-slate-200' : 'border-slate-300'} pb-1 mb-3`}>Skills</h2>
            <div className={`text-[14px] text-slate-800 leading-relaxed ${template === 'classic' ? 'font-serif' : 'font-medium'}`}>
              {template === 'modern' ? (
                skills.split(',').map((skill, i) => (
                  <span key={i} className="inline-block mr-2 mb-1 px-2 py-0.5 bg-slate-100 rounded-sm">{skill.trim()}</span>
                ))
              ) : (
                <p>{skills}</p>
              )}
            </div>
          </div>
        ) : null;
        
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-foreground overflow-hidden print-override print:h-auto print:overflow-visible">
        
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

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden print:block print:overflow-visible h-full print:h-auto">
          
          {/* Left Panel - Editor (Hidden on Print) */}
          <div className="overflow-y-auto p-6 bg-muted/20 border-r border-border print:hidden space-y-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Resume Builder</h1>
              <p className="text-sm text-muted-foreground">Fill in your details below to generate a professional, ATS-friendly resume.</p>
            </div>

            {/* Layout Settings */}
            <Card className="shadow-sm border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><Layout className="w-5 h-5 text-indigo-500" /> Layout Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Resume Template</Label>
                  <select 
                    value={template} 
                    onChange={(e) => setTemplate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <option value="modern">Modern (Default)</option>
                    <option value="classic">Classic (ATS-Friendly)</option>
                    <option value="minimalist">Minimalist</option>
                  </select>
                </div>
              </CardContent>
            </Card>

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

            {/* Dynamic Editor Sections */}
            {sectionOrder.map((section, idx) => renderEditorSection(section, idx))}

            <div className="h-8" />
          </div>

          {/* Right Panel - Live Preview */}
          <div className="overflow-y-auto bg-slate-200 dark:bg-slate-900 flex justify-center items-start p-8 print:p-0 print:bg-white print:block">
            
            {/* A4 Paper Container */}
            <div className={`bg-white text-black w-full max-w-[850px] min-h-[1100px] shadow-2xl print:shadow-none print:w-full print:max-w-none print:m-0 p-[10%] ${template === 'classic' ? 'font-serif' : ''}`}>
              
              {/* Header section */}
              <div className={`border-b-2 ${template === 'classic' ? 'border-black' : 'border-slate-800'} pb-6 mb-6`}>
                <h1 className={`text-4xl font-black text-slate-900 tracking-tight uppercase mb-3 text-center ${template === 'minimalist' ? 'font-light tracking-widest' : template === 'classic' ? 'font-serif' : ''}`}>{personalInfo.name || "YOUR NAME"}</h1>
                <div className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm font-medium ${template === 'classic' ? 'text-black font-serif' : 'text-slate-700'}`}>
                  {personalInfo.email && <div className="flex items-center gap-1.5">{template !== 'classic' && <Mail className="w-3.5 h-3.5" />} {personalInfo.email}</div>}
                  {personalInfo.phone && <div className="flex items-center gap-1.5">{template !== 'classic' && <Phone className="w-3.5 h-3.5" />} {personalInfo.phone}</div>}
                  {personalInfo.website && <div className="flex items-center gap-1.5">{template !== 'classic' && <Globe className="w-3.5 h-3.5" />} {personalInfo.website.replace(/^https?:\/\//, '')}</div>}
                  {personalInfo.linkedin && <div className="flex items-center gap-1.5">{template !== 'classic' && <Briefcase className="w-3.5 h-3.5" />} {personalInfo.linkedin.replace(/^https?:\/\//, '')}</div>}
                  {personalInfo.github && <div className="flex items-center gap-1.5">{template !== 'classic' && <Code2 className="w-3.5 h-3.5" />} {personalInfo.github.replace(/^https?:\/\//, '')}</div>}
                </div>
              </div>

              {/* Dynamic Sections */}
              {sectionOrder.map(section => renderSection(section))}

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
              position: relative;
              width: 100%;
              height: auto !important;
              background: white !important;
              overflow: visible !important;
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
