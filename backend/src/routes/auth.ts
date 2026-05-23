import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../utils/jwt.js";
import { isAdminEmail } from "../utils/admin.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { Role } from "@prisma/client";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const role: Role = isAdminEmail(email) ? Role.ADMIN : Role.CANDIDATE;
    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name: body.name,
        passwordHash,
        role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return res.status(201).json({ user, token });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
    }
    console.error(e);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    let role = user.role;
    if (isAdminEmail(email) && role !== Role.ADMIN) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: Role.ADMIN },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });
      const token = signToken({ userId: updated.id, email: updated.email, role: updated.role });
      return res.json({ user: updated, token });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return res.json({ user: safeUser, token });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
    }
    console.error(e);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
});

export default router;
