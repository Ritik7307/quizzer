import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../utils/jwt.js";
import type { Role } from "@prisma/client";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

const lastActiveUpdates = new Map<string, number>();

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    
    // Asynchronously update last active
    import("../lib/prisma.js").then(({ prisma }) => {
      const now = Date.now();
      const lastUpdate = lastActiveUpdates.get(payload.userId) || 0;
      if (now - lastUpdate > 60000) {
        lastActiveUpdates.set(payload.userId, now);
        prisma.user.update({
          where: { id: payload.userId },
          data: { lastActiveAt: new Date() }
        }).catch(() => {});
      }
    }).catch(() => {});

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
