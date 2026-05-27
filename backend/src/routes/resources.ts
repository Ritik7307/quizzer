import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { sendEmail } from "../utils/email.js";

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

// Schema for uploading resources
const uploadResourceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  fileName: z.string().min(1, "Filename is required"),
  fileType: z.string().min(1, "Filetype is required"),
  fileSize: z.number().int().positive("Filesize is required"),
  fileData: z.string().min(1, "File data is required"), // base64 string
});

// GET /api/resources - Get all resources (accessible by both Candidates and Admins)
router.get("/", authenticate, async (_req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json({ resources });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch study resources" });
  }
});

// POST /api/resources/admin - Upload a resource (Admin only)
router.post("/admin", authenticate, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const { title, description, fileName, fileType, fileSize, fileData } = uploadResourceSchema.parse(req.body);

    // Create uploads folder if not exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // Generate unique name for the file to prevent overwrite collisions
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);

    // Write file from base64 data
    const buffer = Buffer.from(fileData, "base64");
    fs.writeFileSync(filePath, buffer);

    // Retrieve host to construct URL
    const host = req.get("host") || "localhost:5000";
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const fileUrl = `${protocol}://${host}/uploads/${uniqueFileName}`;

    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        fileName: uniqueFileName,
        fileUrl,
        fileType,
        fileSize,
        fileData,
      },
    });

    // Notify all candidates
    const candidates = await prisma.user.findMany({
      where: { role: Role.CANDIDATE },
      select: { id: true, email: true, name: true },
    });

    if (candidates.length > 0) {
      // 1. Create notifications in DB
      await prisma.notification.createMany({
        data: candidates.map((u) => ({
          userId: u.id,
          title: "New Study Resource",
          message: `A new study resource "${title}" has been uploaded by the admin.`,
        })),
      });

      // 2. Send email notifications asynchronously
      candidates.forEach((u) => {
        sendEmail({
          to: u.email,
          subject: `New Study Resource: ${title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #6366f1;">New Resource Available</h2>
              <p>Hi <strong>${u.name}</strong>,</p>
              <p>A new study resource has been uploaded by the administrator:</p>
              <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                <h3 style="margin-top: 0; color: #111827;">${title}</h3>
                ${description ? `<p style="color: #4b5563; margin-bottom: 8px;">${description}</p>` : ""}
                <p style="margin-bottom: 0; font-size: 13px; color: #9ca3af;">Type: ${fileType.toUpperCase()} | Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <p>You can view and download this resource directly from your candidate dashboard.</p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                This is an automated notification from Quizzer. Please log in to your dashboard to view all study resources.
              </p>
            </div>
          `,
        }).catch((err) => console.error(`Failed to send resource email to ${u.email}:`, err));
      });
    res.json({ message: "Resource uploaded successfully", resource });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload resource" });
  }
});

// GET all resources (for dashboard and admin)
router.get("/", authenticate, async (_req, res) => {
  try {
    const { prisma } = await import("../lib/prisma.js");
    // Don't select fileData when listing to avoid huge payload!
    const resources = await prisma.resource.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        createdAt: true,
      }
    });
    res.json({ resources });
  } catch (error) {
    console.error("Fetch resources error:", error);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

// DELETE a resource (Admin only)
router.delete("/admin/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { prisma } = await import("../lib/prisma.js");
    const id = String(req.params.id);
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) return res.status(404).json({ error: "Resource not found" });

    await prisma.resource.delete({ where: { id } });
    res.json({ message: "Resource deleted" });
  } catch (error) {
    console.error("Delete resource error:", error);
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

// GET (download) a resource
router.get("/:id/download", authenticate, async (req, res) => {
  try {
    const { prisma } = await import("../lib/prisma.js");
    const id = String(req.params.id);
    const resource = await prisma.resource.findUnique({ where: { id } });
    
    if (!resource) return res.status(404).json({ error: "Resource not found" });

    if (resource.fileData) {
      const buffer = Buffer.from(resource.fileData, "base64");
      
      let contentType = "application/octet-stream";
      const ext = resource.fileType.toLowerCase();
      if (ext === "pdf") contentType = "application/pdf";
      else if (ext === "png") contentType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
      
      res.setHeader("Content-Disposition", `inline; filename="${resource.fileName}"`);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", buffer.length);
      
      return res.end(buffer);
    }

    return res.status(404).json({ error: "File not found on server or remote storage" });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to download resource" });
  }
});

export default router;
