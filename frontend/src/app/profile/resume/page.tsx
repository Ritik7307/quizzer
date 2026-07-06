"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Download, Plus, Trash2, Mail, Phone, Globe, ChevronLeft, Code2, Briefcase, ArrowUp, ArrowDown, Layout, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ResumeBuilderPage() {
  const { user, token } = useAuth();
  
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadResume() {
      if (!token) return;
      try {
        const data = await api<any>("/api/resume", { token });
        if (data) {
          if (data.summary) setSummary(data.summary);
          setPersonalInfo(prev => ({
            ...prev,
            phone: data.phone || prev.phone,
            github: data.githubUrl || prev.github,
            linkedin: data.linkedinUrl || prev.linkedin,
            website: data.portfolioUrl || prev.website,
          }));
          if (data.experiences && data.experiences.length > 0) setExperience(data.experiences);
          if (data.educations && data.educations.length > 0) setEducation(data.educations);
          if (data.projects && data.projects.length > 0) setProjects(data.projects);
          if (data.skills && data.skills.length > 0) {
            setSkills(data.skills.map((s: any) => s.name).join(", "));
          }
        }
      } catch (error) {
        toast.error("Failed to load resume");
      } finally {
        setIsLoading(false);
      }
    }
    loadResume();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean).map(name => ({ name, category: "General" }));

      const parseDateSafe = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString();
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      };

      const mappedExperience = experience.map(exp => ({
        ...exp,
        title: exp.role || "Untitled",
        startDate: parseDateSafe(exp.startDate),
        endDate: exp.endDate && exp.endDate.toLowerCase() !== "present" ? parseDateSafe(exp.endDate) : null,
        current: !exp.endDate || exp.endDate.toLowerCase() === "present"
      }));

      const mappedEducation = education.map(edu => {
        const years = edu.year ? edu.year.split('-').map(y => y.trim()) : [];
        return {
          ...edu,
          field: "General",
          startDate: parseDateSafe(years[0] ? `${years[0]}-01-01` : ""),
          endDate: years[1] ? parseDateSafe(`${years[1]}-01-01`) : null,
          current: !years[1]
        };
      });

      const mappedProjects = projects.map(proj => ({
        ...proj,
        title: proj.name || "Untitled",
        githubLink: proj.link
      }));

      await api("/api/resume", {
        method: "PUT",
        token,
        body: JSON.stringify({
          summary,
          phone: personalInfo.phone,
          githubUrl: personalInfo.github,
          linkedinUrl: personalInfo.linkedin,
          portfolioUrl: personalInfo.website,
          experiences: mappedExperience,
          educations: mappedEducation,
          projects: mappedProjects,
          skills: skillsArray,
        }),
      });
      toast.success("Resume saved successfully!");
    } catch (error) {
      toast.error("Failed to save resume");
    } finally {
      setIsSaving(false);
    }
  };

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

  const SectionHeader = ({ title }: { title: string }) => {
    switch(template) {
      case 'classic': return <h2 className="text-lg font-black text-black uppercase tracking-widest border-b-2 border-black font-serif pb-1 mb-4">{title}</h2>;
      case 'minimalist': return <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1 mb-4">{title}</h2>;
      case 'professional': return <h2 className="text-xl font-bold text-slate-800 uppercase border-b-2 border-slate-800 pb-1 mb-4">{title}</h2>;
      case 'creative': return <div className="flex items-center mb-4"><div className="w-8 h-1 bg-teal-500 mr-3"></div><h2 className="text-xl font-bold text-slate-800 uppercase tracking-wider">{title}</h2></div>;
      case 'elegant': return <h2 className="text-lg font-serif text-slate-800 uppercase tracking-[0.15em] text-center border-b border-slate-200 pb-2 mb-4">{title}</h2>;
      case 'modern':
      default: return <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest border-b border-slate-300 pb-1 mb-4">{title}</h2>;
    }
  };

  const renderSection = (sectionId: string) => {
    switch(sectionId) {
      case 'summary':
        return summary ? (
          <div className="mb-6 break-inside-avoid print:break-inside-avoid" key="summary">
            {template === 'classic' && <SectionHeader title="Professional Summary" />}
            {template !== 'classic' && <SectionHeader title="Summary" />}
            <p className={`text-[15px] leading-relaxed 
              ${template === 'classic' ? 'font-serif text-slate-800' : ''}
              ${template === 'modern' ? 'text-slate-800' : ''}
              ${template === 'minimalist' ? 'text-slate-700' : ''}
              ${template === 'professional' ? 'text-slate-700 font-medium' : ''}
              ${template === 'creative' ? 'text-slate-700 border-l-4 border-teal-100 pl-4' : ''}
              ${template === 'elegant' ? 'font-serif text-slate-700 text-center px-8' : ''}
            `}>{summary}</p>
          </div>
        ) : null;
        
      case 'experience':
        return experience.length > 0 && experience.some(e => e.company || e.role) ? (
          <div className="mb-6" key="experience">
            <SectionHeader title="Experience" />
            <div className="space-y-4">
              {experience.map(exp => (
                <div key={exp.id} className={`break-inside-avoid print:break-inside-avoid ${template === 'minimalist' ? 'grid grid-cols-[1fr_3fr] gap-4' : ''} ${template === 'elegant' ? 'text-center mb-6' : ''}`}>
                  {template === 'minimalist' && (
                    <div className="text-sm font-semibold text-slate-600 mt-1">{exp.startDate} {exp.endDate ? `- ${exp.endDate}` : ''}</div>
                  )}
                  <div>
                    <div className={`flex justify-between items-baseline mb-1 ${template === 'minimalist' ? 'flex-col sm:flex-row' : ''} ${template === 'elegant' ? 'flex-col items-center justify-center' : ''}`}>
                      <h3 className={`text-[16px] font-bold text-slate-900 ${template === 'classic' ? 'font-serif' : ''} ${template === 'elegant' ? 'font-serif text-xl' : ''}`}>{exp.role}</h3>
                      {template !== 'minimalist' && (
                        <span className={`text-sm font-semibold text-slate-600 ${template === 'classic' ? 'font-serif font-normal' : ''} ${template === 'elegant' ? 'font-serif text-slate-500 mt-1' : ''}`}>{exp.startDate} {exp.endDate ? `- ${exp.endDate}` : ''}</span>
                      )}
                    </div>
                    <div className={`text-[15px] font-semibold mb-1.5 
                      ${template === 'classic' ? 'text-black font-serif italic' : ''}
                      ${template === 'minimalist' ? 'text-slate-700' : ''}
                      ${template === 'modern' ? 'text-indigo-700' : ''}
                      ${template === 'professional' ? 'text-slate-600 uppercase tracking-wide text-sm' : ''}
                      ${template === 'creative' ? 'text-teal-600' : ''}
                      ${template === 'elegant' ? 'text-slate-700 font-serif italic' : ''}
                    `}>{exp.company}</div>
                    {exp.description && (
                      <div className={`text-[14px] text-slate-800 leading-relaxed whitespace-pre-wrap 
                        ${template === 'classic' ? 'font-serif' : ''}
                        ${template === 'minimalist' ? '' : ''}
                        ${template === 'modern' ? 'pl-3 border-l-2 border-slate-200' : ''}
                        ${template === 'professional' ? '' : ''}
                        ${template === 'creative' ? 'pl-3 border-l-2 border-teal-100' : ''}
                        ${template === 'elegant' ? 'font-serif text-slate-600 mt-3 px-4' : ''}
                      `}>
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
            <SectionHeader title="Projects" />
            <div className={`space-y-4 ${template === 'creative' ? 'grid grid-cols-2 gap-4 space-y-0' : ''}`}>
              {projects.map(proj => (
                <div key={proj.id} className={`break-inside-avoid print:break-inside-avoid ${template === 'minimalist' ? 'grid grid-cols-[1fr_3fr] gap-4' : ''} ${template === 'elegant' ? 'text-center mb-6' : ''} ${template === 'creative' ? 'bg-slate-50 p-4 rounded-lg' : ''}`}>
                  {template === 'minimalist' && <div />}
                  <div>
                    <div className={`flex items-center gap-2 mb-1 ${template === 'elegant' ? 'justify-center flex-col' : ''}`}>
                      <h3 className={`text-[16px] font-bold text-slate-900 ${template === 'classic' || template === 'elegant' ? 'font-serif' : ''}`}>{proj.name}</h3>
                      {proj.link && <span className={`text-[13px] 
                        ${template === 'classic' ? 'text-slate-600 font-serif' : ''}
                        ${template === 'minimalist' ? 'text-slate-500' : ''}
                        ${template === 'modern' ? 'font-semibold text-indigo-600' : ''}
                        ${template === 'professional' ? 'text-slate-500' : ''}
                        ${template === 'creative' ? 'text-teal-500' : ''}
                        ${template === 'elegant' ? 'font-serif text-slate-400' : ''}
                      `}>({proj.link.replace(/^https?:\/\//, '')})</span>}
                    </div>
                    {proj.description && (
                      <div className={`text-[14px] text-slate-800 leading-relaxed whitespace-pre-wrap 
                        ${template === 'classic' ? 'font-serif' : ''}
                        ${template === 'modern' ? 'pl-3 border-l-2 border-slate-200' : ''}
                        ${template === 'creative' ? 'text-slate-600 text-sm mt-2' : ''}
                        ${template === 'elegant' ? 'font-serif text-slate-600 px-4' : ''}
                      `}>
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
            <SectionHeader title="Education" />
            <div className="space-y-3">
              {education.map(edu => (
                <div key={edu.id} className={`break-inside-avoid print:break-inside-avoid flex justify-between items-baseline 
                  ${template === 'minimalist' ? 'grid grid-cols-[1fr_3fr] gap-4' : ''}
                  ${template === 'elegant' ? 'flex-col items-center text-center mb-4' : ''}
                `}>
                  {template === 'minimalist' && (
                    <div className="text-sm font-semibold text-slate-600">{edu.year}</div>
                  )}
                  <div className={template === 'minimalist' || template === 'elegant' ? 'flex flex-col' : ''}>
                    <div className={`text-[15px] font-bold text-slate-900 ${template === 'classic' || template === 'elegant' ? 'font-serif' : ''}`}>{edu.institution}</div>
                    <div className={`text-[14px] font-medium text-slate-700 
                      ${template === 'classic' ? 'font-serif italic text-black' : ''}
                      ${template === 'elegant' ? 'font-serif text-slate-600' : ''}
                      ${template === 'professional' ? 'text-slate-500' : ''}
                    `}>{edu.degree}</div>
                  </div>
                  {template !== 'minimalist' && (
                    <div className={`text-sm font-semibold text-slate-600 
                      ${template === 'classic' ? 'font-serif font-normal text-black' : ''}
                      ${template === 'elegant' ? 'font-serif text-slate-400 mt-1' : ''}
                    `}>{edu.year}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case 'skills':
        return skills ? (
          <div className="mb-6 break-inside-avoid print:break-inside-avoid" key="skills">
            <SectionHeader title="Skills" />
            <div className={`text-[14px] text-slate-800 leading-relaxed 
              ${template === 'classic' ? 'font-serif' : 'font-medium'}
              ${template === 'elegant' ? 'text-center' : ''}
            `}>
              {(template === 'modern' || template === 'creative') ? (
                skills.split(',').map((skill, i) => (
                  <span key={i} className={`inline-block mr-2 mb-2 px-2.5 py-1 rounded-sm text-sm
                    ${template === 'creative' ? 'bg-teal-50 text-teal-700 border border-teal-100 rounded-full' : 'bg-slate-100'}
                  `}>{skill.trim()}</span>
                ))
              ) : template === 'professional' ? (
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {skills.split(',').map((skill, i) => (
                    <div key={i} className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mr-2"></div>
                      <span>{skill.trim()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={template === 'elegant' ? 'font-serif text-slate-600 leading-loose' : ''}>{skills}</p>
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
          <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Resume
          </Button>
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
                    <option value="professional">Professional</option>
                    <option value="creative">Creative</option>
                    <option value="elegant">Elegant</option>
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
          <div className="overflow-auto bg-slate-200 dark:bg-slate-900 flex justify-center items-start p-4 sm:p-8 print:p-0 print:bg-white print:block">
            
            {/* A4 Paper Container */}
            <div className={`bg-white text-black shrink-0 w-[210mm] min-h-[297mm] shadow-2xl print:shadow-none print:w-full print:min-h-0 print:max-w-none print:m-0 p-[20mm] ${template === 'classic' ? 'font-serif' : ''}`}>
              
              {/* Header section */}
              <div className={`
                ${template === 'classic' ? 'border-b-2 border-black pb-6 mb-6' : ''}
                ${template === 'modern' ? 'border-b-2 border-slate-800 pb-6 mb-6' : ''}
                ${template === 'minimalist' ? 'border-b border-slate-200 pb-6 mb-6' : ''}
                ${template === 'professional' ? 'bg-slate-900 text-white p-8 -mx-[20mm] -mt-[20mm] mb-8' : ''}
                ${template === 'creative' ? 'border-l-8 border-teal-500 pl-6 mb-8' : ''}
                ${template === 'elegant' ? 'text-center pb-8 mb-8 border-b border-slate-300 mt-4' : ''}
              `}>
                <h1 className={`
                  text-4xl tracking-tight uppercase mb-3 
                  ${(template === 'modern' || template === 'classic' || template === 'minimalist') ? 'text-center' : ''}
                  ${template === 'minimalist' ? 'font-light tracking-widest text-slate-900' : ''}
                  ${template === 'classic' ? 'font-serif font-black text-black' : ''}
                  ${template === 'modern' ? 'font-black text-slate-900' : ''}
                  ${template === 'professional' ? 'font-bold text-white tracking-wide' : ''}
                  ${template === 'creative' ? 'font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-600 normal-case text-5xl' : ''}
                  ${template === 'elegant' ? 'font-serif font-light tracking-[0.2em] text-slate-800 normal-case text-5xl' : ''}
                `}>{personalInfo.name || "YOUR NAME"}</h1>
                <div className={`flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium
                  ${(template === 'modern' || template === 'classic' || template === 'minimalist' || template === 'elegant') ? 'justify-center' : 'justify-start'}
                  ${template === 'classic' ? 'text-black font-serif' : ''}
                  ${template === 'modern' ? 'text-slate-700' : ''}
                  ${template === 'minimalist' ? 'text-slate-600' : ''}
                  ${template === 'professional' ? 'text-slate-300' : ''}
                  ${template === 'creative' ? 'text-slate-600' : ''}
                  ${template === 'elegant' ? 'text-slate-500 font-serif' : ''}
                `}>
                  {personalInfo.email && <div className="flex items-center gap-1.5">{template !== 'classic' && template !== 'elegant' && <Mail className="w-3.5 h-3.5" />} {personalInfo.email}</div>}
                  {personalInfo.phone && <div className="flex items-center gap-1.5">{template !== 'classic' && template !== 'elegant' && <Phone className="w-3.5 h-3.5" />} {personalInfo.phone}</div>}
                  {personalInfo.website && <div className="flex items-center gap-1.5">{template !== 'classic' && template !== 'elegant' && <Globe className="w-3.5 h-3.5" />} {personalInfo.website.replace(/^https?:\/\//, '')}</div>}
                  {personalInfo.linkedin && <div className="flex items-center gap-1.5">{template !== 'classic' && template !== 'elegant' && <Briefcase className="w-3.5 h-3.5" />} {personalInfo.linkedin.replace(/^https?:\/\//, '')}</div>}
                  {personalInfo.github && <div className="flex items-center gap-1.5">{template !== 'classic' && template !== 'elegant' && <Code2 className="w-3.5 h-3.5" />} {personalInfo.github.replace(/^https?:\/\//, '')}</div>}
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
              size: A4;
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
