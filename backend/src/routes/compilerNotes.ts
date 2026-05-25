import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";

const router = Router();

const compilerNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  code: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  note: z.string().min(1, "Note/Analysis is required"),
});

// Create a new compiler note
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, code, language, note } = compilerNoteSchema.parse(req.body);
    const compilerNote = await prisma.compilerNote.create({
      data: {
        userId: req.user!.userId,
        title,
        code: code || null,
        language: language || null,
        note: note.trim(),
      },
    });
    return res.status(201).json({ success: true, compilerNote });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid data" });
    }
    console.error(e);
    return res.status(500).json({ error: "Failed to save compiler note" });
  }
});

// Get all compiler notes for the user
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const notes = await prisma.compilerNote.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ notes });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch compiler notes" });
  }
});

// Update a compiler note
router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const noteId = String(req.params.id);
    const { title, code, language, note } = compilerNoteSchema.parse(req.body);

    const existing = await prisma.compilerNote.findFirst({
      where: { id: noteId, userId: req.user!.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Note not found or unauthorized" });
    }

    const updated = await prisma.compilerNote.update({
      where: { id: noteId },
      data: {
        title,
        code: code || null,
        language: language || null,
        note: note.trim(),
      },
    });
    return res.json({ success: true, compilerNote: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid data" });
    }
    console.error(e);
    return res.status(500).json({ error: "Failed to update compiler note" });
  }
});

// Delete a compiler note
router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const noteId = String(req.params.id);

    const existing = await prisma.compilerNote.findFirst({
      where: { id: noteId, userId: req.user!.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Note not found or unauthorized" });
    }

    await prisma.compilerNote.delete({
      where: { id: noteId },
    });
    return res.json({ success: true, message: "Compiler note deleted successfully" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to delete compiler note" });
  }
});

export default router;
