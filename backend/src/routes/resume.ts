import { Router } from "express";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/resume
// Fetch the authenticated user's resume
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const resume = await prisma.resume.findUnique({
      where: { userId },
      include: {
        experiences: true,
        educations: true,
        projects: true,
        skills: true,
      },
    });

    if (!resume) {
      return res.json(null);
    }

    res.json(resume);
  } catch (error) {
    console.error("Fetch resume error:", error);
    res.status(500).json({ error: "Failed to fetch resume" });
  }
});

// PUT /api/resume
// Upsert the resume and its relations
router.put("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { summary, phone, githubUrl, linkedinUrl, portfolioUrl, experiences = [], educations = [], projects = [], skills = [] } = req.body;

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert the main Resume record
      const resume = await tx.resume.upsert({
        where: { userId },
        update: {
          summary,
          phone,
          githubUrl,
          linkedinUrl,
          portfolioUrl,
        },
        create: {
          userId,
          summary,
          phone,
          githubUrl,
          linkedinUrl,
          portfolioUrl,
        },
      });

      const resumeId = resume.id;

      // 2. To handle nested relations simply, we delete existing and recreate
      // (For a production system with many edits, finding the diff is better, but this is robust for a resume builder)
      await tx.experience.deleteMany({ where: { resumeId } });
      await tx.education.deleteMany({ where: { resumeId } });
      await tx.project.deleteMany({ where: { resumeId } });
      await tx.skill.deleteMany({ where: { resumeId } });

      // 3. Create the new relations
      if (experiences.length > 0) {
        await tx.experience.createMany({
          data: experiences.map((exp: any) => ({
            resumeId,
            title: exp.title,
            company: exp.company,
            location: exp.location,
            startDate: new Date(exp.startDate),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            current: exp.current || false,
            description: exp.description,
          })),
        });
      }

      if (educations.length > 0) {
        await tx.education.createMany({
          data: educations.map((edu: any) => ({
            resumeId,
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field,
            startDate: new Date(edu.startDate),
            endDate: edu.endDate ? new Date(edu.endDate) : null,
            current: edu.current || false,
            score: edu.score,
          })),
        });
      }

      if (projects.length > 0) {
        await tx.project.createMany({
          data: projects.map((proj: any) => ({
            resumeId,
            title: proj.title,
            description: proj.description,
            link: proj.link,
            githubLink: proj.githubLink,
            technologies: proj.technologies,
          })),
        });
      }

      if (skills.length > 0) {
        await tx.skill.createMany({
          data: skills.map((skill: any) => ({
            resumeId,
            name: skill.name,
            category: skill.category,
          })),
        });
      }

      // 4. Return the full updated resume
      return tx.resume.findUnique({
        where: { id: resumeId },
        include: {
          experiences: true,
          educations: true,
          projects: true,
          skills: true,
        },
      });
    });

    res.json(result);
  } catch (error) {
    console.error("Update resume error:", error);
    res.status(500).json({ error: "Failed to update resume" });
  }
});

export default router;
